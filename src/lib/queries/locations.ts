import { db } from "@/lib/db";
import { activeStatuses, type Actor } from "@/lib/domain";
import { scope } from "./filters";
export async function listLocations(actor: Actor) {
  return db.location.findMany({
    include: {
      _count: {
        select: {
          devices: true,
          incidents: {
            where: { ...scope(actor), status: { in: activeStatuses } },
          },
        },
      },
      incidents: {
        where: {
          ...scope(actor),
          status: { in: activeStatuses },
          priority: "P1_CRITICAL",
        },
        select: { id: true },
      },
    },
    orderBy: { code: "asc" },
  });
}
