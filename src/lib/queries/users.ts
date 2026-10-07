import { db } from "@/lib/db";
export async function engineers() {
  return db.user.findMany({
    where: {
      active: true,
      role: { in: ["FIELD_ENGINEER", "SUPPORT_ENGINEER"] },
    },
    select: { id: true, name: true, role: true },
  });
}
