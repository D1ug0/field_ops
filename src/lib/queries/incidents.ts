import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertIncidentAccess, type Actor } from "@/lib/domain";
import { incidentWhere, type FilterInput } from "./filters";
import { queryPage } from "./page";
export const incidentInclude = {
  location: true,
  device: true,
  assignedTo: { select: { id: true, name: true, role: true } },
} satisfies Prisma.IncidentInclude;
export type IncidentListItem = Prisma.IncidentGetPayload<{
  include: typeof incidentInclude;
}>;
const incidentOrder = [
  { priority: "asc" },
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.IncidentOrderByWithRelationInput[];
export async function listIncidents(
  actor: Actor,
  filters: FilterInput = {},
  take = 200,
) {
  return db.incident.findMany({
    where: incidentWhere(actor, filters),
    include: incidentInclude,
    orderBy: incidentOrder,
    take,
  });
}

export function listIncidentPage(actor: Actor, input: FilterInput = {}) {
  const where = incidentWhere(actor, input);
  return queryPage(
    input,
    (tx) => tx.incident.count({ where }),
    (tx, window) =>
      tx.incident.findMany({
        where,
        include: incidentInclude,
        orderBy: incidentOrder,
        ...window,
      }),
  );
}

export async function activeIncidentCounts(actor: Actor) {
  const where = incidentWhere(actor, { status: "active" });
  const [total, critical, assigned] = await db.$transaction(
    [
      db.incident.count({ where }),
      db.incident.count({ where: { ...where, priority: "P1_CRITICAL" } }),
      db.incident.count({ where: { ...where, assignedToId: actor.id } }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  return { total, critical, assigned };
}
export async function getIncident(actor: Actor, id: string) {
  const incident = await db.incident.findUnique({
    where: { id },
    include: {
      ...incidentInclude,
      createdBy: { select: { name: true } },
      events: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      visits: {
        include: { engineer: { select: { name: true } } },
        orderBy: { scheduledAt: "asc" },
      },
      diagnostics: {
        include: {
          template: { include: { steps: { orderBy: { order: "asc" } } } },
          results: true,
          engineer: { select: { name: true } },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (incident) assertIncidentAccess(actor, incident.assignedToId);
  return incident;
}
