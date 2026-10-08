import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/lib/domain";

const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  incidentList: vi.fn(),
  incidentPage: vi.fn(),
  deviceList: vi.fn(),
  devicePage: vi.fn(),
  deviceOptions: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ apiActor: mocks.actor }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/queries/incidents", () => ({
  getIncident: vi.fn(),
  listIncidents: mocks.incidentList,
  listIncidentPage: mocks.incidentPage,
}));
vi.mock("@/lib/queries/devices", () => ({
  listDevices: mocks.deviceList,
  listDevicePage: mocks.devicePage,
  listIncidentDeviceOptions: mocks.deviceOptions,
}));

import { GET } from "@/app/api/[...path]/route";

const actor = {
  id: "engineer-1",
  role: "FIELD_ENGINEER",
  name: "Engineer",
  email: "engineer@fieldops.local",
};
const page = {
  items: [{ id: "item-1" }],
  pagination: { page: 2, pageSize: 25, total: 40, totalPages: 2 },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.actor.mockResolvedValue(actor);
  mocks.incidentList.mockResolvedValue([{ id: "incident-1" }]);
  mocks.deviceList.mockResolvedValue([{ id: "device-1" }]);
  mocks.incidentPage.mockResolvedValue(page);
  mocks.devicePage.mockResolvedValue(page);
  mocks.deviceOptions.mockResolvedValue([
    { id: "device-1", name: "Demo scale", assetTag: "EQ-001", ipAddress: "" },
  ]);
});

describe("incident equipment options API", () => {
  it("returns lightweight options for the location in the path", async () => {
    const response = await request(
      ["locations", "location-1", "device-options"],
      "?location=location-2&page=99&status=RETIRED",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual([
      { id: "device-1", name: "Demo scale", assetTag: "EQ-001", ipAddress: "" },
    ]);
    expect(mocks.deviceOptions).toHaveBeenCalledWith("location-1");
    expect(mocks.deviceList).not.toHaveBeenCalled();
    expect(mocks.devicePage).not.toHaveBeenCalled();
  });

  it.each([
    [404, "Объект не найден."],
    [400, "Выберите действующий объект."],
  ])("preserves location errors (%s)", async (status, message) => {
    mocks.deviceOptions.mockRejectedValue(new DomainError(message, status));
    const response = await request([
      "locations",
      "location-1",
      "device-options",
    ]);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
  });

  it("requires authentication before loading equipment options", async () => {
    mocks.actor.mockRejectedValue(
      new DomainError("Требуется вход в систему.", 401),
    );
    const response = await request([
      "locations",
      "location-1",
      "device-options",
    ]);
    expect(response.status).toBe(401);
    expect(mocks.deviceOptions).not.toHaveBeenCalled();
  });
});

function request(path: string[], query = "") {
  return GET(
    new NextRequest(`http://localhost:3000/api/${path.join("/")}${query}`),
    {
      params: Promise.resolve({ path }),
    },
  );
}

describe("registry API compatibility", () => {
  it("keeps the incident array response without pagination parameters", async () => {
    const response = await request(["incidents"], "?status=active");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "incident-1" }]);
    expect(mocks.incidentPage).not.toHaveBeenCalled();
  });

  it("returns incident rows and metadata when a page is requested", async () => {
    const response = await request(["incidents"], "?page=2&status=active");
    expect(await response.json()).toEqual(page);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.incidentPage).toHaveBeenCalledWith(actor, {
      page: "2",
      status: "active",
    });
    expect(mocks.incidentList).not.toHaveBeenCalled();
  });

  it("keeps the equipment array response for existing callers", async () => {
    expect(await (await request(["devices"])).json()).toEqual([
      { id: "device-1" },
    ]);
    expect(mocks.devicePage).not.toHaveBeenCalled();
  });

  it("accepts pageSize without an explicit page", async () => {
    const response = await request(["devices"], "?pageSize=50&status=OFFLINE");
    expect(await response.json()).toEqual(page);
    expect(mocks.devicePage).toHaveBeenCalledWith({
      pageSize: "50",
      status: "OFFLINE",
    });
  });

  it("uses the location in the route even if the query tries to override it", async () => {
    const response = await request(
      ["locations", "location-1", "devices"],
      "?page=2&location=location-2",
    );
    expect(await response.json()).toEqual(page);
    expect(mocks.devicePage).toHaveBeenCalledWith({
      page: "2",
      location: "location-1",
    });
  });

  it("uses the first repeated filter consistently with server pages", async () => {
    await request(["incidents"], "?page=2&page=3&q=%20PLU%20");
    expect(mocks.incidentPage).toHaveBeenCalledWith(actor, {
      page: "2",
      q: "PLU",
    });
  });

  it("requires authentication before returning records or metadata", async () => {
    mocks.actor.mockRejectedValue(
      new DomainError("Требуется вход в систему.", 401),
    );
    const response = await request(["incidents"], "?page=2");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Требуется вход в систему.",
    });
    expect(mocks.incidentPage).not.toHaveBeenCalled();
  });
});
