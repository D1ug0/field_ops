import {
  canManage,
  canWork,
  nextStatuses,
  priorities,
  rootCauses,
  terminalStatuses,
  type Actor,
} from "@/lib/domain";
import type { engineers, getIncident } from "@/lib/queries";
import { Field, FormPanel, SelectOptions } from "./common";
import { Card } from "./ui/card";
import { MutationForm } from "./mutation-form";
type Incident = NonNullable<Awaited<ReturnType<typeof getIncident>>>;
export function IncidentActions({
  actor,
  incident,
  people,
}: {
  actor: Actor;
  incident: Incident;
  people: Awaited<ReturnType<typeof engineers>>;
}) {
  const next = nextStatuses(incident.status);
  const work = canWork(actor, incident.assignedToId);
  const manager = canManage(actor);
  const remote = ["ADMIN", "DISPATCHER", "SUPPORT_ENGINEER"].includes(
    actor.role,
  );
  const activeVisit = incident.visits.some((v) =>
    ["PLANNED", "TRAVELING", "ON_SITE"].includes(v.status),
  );
  return (
    <Card className="action-box">
      <h2>Действия по инциденту</h2>
      {actor.role === "VIEWER" && (
        <p className="muted text-xs">Доступ в режиме чтения.</p>
      )}
      {manager &&
        !terminalStatuses.includes(incident.status) &&
        !["IN_PROGRESS", "ON_SITE", "WAITING"].includes(incident.status) && (
          <FormPanel title="Назначить инженера">
            <MutationForm
              endpoint={`/api/incidents/${incident.id}/assign`}
              label="Назначить"
            >
              <Field label="Инженер">
                <select
                  name="assignedToId"
                  defaultValue={incident.assignedToId ?? ""}
                  required
                >
                  <option value="" disabled>
                    Выберите инженера
                  </option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            </MutationForm>
          </FormPanel>
        )}
      {remote && next.includes("TRIAGE") && (
        <MutationForm
          endpoint={`/api/incidents/${incident.id}/triage`}
          label="Взять на разбор"
          className="inline-form"
        />
      )}
      {work && next.includes("IN_PROGRESS") && (
        <MutationForm
          endpoint={`/api/incidents/${incident.id}/start`}
          label={
            incident.status === "ASSIGNED"
              ? "Принять и начать работу"
              : "Продолжить работу"
          }
          className="inline-form"
        />
      )}
      {work && next.includes("ON_SITE") && !activeVisit && (
        <MutationForm
          endpoint={`/api/incidents/${incident.id}/arrive`}
          label="Прибыл на объект"
          className="inline-form"
        />
      )}
      {manager &&
        incident.assignedTo?.role === "FIELD_ENGINEER" &&
        !terminalStatuses.includes(incident.status) &&
        incident.status !== "ESCALATED" &&
        !activeVisit && (
          <FormPanel title="Запланировать выезд">
            <MutationForm endpoint="/api/visits" label="Запланировать">
              <input type="hidden" name="incidentId" value={incident.id} />
              <input
                type="hidden"
                name="engineerId"
                value={incident.assignedToId ?? ""}
              />
              <Field label="Дата и время · Москва">
                <input name="scheduledAt" type="datetime-local" required />
              </Field>
              <Field label="Заметки к выезду">
                <textarea name="travelNotes" />
              </Field>
            </MutationForm>
          </FormPanel>
        )}
      {work && next.includes("WAITING") && (
        <FormPanel title="Перевести в ожидание">
          <MutationForm
            endpoint={`/api/incidents/${incident.id}/wait`}
            label="Ожидание"
            variant="outline"
          >
            <Field label="Причина ожидания">
              <textarea name="reason" minLength={5} required />
            </Field>
          </MutationForm>
        </FormPanel>
      )}
      {work && next.includes("ESCALATED") && (
        <FormPanel title="Эскалировать">
          <MutationForm
            endpoint={`/api/incidents/${incident.id}/escalate`}
            label="Эскалировать"
            variant="outline"
          >
            <Field label="Причина и получатель эскалации">
              <textarea
                name="reason"
                minLength={5}
                required
                placeholder="Например, NETWORK / L2 — требуется проверить VLAN"
              />
            </Field>
          </MutationForm>
        </FormPanel>
      )}
      {work && next.includes("RESOLVED") && (
        <FormPanel title="Решить инцидент">
          <MutationForm
            endpoint={`/api/incidents/${incident.id}/resolve`}
            label="Подтвердить решение"
          >
            <Field label="Корневая причина">
              <select name="rootCause" required>
                <SelectOptions items={rootCauses} />
              </select>
            </Field>
            <Field label="Что выполнено и как проверено">
              <textarea name="resolution" minLength={5} required rows={4} />
            </Field>
          </MutationForm>
        </FormPanel>
      )}
      {remote && next.includes("CLOSED") && (
        <MutationForm
          endpoint={`/api/incidents/${incident.id}/close`}
          label="Закрыть инцидент"
          className="inline-form"
        />
      )}
      {manager && !terminalStatuses.includes(incident.status) && (
        <FormPanel title="Изменить приоритет">
          <MutationForm
            endpoint={`/api/incidents/${incident.id}`}
            method="PATCH"
            label="Обновить приоритет"
          >
            <Field label="Приоритет">
              <select name="priority" defaultValue={incident.priority}>
                <SelectOptions items={priorities} />
              </select>
            </Field>
          </MutationForm>
        </FormPanel>
      )}
      {remote && next.includes("CANCELLED") && (
        <FormPanel title="Отменить инцидент">
          <MutationForm
            endpoint={`/api/incidents/${incident.id}/cancel`}
            label="Отменить"
            variant="destructive"
          >
            <Field label="Причина отмены">
              <textarea name="reason" minLength={5} required />
            </Field>
          </MutationForm>
        </FormPanel>
      )}
      <p className="muted text-[10px] mt-3">
        Каждое изменение фиксируется в журнале событий. Решение сохраняет запись
        обслуживания оборудования.
      </p>
    </Card>
  );
}
