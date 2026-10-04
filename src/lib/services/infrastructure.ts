import { db } from "../db";
import { DomainError, canWork, requireRole, type Actor } from "../domain";
import { deviceInput, locationInput, maintenanceInput } from "../validation";
import { event, writableIncident } from "./incidents";
export async function saveLocation(actor: Actor, input: unknown, id?: string) {
  requireRole(actor, ["ADMIN"]);
  const data = locationInput.parse(input);
  return id
    ? db.location.update({ where: { id }, data })
    : db.location.create({ data });
}
export async function saveDevice(actor: Actor, input: unknown, id?: string) {
  requireRole(actor, ["ADMIN"]);
  const data = deviceInput.parse(input);
  return db.$transaction(async (tx) => {
    if (
      !(await tx.location.findUnique({
        where: { id: data.locationId, active: true },
      }))
    )
      throw new DomainError("Объект не найден или отключён.");
    if (id) {
      const current = await tx.device.findUnique({
        where: { id },
        include: {
          _count: {
            select: { children: true, incidents: true, maintenance: true },
          },
        },
      });
      if (!current) throw new DomainError("Устройство не найдено.", 404);
      if (
        current.locationId !== data.locationId &&
        (current.parentId ||
          current._count.children ||
          current._count.incidents ||
          current._count.maintenance)
      )
        throw new DomainError(
          "Перенос устройства со связанными записями недоступен в MVP.",
        );
      return tx.device.update({ where: { id }, data });
    }
    return tx.device.create({ data });
  });
}
export async function addMaintenance(actor: Actor, input: unknown) {
  requireRole(actor, ["ADMIN", "SUPPORT_ENGINEER", "FIELD_ENGINEER"]);
  const data = maintenanceInput.parse(input);
  return db.$transaction(async (tx) => {
    const device = await tx.device.findUnique({ where: { id: data.deviceId } });
    if (!device) throw new DomainError("Оборудование не найдено.", 404);
    if (data.incidentId) {
      const incident = await writableIncident(tx, actor, data.incidentId);
      if (
        incident.deviceId !== data.deviceId ||
        !canWork(actor, incident.assignedToId)
      )
        throw new DomainError(
          "Инцидент не связан с этим оборудованием или недоступен.",
          403,
        );
      await event(
        tx,
        actor,
        incident.id,
        "MAINTENANCE",
        `Запись обслуживания: ${data.description}`,
      );
    } else if (actor.role === "FIELD_ENGINEER")
      throw new DomainError("Укажите назначенный вам инцидент.", 403);
    return tx.maintenanceRecord.create({
      data: { ...data, engineerId: actor.id },
    });
  });
}
