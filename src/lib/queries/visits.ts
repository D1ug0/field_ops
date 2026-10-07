import { db } from "@/lib/db";
import type { Actor } from "@/lib/domain";
export function todayWindow() {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
  }).format(new Date());
  const start = new Date(`${day}T00:00:00+03:00`);
  return { gte: start, lt: new Date(start.getTime() + 86400000) };
}
export async function listVisits(actor: Actor, personal = false) {
  return db.serviceVisit.findMany({
    where:
      actor.role === "FIELD_ENGINEER" || personal
        ? { engineerId: actor.id }
        : {},
    include: {
      incident: true,
      location: true,
      engineer: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });
}
