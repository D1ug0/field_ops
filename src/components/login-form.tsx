"use client";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Field } from "./common";
export function LoginForm({ demoPassword }: { demoPassword?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(
    demoPassword ? "engineer@fieldops.local" : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
      });
      if (result?.error)
        setError(
          "Не удалось войти. Проверьте email, пароль и доступность базы данных.",
        );
      else {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Сервер недоступен. Повторите попытку.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form onSubmit={submit} className="login-form">
        <Field label="Рабочий email">
          <input
            type="email"
            name="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </Field>
        <Field label="Пароль">
          <input
            type="password"
            name="password"
            required
            defaultValue={demoPassword ?? ""}
            autoComplete="current-password"
          />
        </Field>
        {error && (
          <p role="alert" className="feedback-error">
            {error}
          </p>
        )}
        <Button disabled={pending} type="submit">
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          Войти в рабочую среду
        </Button>
      </form>
      {demoPassword && (
        <div className="demo-accounts">
          <strong>Локальные демо-аккаунты</strong>
          <p>
            Общий пароль: <code>{demoPassword}</code>
          </p>
          <div>
            {[
              ["engineer", "Инженер"],
              ["dispatcher", "Диспетчер"],
              ["support", "Поддержка"],
              ["admin", "Админ"],
              ["viewer", "Наблюдатель"],
            ].map(([id, name]) => (
              <button
                key={id}
                onClick={() => setEmail(`${id}@fieldops.local`)}
                type="button"
                className={email.startsWith(id + "@") ? "selected" : ""}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
