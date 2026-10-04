import { db } from "./db";
import {
  activeStatuses,
  assertIncidentAccess,
  categories,
  deviceStatuses,
  priorities,
  statuses,
  type Actor,
} from "./domain";
import { Prisma } from "@/generated/prisma/client";
export type Filters = Record<string, string | undefined>;
export function normalizeFilters(input: Record<string, unknown>): Filters {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === "string"
        ? value.slice(0, 200)
        : Array.isArray(value) && typeof value[0] === "string"
          ? value[0].slice(0, 200)
          : undefined,
    ]),
  );
}
export function scope(actor: Actor): Prisma.IncidentWhereInput {
  return actor.role === "FIELD_ENGINEER" ? { assignedToId: actor.id } : {};
}
export const incidentInclude = {
  location: true,
  device: true,
  assignedTo: { select: { id: true, name: true, role: true } },
} satisfies Prisma.IncidentInclude;
export function incidentWhere(
  actor: Actor,
  input: Filters = {},
): Prisma.IncidentWhereInput {
  const f = normalizeFilters(input);
  const sequence = Number(f.q?.replace(/^INC-/i, ""));
  return {
    ...scope(actor),
    ...(f.status && Object.hasOwn(statuses, f.status)
      ? { status: f.status as keyof typeof statuses }
      : f.status === "active"
        ? { status: { in: activeStatuses } }
        : {}),
    ...(f.priority && Object.hasOwn(priorities, f.priority)
      ? { priority: f.priority as keyof typeof priorities }
      : {}),
    ...(f.location ? { locationId: f.location } : {}),
    ...(f.engineer && actor.role !== "FIELD_ENGINEER"
      ? { assignedToId: f.engineer }
      : {}),
    ...(f.category && Object.hasOwn(categories, f.category)
      ? { device: { category: f.category as keyof typeof categories } }
      : {}),
    ...(f.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(f.date) &&
    !Number.isNaN(Date.parse(f.date))
      ? {
          createdAt: {
            gte: new Date(`${f.date}T00:00:00+03:00`),
            lt: new Date(
              new Date(`${f.date}T00:00:00+03:00`).getTime() + 86400000,
            ),
          },
        }
      : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" } },
            { location: { name: { contains: f.q, mode: "insensitive" } } },
            ...(Number.isInteger(sequence) &&
            sequence > 0 &&
            sequence < 2147483647
              ? [{ sequence }]
              : []),
          ],
        }
      : {}),
  };
}
export async function listIncidents(actor: Actor, filters: Filters = {}) {
  return db.incident.findMany({
    where: incidentWhere(actor, filters),
    include: incidentInclude,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
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
export async function listLocations(actor: Actor) {
  return db.location.findMany({
    include: {
      _count: {
        select: {
          devices: true,
          incidents: {
            where: { ...scope(actor), status: { in: activeStatuses } },
          },
        },
      },
      incidents: {
        where: {
          ...scope(actor),
          status: { in: activeStatuses },
          priority: "P1_CRITICAL",
        },
        select: { id: true },
      },
    },
    orderBy: { code: "asc" },
  });
}
export async function listDevices(input: Filters = {}) {
  const filters = normalizeFilters(input);
  return db.device.findMany({
    where: {
      ...(filters.location ? { locationId: filters.location } : {}),
      ...(filters.category && Object.hasOwn(categories, filters.category)
        ? { category: filters.category as keyof typeof categories }
        : {}),
      ...(filters.status && Object.hasOwn(deviceStatuses, filters.status)
        ? { status: filters.status as keyof typeof deviceStatuses }
        : {}),
      ...(filters.vendor ? { vendor: filters.vendor } : {}),
      ...(filters.q
        ? {
            OR: [
              "name",
              "assetTag",
              "ipAddress",
              "serialNumber",
              "hostname",
            ].map((key) => ({
              [key]: { contains: filters.q, mode: "insensitive" },
            })),
          }
        : {}),
    },
    include: { location: true },
    orderBy: { assetTag: "asc" },
    take: 500,
  });
}
export async function engineers() {
  return db.user.findMany({
    where: {
      active: true,
      role: { in: ["FIELD_ENGINEER", "SUPPORT_ENGINEER"] },
    },
    select: { id: true, name: true, role: true },
  });
}
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
