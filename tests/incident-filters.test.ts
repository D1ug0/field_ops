import { describe, expect, it } from "vitest";
import { type Actor } from "@/lib/domain";
import { incidentWhere } from "@/lib/queries/filters";

const actor: Actor = {
  id: "engineer-1",
  name: "Engineer",
  email: "engineer@fieldops.local",
  role: "FIELD_ENGINEER",
};

describe("incident date filter", () => {
  it.each([
    "2026-02-29",
    "2026-02-30",
    "2026-04-31",
    "1900-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-10-00",
    "2026-1-9",
    "2026-10-19T00:00:00Z",
    "invalid",
    "",
  ])(
    "ignores invalid calendar date %s without changing access scope",
    (date) => {
      expect(incidentWhere(actor, { date, engineer: "someone-else" })).toEqual({
        assignedToId: actor.id,
      });
    },
  );

  it.each([
    ["2024-02-29", "2024-02-28T21:00:00Z", "2024-02-29T21:00:00Z"],
    ["2000-02-29", "2000-02-28T21:00:00Z", "2000-02-29T21:00:00Z"],
    ["2026-12-31", "2026-12-30T21:00:00Z", "2026-12-31T21:00:00Z"],
    ["2026-01-01", "2025-12-31T21:00:00Z", "2026-01-01T21:00:00Z"],
  ])("uses the full Moscow day for %s", (date, start, end) => {
    expect(incidentWhere(actor, { date })).toEqual({
      assignedToId: actor.id,
      createdAt: { gte: new Date(start), lt: new Date(end) },
    });
  });
});
