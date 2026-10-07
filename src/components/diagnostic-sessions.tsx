import type { getIncident } from "@/lib/queries/incidents";
import type { DiagnosticTemplate } from "@/generated/prisma/client";
import {
  canWork,
  stepStatuses,
  terminalStatuses,
  type Actor,
} from "@/lib/domain";
import { dateTime } from "@/lib/utils";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { MutationForm } from "./mutation-form";
import { SectionTitle, Field, SelectOptions, FormPanel } from "./common";
type Incident = NonNullable<Awaited<ReturnType<typeof getIncident>>>;
export function DiagnosticSessions({
  actor,
  incident,
  templates,
}: {
  actor: Actor;
  incident: Incident;
  templates: DiagnosticTemplate[];
}) {
  const writable =
    canWork(actor, incident.assignedToId) &&
    !terminalStatuses.includes(incident.status);
  const unfinished = incident.diagnostics.some(
    (s) => s.engineerId === actor.id && !s.completedAt,
  );
  return (
    <>
      <Card>
        <SectionTitle
          title="Диагностические чек-листы"
          subtitle="Результаты сохраняются отдельно для каждой сессии"
        />
        <div className="px-5 pb-4">
          {writable && !unfinished ? (
            <FormPanel title="Начать диагностику">
              <MutationForm
                endpoint={`/api/incidents/${incident.id}/diagnostics`}
                label="Начать"
              >
                <Field label="Шаблон диагностики">
                  <select
                    name="templateId"
                    defaultValue={
                      templates.find(
                        (t) => t.category === incident.device?.category,
                      )?.id ?? templates[0]?.id
                    }
                    required
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </MutationForm>
            </FormPanel>
          ) : (
            <p className="muted text-xs">
              {unfinished
                ? "Продолжите текущую сессию ниже."
                : "История диагностики доступна для просмотра."}
            </p>
          )}
        </div>
      </Card>
      {incident.diagnostics.map((session) => {
        const editable =
          writable &&
          !session.completedAt &&
          (session.engineerId === actor.id || actor.role === "ADMIN");
        return (
          <Card key={session.id}>
            <SectionTitle
              title={session.template.name}
              subtitle={`${session.engineer.name} · ${dateTime(session.startedAt)} · ${session.results.length}/${session.template.steps.length} шагов`}
            />
            {session.template.steps.map((step) => {
              const result = session.results.find((r) => r.stepId === step.id);
              return (
                <div className="diagnostic-step" key={step.id}>
                  <div className="step-heading">
                    <h3>
                      <span>{String(step.order + 1).padStart(2, "0")}</span>
                      {step.title}
                    </h3>
                    {result && (
                      <Badge value={result.status}>
                        {stepStatuses[result.status]}
                      </Badge>
                    )}
                  </div>
                  <p>{step.hint}</p>
                  {editable ? (
                    <MutationForm
                      endpoint={`/api/diagnostics/${session.id}/steps/${step.id}`}
                      method="PATCH"
                      label="Записать результат"
                      className="step-form"
                    >
                      <Field label="Результат">
                        <select
                          name="status"
                          defaultValue={result?.status ?? "PASS"}
                        >
                          <SelectOptions items={stepStatuses} />
                        </select>
                      </Field>
                      <Field label="Значение">
                        <input
                          name="value"
                          defaultValue={result?.value}
                          placeholder="Например, 10.1.20.24"
                        />
                      </Field>
                      <Field label="Наблюдение">
                        <input
                          name="comment"
                          defaultValue={result?.comment}
                          placeholder="Результат проверки"
                        />
                      </Field>
                    </MutationForm>
                  ) : (
                    <p>
                      {result
                        ? [result.value, result.comment]
                            .filter(Boolean)
                            .join(" · ") || "Результат записан"
                        : "Результат ещё не записан"}
                    </p>
                  )}
                </div>
              );
            })}
            {editable && (
              <div className="px-5 py-4">
                <MutationForm
                  endpoint={`/api/diagnostics/${session.id}/complete`}
                  label="Завершить диагностику"
                >
                  <Field label="Итог диагностики">
                    <textarea
                      name="summary"
                      minLength={5}
                      required
                      placeholder="Подтверждённые причины и дальнейшие действия"
                    />
                  </Field>
                </MutationForm>
              </div>
            )}
            {session.completedAt && (
              <div className="session-summary">
                <strong>Завершено {dateTime(session.completedAt)}</strong>
                <p>{session.summary}</p>
              </div>
            )}
          </Card>
        );
      })}
    </>
  );
}
