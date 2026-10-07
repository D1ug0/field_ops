import type { Prisma } from "@/generated/prisma/client";
import {
  activeStatuses,
  categories,
  deviceStatuses,
  priorities,
  statuses,
  type Actor,
} from "@/lib/domain";

export type FilterInput = Record<string, unknown>;
export type Filters = Record<string, string | undefined>;
export type SearchParams = Record<string, string | string[] | undefined>;

export function normalizeFilters(input: FilterInput): Filters {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      const first = Array.isArray(value) ? value[0] : value;
      return [
        key,
        typeof first === "string" ? first.slice(0, 200).trim() : undefined,
      ];
    }),
  );
}

export function scope(actor: Actor): Prisma.IncidentWhereInput {
  return actor.role === "FIELD_ENGINEER" ? { assignedToId: actor.id } : {};
}

export function incidentWhere(
  actor: Actor,
  input: FilterInput = {},
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

export function deviceWhere(input: FilterInput = {}): Prisma.DeviceWhereInput {
  const f = normalizeFilters(input);
  return {
    ...(f.location ? { locationId: f.location } : {}),
    ...(f.category && Object.hasOwn(categories, f.category)
      ? { category: f.category as keyof typeof categories }
      : {}),
    ...(f.status && Object.hasOwn(deviceStatuses, f.status)
      ? { status: f.status as keyof typeof deviceStatuses }
      : {}),
    ...(f.vendor ? { vendor: f.vendor } : {}),
    ...(f.q
      ? {
          OR: ["name", "assetTag", "ipAddress", "serialNumber", "hostname"].map(
            (key) => ({
              [key]: { contains: f.q, mode: "insensitive" },
            }),
          ),
        }
      : {}),
  };
}
