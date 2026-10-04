"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
export function Refresh({ poll = false }: { poll?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!poll) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [poll, router]);
  return (
    <Button variant="outline" onClick={() => router.refresh()}>
      <RefreshCw size={14} />
      Обновить
    </Button>
  );
}
