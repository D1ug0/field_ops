import { auth } from "@/auth";
import { db } from "./db";
import { DomainError, type Actor } from "./domain";
import { redirect } from "next/navigation";
import { cache } from "react";

export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return user?.active ? user : null;
});
export async function pageActor() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}
export async function apiActor() {
  const actor = await getActor();
  if (!actor) throw new DomainError("Требуется вход в систему.", 401);
  return actor;
}
