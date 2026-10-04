import { db } from "../db";
import {
  DomainError,
  assertVisitTransition,
  requireRole,
  terminalStatuses,
  type Actor,
  type visitStatuses,
} from "../domain";
import { visitInput, note } from "../validation";
import { event, writableIncident } from "./incidents";
export async function scheduleVisit(actor: Actor, input: unknown) {
  requireRole(actor, ["ADMIN", "DISPATCHER"]);
  const data = visitInput.parse(input);
  return db.$transaction(
    async (tx) => {
      const incident = await writableIncident(tx, actor, data.incidentId);
      if (
        terminalStatuses.includes(incident.status) ||
        incident.status === "ESCALATED"
      )
        throw new DomainError(
          "Выезд недоступен для завершённого или эскалированного инцидента.",
          409,
        );
      if (incident.assignedToId !== data.engineerId)
        throw new DomainError("Сначала назначьте этого инженера на инцидент.");
      const engineer = await tx.user.findUnique({
        where: { id: data.engineerId },
      });
      if (!engineer?.active || engineer.role !== "FIELD_ENGINEER")
        throw new DomainError(
          "Выезд доступен только действующему выездному инженеру.",
        );
      if (
        await tx.serviceVisit.count({
          where: {
            incidentId: incident.id,
            status: { in: ["PLANNED", "TRAVELING", "ON_SITE"] },
          },
        })
      )
        throw new DomainError("У инцидента уже есть активный выезд.", 409);
      const visit = await tx.serviceVisit.create({
        data: {
          ...data,
          scheduledAt: new Date(data.scheduledAt),
          locationId: incident.locationId,
        },
      });
      await event(
        tx,
        actor,
        incident.id,
        "VISIT_PLANNED",
        "Выезд инженера запланирован",
      );
      return visit;
    },
    { isolationLevel: "Serializable" },
  );
}
export async function changeVisit(
  actor: Actor,
  id: string,
  status: keyof typeof visitStatuses,
  input: unknown,
) {
  return db.$transaction(async (tx) => {
    const visit = await tx.serviceVisit.findUnique({ where: { id } });
    if (!visit) throw new DomainError("Выезд не найден.", 404);
    if (!(
      actor.role === "ADMIN" ||
      (status === "CANCELLED" && actor.role === "DISPATCHER") ||
      (actor.role === "FIELD_ENGINEER" && actor.id === visit.engineerId)
    ))
      throw new DomainError(
        "Выезд доступен назначенному выездному инженеру.",
        403,
      );
    assertVisitTransition(visit.status, status);
    const incident = await writableIncident(tx, actor, visit.incidentId);
    if (
      status !== "CANCELLED" &&
      (terminalStatuses.includes(incident.status) ||
        incident.status === "ESCALATED" ||
        incident.assignedToId !== visit.engineerId)
    )
      throw new DomainError(
        "Статус или назначение инцидента изменились. Обновите страницу.",
        409,
      );
    if (
      status === "TRAVELING" &&
      !["ASSIGNED", "IN_PROGRESS"].includes(incident.status)
    )
      throw new DomainError(
        "Начать поездку можно для назначенного инцидента или инцидента в работе.",
        409,
      );
    if (status === "ON_SITE" && incident.status !== "IN_PROGRESS")
      throw new DomainError("Для прибытия инцидент должен быть в работе.", 409);
    const workPerformed =
      status === "COMPLETED"
        ? note.parse((input as { workPerformed?: unknown })?.workPerformed)
        : undefined;
    const result =
      status === "COMPLETED"
        ? note.parse((input as { result?: unknown })?.result)
        : undefined;
    const changed = await tx.serviceVisit.updateMany({
      where: { id, status: visit.status },
      data: {
        status,
        workPerformed,
        result,
        arrivedAt: status === "ON_SITE" ? new Date() : undefined,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    });
    if (!changed.count)
      throw new DomainError("Выезд уже изменён. Обновите страницу.", 409);
    if (status === "TRAVELING" || status === "ON_SITE") {
      const changedIncident = await tx.incident.updateMany({
        where: { id: incident.id, updatedAt: incident.updatedAt },
        data: {
          status: status === "ON_SITE" ? "ON_SITE" : "IN_PROGRESS",
          startedAt: incident.startedAt ?? new Date(),
        },
      });
      if (!changedIncident.count)
        throw new DomainError("Инцидент изменён. Обновите страницу.", 409);
    }
    await event(
      tx,
      actor,
      visit.incidentId,
      `VISIT_${status}`,
      status === "TRAVELING"
        ? "Инженер отправился на объект"
        : status === "ON_SITE"
          ? "Инженер прибыл на объект"
          : status === "COMPLETED"
            ? `Выезд завершён: ${result}`
            : "Выезд отменён",
    );
    if (status === "COMPLETED" && incident.deviceId)
      await tx.maintenanceRecord.create({
        data: {
          deviceId: incident.deviceId,
          incidentId: incident.id,
          engineerId: actor.id,
          type: "REPAIR",
          description: workPerformed!,
          result: result!,
        },
      });
    return { id };
  });
}
