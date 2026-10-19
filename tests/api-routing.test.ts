import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  read: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ apiActor: mocks.actor }));
vi.mock("@/lib/db", () => ({
  db: {
    device: { findUnique: mocks.read, groupBy: mocks.read },
    diagnosticTemplate: { findMany: mocks.read },
    knowledgeArticle: { findMany: mocks.read },
    alert: { findMany: mocks.read },
  },
}));
vi.mock("@/lib/queries/incidents", () => ({
  getIncident: mocks.read,
  listIncidents: mocks.read,
  listIncidentPage: mocks.read,
}));
vi.mock("@/lib/queries/devices", () => ({
  listDevices: mocks.read,
  listDevicePage: mocks.read,
  listIncidentDeviceOptions: mocks.read,
}));
vi.mock("@/lib/queries/locations", () => ({ listLocations: mocks.read }));
vi.mock("@/lib/queries/users", () => ({ engineers: mocks.read }));
vi.mock("@/lib/queries/visits", () => ({ listVisits: mocks.read }));
vi.mock("@/lib/services/incidents", () => ({
  addComment: mocks.mutate,
  assignIncident: mocks.mutate,
  createIncident: mocks.mutate,
  transitionIncident: mocks.mutate,
  updatePriority: mocks.mutate,
}));
vi.mock("@/lib/services/visits", () => ({
  changeVisit: mocks.mutate,
  scheduleVisit: mocks.mutate,
}));
vi.mock("@/lib/services/diagnostics", () => ({
  completeDiagnostics: mocks.mutate,
  recordStep: mocks.mutate,
  startDiagnostics: mocks.mutate,
}));
vi.mock("@/lib/services/infrastructure", () => ({
  addMaintenance: mocks.mutate,
  saveDevice: mocks.mutate,
  saveLocation: mocks.mutate,
}));

import { GET, PATCH, POST } from "@/app/api/[...path]/route";

const handlers = { GET, PATCH, POST };
const actor = {
  id: "dispatcher-1",
  name: "Dispatcher",
  email: "dispatcher@fieldops.local",
  role: "DISPATCHER",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_URL", "http://localhost:3000");
  mocks.actor.mockResolvedValue(actor);
  mocks.read.mockResolvedValue([]);
  mocks.mutate.mockResolvedValue({ id: "record-1" });
});
afterEach(() => vi.unstubAllEnvs());

function request(method: keyof typeof handlers, route: string) {
  const path = route.split("/");
  return handlers[method](
    new NextRequest(`http://localhost:3000/api/${route}`, {
      method,
      ...(method === "GET"
        ? {}
        : {
            headers: {
              origin: "http://localhost:3000",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ body: "Demo input" }),
          }),
    }),
    { params: Promise.resolve({ path }) },
  );
}

describe("API route boundaries", () => {
  it.each([
    "incidents/record-1/unknown",
    "devices/record-1/unknown",
    "locations/record-1/unknown",
    "visits/record-1",
    "engineers/record-1",
    "diagnostic-templates/record-1",
    "knowledge/record-1",
    "alerts/record-1",
    "monitoring/record-1",
    "incidents/record-1/comments/extra",
  ])("rejects GET %s before reading records", async (route) => {
    const response = await request("GET", route);
    expect(response.status).toBe(404);
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it.each([
    "incidents/record-1/assign/extra",
    "incidents/record-1/comments/extra",
    "incidents/record-1/diagnostics/extra",
    "incidents/record-1/start/extra",
    "visits/record-1/arrive/extra",
    "diagnostics/record-1/complete/extra",
    "incidents/record-1/toString",
    "incidents/record-1/constructor",
    "incidents/record-1/__proto__",
    "visits/record-1/toString",
    "visits/record-1/constructor",
    "visits/record-1/__proto__",
  ])("rejects POST %s without modifying records", async (route) => {
    const response = await request("POST", route);
    expect(response.status).toBe(404);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it.each([
    "locations",
    "devices",
    "incidents",
    "visits",
    "engineers",
    "diagnostic-templates",
    "knowledge",
    "alerts",
    "monitoring",
    "locations/record-1/devices",
    "locations/record-1/device-options",
  ])("preserves GET %s", async (route) => {
    const response = await request("GET", route);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(mocks.read).toHaveBeenCalledOnce();
  });

  it.each([
    "locations",
    "devices",
    "incidents",
    "visits",
    "maintenance",
    "incidents/record-1/assign",
    "incidents/record-1/comments",
    "incidents/record-1/diagnostics",
    "incidents/record-1/start",
    "visits/record-1/arrive",
    "diagnostics/record-1/complete",
  ])("preserves POST %s", async (route) => {
    const response = await request("POST", route);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "record-1" });
    expect(mocks.mutate).toHaveBeenCalledOnce();
  });

  it.each([
    "locations/record-1",
    "devices/record-1",
    "incidents/record-1",
    "diagnostics/record-1/steps/step-1",
  ])("preserves PATCH %s", async (route) => {
    expect((await request("PATCH", route)).status).toBe(200);
    expect(mocks.mutate).toHaveBeenCalledOnce();
  });

  it("requires authentication before dispatching a mutation", async () => {
    mocks.actor.mockRejectedValue(new DomainError("Требуется вход.", 401));
    expect((await request("POST", "incidents")).status).toBe(401);
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
});
