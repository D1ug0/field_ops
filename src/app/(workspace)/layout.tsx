import { pageActor } from "@/lib/session";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor();
  return (
    <Shell actor={actor} demo={process.env.DEMO_ENABLED === "true"}>
      {children}
    </Shell>
  );
}
