"use client";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="empty error-card">
      <AlertTriangle size={32} />
      <h1>Не удалось загрузить данные</h1>
      <p>Проверьте подключение к PostgreSQL и применение миграций.</p>
      <Button onClick={() => reset()}>Повторить загрузку</Button>
    </div>
  );
}
