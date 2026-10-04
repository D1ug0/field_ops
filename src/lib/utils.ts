import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Priority } from "@/generated/prisma/enums";
export function remainingSlaMinutes(
  createdAt: Date,
  resolvedAt: Date | null,
  priority: Priority,
) {
  const hours = { P1_CRITICAL: 1, P2_HIGH: 4, P3_MEDIUM: 24, P4_LOW: 168 }[
    priority
  ];
  return Math.ceil(
    (createdAt.getTime() +
      hours * 3600000 -
      (resolvedAt ?? new Date()).getTime()) /
      60000,
  );
}
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function incidentNumber(sequence: number) {
  return `INC-${String(sequence).padStart(6, "0")}`;
}
export function dateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(value));
}
