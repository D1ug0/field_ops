import { db } from "../db";
import {
  DomainError,
  assertIncidentAccess,
  assertTransition,
  canWork,
  requireRole,
  statuses,
  terminalStatuses,
  type Actor,
} from "../domain";
import { incidentInput, note, resolveInput, text } from "../validation";
import { z } from "zod";
import type { IncidentStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export async function writableIncident(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
) {
  const incident = await tx.incident.findUnique({ where: { id } });
  if (!incident) throw new DomainError("Инцидент не найден.", 404);
  assertIncidentAccess(actor, incident.assignedToId);
  return incident;
}
export function event(
  tx: Prisma.TransactionClient,
  actor: Actor,
  incidentId: string,
  type: string,
  message: string,
) {
  return tx.incidentEvent.create({
    data: { actorId: actor.id, incidentId, type, message },
  });
}
export async function createIncident(actor: Actor, input: unknown) {
  requireRole(actor, ["ADMIN", "DISPATCHER", "SUPPORT_ENGINEER"]);
  const data = incidentInput.parse(input);
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: data.locationId },
    });
    if (!location?.active)
      throw new DomainError("Выберите действующий объект.");
    const device = data.deviceId
      ? await tx.device.findUnique({ where: { id: data.deviceId } })
      : null;
    if (
      data.deviceId &&
      (!device ||
        device.locationId !== data.locationId ||
        device.status === "RETIRED")
    )
      throw new DomainError(
        "Устройство должно принадлежать выбранному объекту и быть действующим.",
      );
    const incident = await tx.incident.create({
      data: {
        ...data,
        category: device?.category ?? "OTHER",
        createdById: actor.id,
      },
    });
    await event(tx, actor, incident.id, "CREATED", "Инцидент зарегистрирован");
    return incident;
  });
}
export async function assignIncident(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ["ADMIN", "DISPATCHER"]);
  const assignedToId = text.parse(
    (input as { assignedToId?: unknown })?.assignedToId,
  );
  return db.$transaction(async (tx) => {
    const incident = await writableIncident(tx, actor, id);
    if (
      terminalStatuses.includes(incident.status) ||
      ["IN_PROGRESS", "ON_SITE", "WAITING"].includes(incident.status)
    )
      throw new DomainError(
        "Назначение доступно до начала работ или после эскалации.",
        409,
      );
    const engineer = await tx.user.findUnique({ where: { id: assignedToId } });
    if (
      !engineer?.active ||
      !["FIELD_ENGINEER", "SUPPORT_ENGINEER"].includes(engineer.role)
    )
      throw new DomainError("Выберите действующего инженера.");
    const changed = await tx.incident.updateMany({
      where: { id, updatedAt: incident.updatedAt },
      data: { assignedToId, assignedAt: new Date(), status: "ASSIGNED" },
    });
    if (!changed.count)
      throw new DomainError(
        "Инцидент изменён другим пользователем. Обновите страницу.",
        409,
      );
    if (incident.assignedToId !== assignedToId)
      await tx.serviceVisit.updateMany({
        where: {
          incidentId: id,
          status: { in: ["PLANNED", "TRAVELING", "ON_SITE"] },
        },
        data: { status: "CANCELLED" },
      });
    await event(
      tx,
      actor,
      id,
      "ASSIGNED",
      `Назначен инженер: ${engineer.name}`,
    );
    return { id };
  });
}
export async function transitionIncident(
  actor: Actor,
  id: string,
  status: IncidentStatus,
  input: unknown,
) {
  return db.$transaction(async (tx) => {
    const incident = await writableIncident(tx, actor, id);
    if (["TRIAGE", "CANCELLED", "CLOSED"].includes(status))
      requireRole(actor, ["ADMIN", "DISPATCHER", "SUPPORT_ENGINEER"]);
    else if (!canWork(actor, incident.assignedToId))
      throw new DomainError(
        "Работы доступны назначенному инженеру и поддержке.",
        403,
      );
    assertTransition(incident.status, status);
    if (
      status === "ON_SITE" &&
      (await tx.serviceVisit.count({
        where: { incidentId: id, status: { in: ["PLANNED", "TRAVELING"] } },
      }))
    )
      throw new DomainError(
        "Отметьте прибытие через карточку запланированного выезда.",
        409,
      );
    if (["IN_PROGRESS", "ON_SITE"].includes(status) && !incident.assignedToId)
      throw new DomainError("Сначала назначьте инженера.");
    let data: Prisma.IncidentUpdateManyMutationInput = { status };
    if (status === "IN_PROGRESS" && !incident.startedAt)
      data.startedAt = new Date();
    if (status === "RESOLVED")
      data = { ...data, ...resolveInput.parse(input), resolvedAt: new Date() };
    if (status === "CLOSED") data.closedAt = new Date();
    const reason = ["WAITING", "ESCALATED", "CANCELLED"].includes(status)
      ? note.parse((input as { reason?: unknown })?.reason)
      : "";
    const changed = await tx.incident.updateMany({
      where: { id, updatedAt: incident.updatedAt },
      data,
    });
    if (!changed.count)
      throw new DomainError(
        "Инцидент изменён другим пользователем. Обновите страницу.",
        409,
      );
    await event(
      tx,
      actor,
      id,
      status,
      `${statuses[status]}${reason ? `: ${reason}` : ""}`,
    );
    if (status === "RESOLVED") {
      const resolved = resolveInput.parse(input);
      if (incident.deviceId)
        await tx.maintenanceRecord.create({
          data: {
            deviceId: incident.deviceId,
            incidentId: id,
            engineerId: actor.id,
            type: "REPAIR",
            description: `Решение инцидента: ${incident.title}`,
            result: resolved.resolution,
          },
        });
      await tx.serviceVisit.updateMany({
        where: { incidentId: id, status: "ON_SITE" },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          workPerformed: resolved.resolution,
          result: "Инцидент решён",
        },
      });
      await tx.serviceVisit.updateMany({
        where: { incidentId: id, status: { in: ["PLANNED", "TRAVELING"] } },
        data: { status: "CANCELLED", result: "Инцидент решён до прибытия" },
      });
    }
    if (["CANCELLED", "ESCALATED"].includes(status))
      await tx.serviceVisit.updateMany({
        where: {
          incidentId: id,
          status: { in: ["PLANNED", "TRAVELING", "ON_SITE"] },
        },
        data: { status: "CANCELLED", result: reason },
      });
    return { id };
  });
}
export async function updatePriority(actor: Actor, id: string, input: unknown) {
  requireRole(actor, ["ADMIN", "DISPATCHER"]);
  const { priority } = z
    .object({ priority: incidentInput.shape.priority })
    .parse(input);
  return db.$transaction(async (tx) => {
    const incident = await writableIncident(tx, actor, id);
    if (terminalStatuses.includes(incident.status))
      throw new DomainError("Инцидент завершён.", 409);
    const changed = await tx.incident.updateMany({
      where: { id, updatedAt: incident.updatedAt },
      data: { priority },
    });
    if (!changed.count)
      throw new DomainError("Инцидент изменился. Обновите страницу.", 409);
    await event(
      tx,
      actor,
      id,
      "PRIORITY_CHANGED",
      `Приоритет изменён: ${incident.priority} → ${priority}`,
    );
    return { id };
  });
}
export async function addComment(actor: Actor, id: string, input: unknown) {
  requireRole(actor, [
    "ADMIN",
    "DISPATCHER",
    "SUPPORT_ENGINEER",
    "FIELD_ENGINEER",
  ]);
  const body = note.parse((input as { body?: unknown })?.body);
  return db.$transaction(async (tx) => {
    await writableIncident(tx, actor, id);
    return tx.incidentComment.create({
      data: { incidentId: id, authorId: actor.id, body },
    });
  });
}
