import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/domain";
import {
  activeIncidentCounts,
  listIncidentPage,
  listIncidents,
} from "@/lib/queries/incidents";
import { listDevicePage, listDevices } from "@/lib/queries/devices";

const prefix = `pagination-${randomUUID()}`;
const locationId = `${prefix}-location`;
const engineer: Actor = {
  id: `${prefix}-engineer`,
  name: "Pagination engineer",
  email: `${prefix}-engineer@fieldops.local`,
  role: "FIELD_ENGINEER",
};
const other: Actor = {
  ...engineer,
  id: `${prefix}-other`,
  email: `${prefix}-other@fieldops.local`,
};
const dispatcher: Actor = { ...engineer, role: "DISPATCHER" };

beforeAll(async () => {
  if (
    !process.env.DATABASE_URL ||
    !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
  ) {
    throw new Error(
      "Integration tests require an isolated database name ending in _test.",
    );
  }
  await db.user.createMany({
    data: [engineer, other].map((actor) => ({
      ...actor,
      passwordHash: "not-a-login-account",
    })),
  });
  await db.location.create({
    data: {
      id: locationId,
      code: prefix,
      name: "Pagination fixture",
      type: "STORE",
      address: "Fictional district",
      city: "Demo",
      latitude: 52.37,
      longitude: 4.9,
    },
  });
  await db.device.createMany({
    data: Array.from({ length: 505 }, (_, index) => ({
      id: `${prefix}-device-${String(index).padStart(3, "0")}`,
      assetTag: `${prefix}-${String(index).padStart(3, "0")}`,
      serialNumber: `${prefix}-${index}`,
      name: `Demo device ${index}`,
      locationId,
      category: "SCALE" as const,
      status: index < 30 ? ("OFFLINE" as const) : ("ONLINE" as const),
      vendor: "Generic",
      model: "Demo",
    })),
  });
  await db.incident.createMany({
    data: Array.from({ length: 210 }, (_, index) => ({
      id: `${prefix}-incident-${String(index).padStart(3, "0")}`,
      title: `Pagination incident ${index}`,
      description: "Pagination integration fixture",
      locationId,
      createdById: engineer.id,
      assignedToId: index < 205 ? engineer.id : other.id,
      priority: "P1_CRITICAL" as const,
      status: "ASSIGNED" as const,
      createdAt: new Date("2026-10-01T09:00:00Z"),
    })),
  });
});

afterAll(async () => {
  if (
    !process.env.DATABASE_URL ||
    !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
  )
    return;
  await db.incident.deleteMany({ where: { locationId } });
  await db.device.deleteMany({ where: { locationId } });
  await db.location.deleteMany({ where: { id: locationId } });
  await db.user.deleteMany({ where: { id: { in: [engineer.id, other.id] } } });
  await db.$disconnect();
});

describe("PostgreSQL paginated registries", () => {
  it("reads incidents past the old 200-row cutoff and scopes counts to the engineer", async () => {
    const result = await listIncidentPage(engineer, {
      location: locationId,
      engineer: other.id,
      page: "9",
    });
    expect(result.pagination).toEqual({
      page: 9,
      pageSize: 25,
      total: 205,
      totalPages: 9,
    });
    expect(result.items).toHaveLength(5);
    expect(
      result.items.every((incident) => incident.assignedToId === engineer.id),
    ).toBe(true);
  });

  it("keeps equally dated incidents in stable order across pages", async () => {
    const first = await listIncidentPage(engineer, {
      location: locationId,
      pageSize: "100",
    });
    const second = await listIncidentPage(engineer, {
      location: locationId,
      pageSize: "100",
      page: "2",
    });
    expect(first.items[0].id).toBe(`${prefix}-incident-204`);
    expect(second.items[0].id).toBe(`${prefix}-incident-104`);
    const ids = [...first.items, ...second.items].map(
      (incident) => incident.id,
    );
    expect(new Set(ids).size).toBe(200);
  });

  it("applies dispatcher filters to both the count and rows", async () => {
    const result = await listIncidentPage(dispatcher, {
      location: locationId,
      engineer: other.id,
    });
    expect(result.pagination.total).toBe(5);
    expect(
      result.items.every((incident) => incident.assignedToId === other.id),
    ).toBe(true);
  });

  it("counts every active assignment beyond the preview limit", async () => {
    expect(await activeIncidentCounts(engineer)).toEqual({
      total: 205,
      critical: 205,
      assigned: 205,
    });
  });

  it("reads devices beyond the old 500-row cutoff", async () => {
    const result = await listDevicePage({ location: locationId, page: "21" });
    expect(result.pagination).toEqual({
      page: 21,
      pageSize: 25,
      total: 505,
      totalPages: 21,
    });
    expect(result.items).toHaveLength(5);
    expect(result.items[0].id).toBe(`${prefix}-device-500`);
  });

  it("filters equipment before counting and slicing", async () => {
    const result = await listDevicePage({
      location: locationId,
      status: "OFFLINE",
      page: "2",
    });
    expect(result.pagination.total).toBe(30);
    expect(result.items).toHaveLength(5);
    expect(result.items.every((device) => device.status === "OFFLINE")).toBe(
      true,
    );
  });

  it("clamps stale pages and handles empty filtered results", async () => {
    const last = await listDevicePage({
      location: locationId,
      status: "OFFLINE",
      page: "999999",
    });
    expect(last.pagination.page).toBe(2);
    expect(last.items).toHaveLength(5);
    const empty = await listDevicePage({
      location: locationId,
      q: "missing fixture",
      page: "99",
    });
    expect(empty.pagination).toEqual({
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    });
    expect(empty.items).toEqual([]);
  });

  it("preserves the bounded array contract used by existing callers", async () => {
    expect(
      await listIncidents(engineer, { location: locationId }),
    ).toHaveLength(200);
    expect(await listDevices({ location: locationId })).toHaveLength(500);
  });
});
