import { describe, expect, it } from "vitest";
import { locationInput } from "@/lib/validation";

describe("location coordinates", () => {
  it.each([
    { value: "" },
    { value: "   " },
    { value: null },
    { value: undefined },
    { value: true },
    { value: false },
    { value: [] },
    { value: [12] },
    { value: {} },
    { value: "not a number" },
    { value: Infinity },
    { value: NaN },
  ])("rejects missing or invalid coordinate $value", ({ value }) => {
    expect(locationInput.shape.latitude.safeParse(value).success).toBe(false);
    expect(locationInput.shape.longitude.safeParse(value).success).toBe(false);
  });

  it.each([
    [0, 0],
    [52.37, 52.37],
    [-4.9, -4.9],
    ["0", 0],
    [" 52.37 ", 52.37],
    ["-4.9", -4.9],
  ])("accepts numeric coordinate %s as %s", (value, expected) => {
    expect(locationInput.shape.latitude.parse(value)).toBe(expected);
    expect(locationInput.shape.longitude.parse(value)).toBe(expected);
  });

  it("preserves the map coordinate bounds", () => {
    expect(locationInput.shape.latitude.parse(-85)).toBe(-85);
    expect(locationInput.shape.latitude.parse("85")).toBe(85);
    expect(locationInput.shape.longitude.parse(-180)).toBe(-180);
    expect(locationInput.shape.longitude.parse("180")).toBe(180);
    expect(locationInput.shape.latitude.safeParse(85.01).success).toBe(false);
    expect(locationInput.shape.latitude.safeParse(-85.01).success).toBe(false);
    expect(locationInput.shape.longitude.safeParse(180.01).success).toBe(false);
    expect(locationInput.shape.longitude.safeParse(-180.01).success).toBe(
      false,
    );
  });
});
