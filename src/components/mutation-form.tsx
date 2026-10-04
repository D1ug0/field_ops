"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

export function MutationForm({
  endpoint,
  method = "POST",
  label = "Сохранить",
  children,
  className = "form-grid",
  navigatePrefix,
  reset = false,
  variant = "default",
}: {
  endpoint: string;
  method?: "POST" | "PATCH";
  label?: string;
  children?: React.ReactNode;
  className?: string;
  navigatePrefix?: string;
  reset?: boolean;
  variant?: "default" | "outline" | "destructive";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    text: string;
  } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body: Record<string, unknown> = Object.fromEntries(
      new FormData(form),
    );
    if (typeof body.scheduledAt === "string" && body.scheduledAt)
      body.scheduledAt = new Date(`${body.scheduledAt}:00+03:00`).toISOString();
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setFeedback({
          error: true,
          text: result.error ?? "Не удалось сохранить изменения.",
        });
        return;
      }
      setFeedback({ error: false, text: "Изменения сохранены" });
      if (reset) form.reset();
      if (navigatePrefix && result.id)
        router.push(`${navigatePrefix}/${result.id}`);
      router.refresh();
    } catch {
      setFeedback({
        error: true,
        text: "Сервер недоступен. Проверьте соединение и повторите.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className={className}>
      <fieldset disabled={pending} className="form-fields">
        {children}
      </fieldset>
      <div className="form-submit">
        <Button type="submit" disabled={pending} variant={variant}>
          {pending && <Loader2 size={15} className="animate-spin" />}
          {label}
        </Button>
        {feedback && (
          <p
            role={feedback.error ? "alert" : "status"}
            className={feedback.error ? "feedback-error" : "feedback-success"}
          >
            {feedback.error ? (
              <AlertCircle size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {feedback.text}
          </p>
        )}
      </div>
    </form>
  );
}
