import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { Actor } from "@/lib/domain";
import {
  createIncident,
  assignIncident,
  transitionIncident,
  updatePriority,
} from "@/lib/services/incidents";
import { scheduleVisit, changeVisit } from "@/lib/services/visits";
import {
  startDiagnostics,
  recordStep,
  completeDiagnostics,
} from "@/lib/services/diagnostics";
import { saveDevice, saveLocation } from "@/lib/services/infrastructure";
import { listIncidents } from "@/lib/queries/incidents";

const prefix = `test-${randomUUID().slice(0, 16)}`;
const admin: Actor = {
  id: `${prefix}-admin`,
  name: "Test admin",
  email: `${prefix}-admin@fieldops.local`,
  role: "ADMIN",
};
const dispatcher: Actor = {
  ...admin,
  id: `${prefix}-dispatcher`,
  email: `${prefix}-dispatcher@fieldops.local`,
  role: "DISPATCHER",
};
const engineer: Actor = {
  ...admin,
  id: `${prefix}-engineer`,
  email: `${prefix}-engineer@fieldops.local`,
  role: "FIELD_ENGINEER",
};
const other: Actor = {
  ...admin,
  id: `${prefix}-other`,
  email: `${prefix}-other@fieldops.local`,
  role: "FIELD_ENGINEER",
};
const viewer: Actor = {
  ...admin,
  id: `${prefix}-viewer`,
  email: `${prefix}-viewer@fieldops.local`,
  role: "VIEWER",
};
let locationId: string;
let deviceId: string;
let incidentId: string;
let visitId: string;
let sessionId: string;
const templateId = `${prefix}-template`;
beforeAll(async () => {
  const url = new URL(
    process.env.DATABASE_URL ?? "postgresql://localhost/invalid",
  );
  if (!url.pathname.endsWith("_test"))
    throw new Error(
      "Integration tests require an isolated database name ending in _test.",
    );
  for (const actor of [admin, dispatcher, engineer, other, viewer])
    await db.user.create({
      data: { ...actor, passwordHash: "not-a-login-account" },
    });
  const location = await saveLocation(admin, {
    code: prefix,
    name: "Integration demo",
    type: "STORE",
    address: "Fictional district",
    city: "Demo",
    latitude: 52.37,
    longitude: 4.9,
  });
  locationId = location.id;
  const device = await saveDevice(admin, {
    assetTag: prefix,
    name: "Integration scale",
    category: "SCALE",
    vendor: "Generic",
    model: "Demo",
    serialNumber: prefix,
    locationId,
    ipAddress: "10.99.20.10",
    status: "DEGRADED",
  });
  deviceId = device.id;
  await db.diagnosticTemplate.create({
    data: {
      id: templateId,
      name: "Test checklist",
      category: "SCALE",
      description: "Test",
      steps: {
        create: [
          { id: `${prefix}-step-1`, order: 0, title: "Network", hint: "Demo" },
          { id: `${prefix}-step-2`, order: 1, title: "PLU", hint: "Demo" },
        ],
      },
    },
  });
});
afterAll(async () => {
  if (
    !process.env.DATABASE_URL ||
    !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
  )
    return;
  await db.diagnosticStepResult.deleteMany({
    where: { session: { engineerId: { startsWith: prefix } } },
  });
  await db.diagnosticSession.deleteMany({
    where: { engineerId: { startsWith: prefix } },
  });
  await db.diagnosticStep.deleteMany({ where: { templateId } });
  await db.diagnosticTemplate.deleteMany({ where: { id: templateId } });
  await db.maintenanceRecord.deleteMany({
    where: { engineerId: { startsWith: prefix } },
  });
  await db.serviceVisit.deleteMany({
    where: { engineerId: { startsWith: prefix } },
  });
  await db.incidentComment.deleteMany({
    where: { authorId: { startsWith: prefix } },
  });
  await db.incidentEvent.deleteMany({
    where: { actorId: { startsWith: prefix } },
  });
  await db.incident.deleteMany({
    where: { createdById: { startsWith: prefix } },
  });
  await db.device.deleteMany({ where: { assetTag: prefix } });
  await db.location.deleteMany({ where: { code: prefix } });
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.$disconnect();
});
describe.sequential("PostgreSQL engineer workflow", () => {
  it("blocks a viewer from creating an incident", async () => {
    await expect(createIncident(viewer, {})).rejects.toMatchObject({
      status: 403,
    });
  });
  it("creates an incident with an audit event", async () => {
    const incident = await createIncident(dispatcher, {
      title: "PLU updates failing",
      description: "Local demo scale not receiving product data",
      priority: "P3_MEDIUM",
      locationId,
      deviceId,
    });
    incidentId = incident.id;
    expect(incident.status).toBe("NEW");
    expect(await db.incidentEvent.count({ where: { incidentId } })).toBe(1);
  });
  it("rejects devices at another location without creating data", async () => {
    const second = await db.location.create({
      data: {
        code: `${prefix}-other`,
        name: "Other",
        type: "STORE",
        address: "Demo",
        city: "Demo",
        latitude: 1,
        longitude: 1,
      },
    });
    try {
      await expect(
        createIncident(dispatcher, {
          title: "Invalid device link",
          description: "This device belongs to another store",
          priority: "P3_MEDIUM",
          locationId: second.id,
          deviceId,
        }),
      ).rejects.toMatchObject({ status: 400 });
    } finally {
      await db.location.delete({ where: { id: second.id } });
    }
  });
  it("blocks unauthorized assignment and priority change", async () => {
    await expect(
      assignIncident(engineer, incidentId, { assignedToId: other.id }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      updatePriority(viewer, incidentId, { priority: "P1_CRITICAL" }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("assigns an engineer and preserves scope under hostile filters", async () => {
    await assignIncident(dispatcher, incidentId, { assignedToId: engineer.id });
    expect((await listIncidents(other, { engineer: engineer.id })).length).toBe(
      0,
    );
    expect((await listIncidents(engineer, { engineer: other.id }))[0].id).toBe(
      incidentId,
    );
  });
  it("allows only one active visit per incident", async () => {
    const visit = await scheduleVisit(dispatcher, {
      incidentId,
      engineerId: engineer.id,
      scheduledAt: new Date().toISOString(),
    });
    visitId = visit.id;
    await expect(
      scheduleVisit(dispatcher, {
        incidentId,
        engineerId: engineer.id,
        scheduledAt: new Date().toISOString(),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("requires travel before arrival and restricts foreign engineers", async () => {
    await expect(
      changeVisit(engineer, visitId, "ON_SITE", {}),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      changeVisit(other, visitId, "TRAVELING", {}),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("updates incident and visit together on travel and arrival", async () => {
    await changeVisit(engineer, visitId, "TRAVELING", {});
    expect(
      (await db.incident.findUniqueOrThrow({ where: { id: incidentId } }))
        .status,
    ).toBe("IN_PROGRESS");
    await changeVisit(engineer, visitId, "ON_SITE", {});
    expect(
      (await db.incident.findUniqueOrThrow({ where: { id: incidentId } }))
        .status,
    ).toBe("ON_SITE");
  });
  it("starts diagnostics and requires all step results", async () => {
    const session = await startDiagnostics(engineer, incidentId, {
      templateId,
    });
    sessionId = session.id;
    await expect(
      completeDiagnostics(engineer, sessionId, {
        summary: "Diagnosed successfully",
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      recordStep(engineer, sessionId, "unrelated-step", { status: "PASS" }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("records results, completes diagnostics and makes them immutable", async () => {
    await recordStep(engineer, sessionId, `${prefix}-step-1`, {
      status: "PASS",
      value: "10.99.20.10",
    });
    await recordStep(engineer, sessionId, `${prefix}-step-2`, {
      status: "FAIL",
      comment: "Local identifier mismatch",
    });
    await completeDiagnostics(engineer, sessionId, {
      summary: "Device identifier mismatch confirmed",
    });
    await expect(
      recordStep(engineer, sessionId, `${prefix}-step-2`, { status: "PASS" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("rolls back invalid resolution without events or maintenance", async () => {
    const before = await db.incidentEvent.count({ where: { incidentId } });
    await expect(
      transitionIncident(engineer, incidentId, "RESOLVED", {
        rootCause: "CONFIGURATION",
        resolution: "ok",
      }),
    ).rejects.toThrow();
    expect(
      (await db.incident.findUniqueOrThrow({ where: { id: incidentId } }))
        .status,
    ).toBe("ON_SITE");
    expect(await db.incidentEvent.count({ where: { incidentId } })).toBe(
      before,
    );
    expect(await db.maintenanceRecord.count({ where: { incidentId } })).toBe(0);
  });
  it("atomically resolves the incident, completes the visit and records repair", async () => {
    await transitionIncident(engineer, incidentId, "RESOLVED", {
      rootCause: "CONFIGURATION",
      resolution: "Identifier corrected, PLU test completed successfully",
    });
    expect(
      (await db.incident.findUniqueOrThrow({ where: { id: incidentId } }))
        .status,
    ).toBe("RESOLVED");
    expect(
      (await db.serviceVisit.findUniqueOrThrow({ where: { id: visitId } }))
        .status,
    ).toBe("COMPLETED");
    expect(
      await db.maintenanceRecord.count({ where: { incidentId, deviceId } }),
    ).toBe(1);
  });
  it("allows closure only for management/support and blocks reopening", async () => {
    await expect(
      transitionIncident(engineer, incidentId, "CLOSED", {}),
    ).rejects.toMatchObject({ status: 403 });
    await transitionIncident(dispatcher, incidentId, "CLOSED", {});
    await expect(
      transitionIncident(engineer, incidentId, "IN_PROGRESS", {}),
    ).rejects.toMatchObject({ status: 409 });
  });
});
