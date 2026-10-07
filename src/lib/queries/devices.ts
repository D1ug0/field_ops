import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { deviceWhere, type FilterInput } from "./filters";
import { queryPage } from "./page";

const deviceInclude = { location: true } satisfies Prisma.DeviceInclude;
export type DeviceListItem = Prisma.DeviceGetPayload<{
  include: typeof deviceInclude;
}>;

export async function listDevices(input: FilterInput = {}, take = 500) {
  return db.device.findMany({
    where: deviceWhere(input),
    include: deviceInclude,
    orderBy: { assetTag: "asc" },
    take,
  });
}

export function listDevicePage(input: FilterInput = {}) {
  const where = deviceWhere(input);
  return queryPage(
    input,
    (tx) => tx.device.count({ where }),
    (tx, window) =>
      tx.device.findMany({
        where,
        include: deviceInclude,
        orderBy: { assetTag: "asc" },
        ...window,
      }),
  );
}

export async function deviceVendors() {
  return db.device.findMany({
    distinct: ["vendor"],
    select: { vendor: true },
    orderBy: { vendor: "asc" },
  });
}
