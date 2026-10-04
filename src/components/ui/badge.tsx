import { cn } from "@/lib/utils";
const tones: Record<string, string> = {
  ONLINE: "badge-green",
  RESOLVED: "badge-green",
  CLOSED: "badge-gray",
  COMPLETED: "badge-green",
  PASS: "badge-green",
  OFFLINE: "badge-red",
  P1_CRITICAL: "badge-red",
  FAIL: "badge-red",
  CRITICAL: "badge-red",
  DEGRADED: "badge-amber",
  P2_HIGH: "badge-amber",
  WAITING: "badge-amber",
  ESCALATED: "badge-red",
  WARNING: "badge-amber",
  IN_PROGRESS: "badge-blue",
  ON_SITE: "badge-teal",
  TRAVELING: "badge-blue",
  ASSIGNED: "badge-blue",
  P3_MEDIUM: "badge-blue",
  PLANNED: "badge-gray",
};
export function Badge({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("badge", tones[value] ?? "badge-gray")}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
