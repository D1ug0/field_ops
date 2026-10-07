import { describe, expect, it } from "vitest";
import { pageHref, paginationFor, parsePagination } from "@/lib/pagination";
import { deviceWhere, normalizeFilters } from "@/lib/queries/filters";

describe("pagination parameters", () => {
  it("defaults to the first page with a bounded page size", () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 25 });
  });

  it.each(["0", "-1", "1.5", "1e3", "Infinity", "text", "9007199254740992"])(
    "rejects invalid page %s",
    (page) => expect(parsePagination({ page }).page).toBe(1),
  );

  it.each(["0", "-25", "1000", "26", "1e2", "50.5"])(
    "does not let pageSize %s request unbounded rows",
    (pageSize) => expect(parsePagination({ pageSize }).pageSize).toBe(25),
  );

  it("uses the first repeated parameter and normalizes whitespace", () => {
    expect(
      parsePagination({ page: [" 2 ", "9"], pageSize: ["50", "100"] }),
    ).toEqual({
      page: 2,
      pageSize: 50,
    });
  });

  it("returns the last available page when a bookmark is out of range", () => {
    expect(paginationFor(51, { page: "999999", pageSize: "25" })).toEqual({
      page: 3,
      pageSize: 25,
      total: 51,
      totalPages: 3,
    });
  });

  it("keeps an empty result on page one", () => {
    expect(paginationFor(0, { page: "99" })).toEqual({
      page: 1,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    });
  });

  it("does not add an empty page after a full final page", () => {
    expect(paginationFor(100, { page: "2", pageSize: "50" }).totalPages).toBe(
      2,
    );
  });
});

describe("pagination links", () => {
  it("preserves filters and replaces page parameters without corrupting search text", () => {
    const href = pageHref(
      "/incidents",
      {
        q: "Весы & PLU?",
        status: "active",
        engineer: "engineer-1",
        page: "8",
        pageSize: "100",
        priority: "",
      },
      2,
      50,
    );
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/incidents");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "Весы & PLU?",
      status: "active",
      engineer: "engineer-1",
      page: "2",
      pageSize: "50",
    });
  });
});

describe("query filters", () => {
  it("bounds search length and ignores values that are not text", () => {
    const filters = normalizeFilters({
      q: "x".repeat(500),
      status: {},
      vendor: null,
    });
    expect(filters.q).toHaveLength(200);
    expect(filters.status).toBeUndefined();
    expect(filters.vendor).toBeUndefined();
  });

  it("shares equipment filters between listing and counting", () => {
    expect(
      deviceWhere({
        location: "loc",
        status: "OFFLINE",
        category: "SCALE",
        vendor: "Generic",
      }),
    ).toEqual({
      locationId: "loc",
      status: "OFFLINE",
      category: "SCALE",
      vendor: "Generic",
    });
  });

  it("ignores invalid and inherited enum names", () => {
    expect(
      deviceWhere({ status: "constructor", category: "__proto__" }),
    ).toEqual({});
  });

  it("searches network and inventory fields before pagination", () => {
    expect(deviceWhere({ q: " 10.1.20.24 " }).OR).toEqual([
      { name: { contains: "10.1.20.24", mode: "insensitive" } },
      { assetTag: { contains: "10.1.20.24", mode: "insensitive" } },
      { ipAddress: { contains: "10.1.20.24", mode: "insensitive" } },
      { serialNumber: { contains: "10.1.20.24", mode: "insensitive" } },
      { hostname: { contains: "10.1.20.24", mode: "insensitive" } },
    ]);
  });
});
