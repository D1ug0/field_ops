import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { paginationFor, type PageResult } from "@/lib/pagination";
import type { FilterInput } from "./filters";

export function queryPage<T>(
  input: FilterInput,
  count: (tx: Prisma.TransactionClient) => Promise<number>,
  find: (
    tx: Prisma.TransactionClient,
    window: { skip: number; take: number },
  ) => Promise<T[]>,
): Promise<PageResult<T>> {
  return db.$transaction(
    async (tx) => {
      const pagination = paginationFor(await count(tx), input);
      const items = await find(tx, {
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      });
      return { items, pagination };
    },
    // Count and rows must see the same snapshot during concurrent changes.
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
