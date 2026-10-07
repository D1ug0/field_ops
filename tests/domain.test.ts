import { describe, expect, it } from "vitest";
import {
  assertIncidentAccess,
  assertTransition,
  assertVisitTransition,
  canWork,
  requireRole,
  type Actor,
} from "@/lib/domain";
import {
  deviceInput,
  incidentInput,
  locationInput,
  resolveInput,
  stepInput,
} from "@/lib/validation";
import { incidentWhere } from "@/lib/queries/filters";
import { incidentNumber } from "@/lib/utils";
const engineer: Actor = {
  id: "engineer-1",
  name: "Test",
  email: "test@fieldops.local",
  role: "FIELD_ENGINEER",
};
describe("incident workflow", () => {
  it.each([
    ["NEW", "TRIAGE"],
    ["TRIAGE", "ASSIGNED"],
    ["ASSIGNED", "IN_PROGRESS"],
    ["IN_PROGRESS", "ON_SITE"],
    ["ON_SITE", "RESOLVED"],
    ["RESOLVED", "CLOSED"],
    ["IN_PROGRESS", "ESCALATED"],
    ["WAITING", "IN_PROGRESS"],
  ] as const)("permits %s → %s", (from, to) =>
    expect(() => assertTransition(from, to)).not.toThrow(),
  );
  it.each([
    ["NEW", "RESOLVED"],
    ["CLOSED", "IN_PROGRESS"],
    ["CANCELLED", "ASSIGNED"],
    ["ASSIGNED", "CLOSED"],
    ["RESOLVED", "ON_SITE"],
  ] as const)("rejects %s → %s", (from, to) =>
    expect(() => assertTransition(from, to)).toThrow(),
  );
  it("requires root cause and a meaningful resolution", () => {
    expect(
      resolveInput.safeParse({ rootCause: "CABLING", resolution: "ok" })
        .success,
    ).toBe(false);
    expect(
      resolveInput.safeParse({
        rootCause: "CABLING",
        resolution: "Ethernet cable replaced and verified",
      }).success,
    ).toBe(true);
  });
  it("formats numbers without collisions from padding", () => {
    expect(incidentNumber(42)).toBe("INC-000042");
    expect(incidentNumber(1234567)).toBe("INC-1234567");
  });
});
describe("authorization", () => {
  it("blocks readonly mutations", () =>
    expect(() =>
      requireRole({ ...engineer, role: "VIEWER" }, ["ADMIN", "DISPATCHER"]),
    ).toThrow());
  it("allows field engineers only their incidents", () => {
    expect(canWork(engineer, engineer.id)).toBe(true);
    expect(canWork(engineer, "another-engineer")).toBe(false);
    expect(() => assertIncidentAccess(engineer, "another-engineer")).toThrow();
  });
  it("never lets a filter override the field engineer scope", () => {
    expect(
      incidentWhere(engineer, { engineer: "another-engineer", q: "INC-1" })
        .assignedToId,
    ).toBe(engineer.id);
  });
  it("allows dispatcher to filter assignments", () =>
    expect(
      incidentWhere(
        { ...engineer, role: "DISPATCHER" },
        { engineer: "another-engineer" },
      ).assignedToId,
    ).toBe("another-engineer"));
});
describe("visits", () => {
  it("enforces travel before arrival", () =>
    expect(() => assertVisitTransition("PLANNED", "ON_SITE")).toThrow());
  it("permits travel and arrival", () => {
    expect(() => assertVisitTransition("PLANNED", "TRAVELING")).not.toThrow();
    expect(() => assertVisitTransition("TRAVELING", "ON_SITE")).not.toThrow();
  });
  it("makes completion terminal", () =>
    expect(() => assertVisitTransition("COMPLETED", "ON_SITE")).toThrow());
});
describe("input validation", () => {
  it("rejects invalid coordinates", () =>
    expect(
      locationInput.safeParse({
        code: "TEST",
        name: "Test",
        type: "STORE",
        address: "Demo",
        city: "Demo",
        latitude: 120,
        longitude: 10,
      }).success,
    ).toBe(false));
  it("rejects arbitrary priority values", () =>
    expect(
      incidentInput.safeParse({
        title: "Demo incident",
        description: "Demo incident description",
        locationId: "loc",
        priority: "URGENT",
      }).success,
    ).toBe(false));
  it("accepts only IPv4 or empty inventory addresses", () =>
    expect(deviceInput.shape.ipAddress.safeParse("10.300.0.1").success).toBe(
      false,
    ));
  it("accepts explicit skipped diagnostic results", () =>
    expect(
      stepInput.parse({ status: "SKIPPED", comment: "Not enough evidence" })
        .status,
    ).toBe("SKIPPED"));
});
