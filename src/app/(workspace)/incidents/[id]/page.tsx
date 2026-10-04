import Link from "next/link";
import { notFound } from "next/navigation";
import { pageActor } from "@/lib/session";
import { engineers, getIncident } from "@/lib/queries";
import { db } from "@/lib/db";
import { priorities, statuses, rootCauses } from "@/lib/domain";
import { dateTime, incidentNumber, remainingSlaMinutes } from "@/lib/utils";
import { PageHeader, SectionTitle, Detail, Field } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IncidentActions } from "@/components/incident-actions";
import { DiagnosticSessions } from "@/components/diagnostic-sessions";
import { VisitList } from "@/components/visit-list";
import { MutationForm } from "@/components/mutation-form";
export default async function IncidentDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await pageActor();
  const { id } = await params;
  const [incident, people, templates] = await Promise.all([
    getIncident(actor, id),
    engineers(),
    db.diagnosticTemplate.findMany(),
  ]);
  if (!incident) notFound();
  const visits = await db.serviceVisit.findMany({
    where: { incidentId: id },
    include: {
      incident: true,
      location: true,
      engineer: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
  const remaining = remainingSlaMinutes(
    incident.createdAt,
    incident.resolvedAt,
    incident.priority,
  );
  const sla = incident.resolvedAt
    ? "Решение зафиксировано"
    : remaining <= 0
      ? `Превышен на ${Math.abs(remaining)} мин`
      : `${Math.floor(remaining / 60)} ч ${remaining % 60} мин`;
  return (
    <>
      <PageHeader
        eyebrow={`ИНЦИДЕНТ / ${incidentNumber(incident.sequence)}`}
        title={incident.title}
        description={`${incident.location.name} · ${incident.device?.name ?? "Без привязки к оборудованию"}`}
      >
        <Badge value={incident.priority}>{priorities[incident.priority]}</Badge>
        <Badge value={incident.status}>{statuses[incident.status]}</Badge>
      </PageHeader>
      <div className="detail-grid">
        <div className="stack">
          <Card>
            <SectionTitle
              title="Карточка инцидента"
              subtitle={incidentNumber(incident.sequence)}
            />
            <dl className="info-grid">
              <Detail label="Объект">
                <Link href={`/locations/${incident.locationId}`}>
                  {incident.location.name}
                </Link>
              </Detail>
              <Detail label="Оборудование">
                {incident.device && (
                  <Link href={`/equipment/${incident.deviceId}`}>
                    {incident.device.name}
                  </Link>
                )}
              </Detail>
              <Detail label="Назначенный инженер">
                {incident.assignedTo?.name ?? "Не назначен"}
              </Detail>
              <Detail label="Заявитель">{incident.createdBy.name}</Detail>
              <Detail label="Создан">{dateTime(incident.createdAt)}</Detail>
              <Detail label="Цель решения · календарное время">{sla}</Detail>
            </dl>
            <div className="description-block">{incident.description}</div>
            {incident.resolution && (
              <div className="session-summary">
                <strong>
                  Решение ·{" "}
                  {rootCauses[incident.rootCause as keyof typeof rootCauses] ??
                    incident.rootCause}
                </strong>
                <p>{incident.resolution}</p>
                <p className="mt-2 text-xs">{dateTime(incident.resolvedAt)}</p>
              </div>
            )}
          </Card>
          {visits.length > 0 && (
            <Card>
              <SectionTitle title="Выезды по инциденту" />
              <VisitList visits={visits} actor={actor} />
            </Card>
          )}
          <DiagnosticSessions
            actor={actor}
            incident={incident}
            templates={templates}
          />
          <Card>
            <SectionTitle
              title="Журнал событий"
              subtitle="Аудит действий по инциденту"
            />
            <div className="timeline">
              {incident.events.map((e) => (
                <div className="timeline-row" key={e.id}>
                  <div className="timeline-track">
                    <i />
                    <span />
                  </div>
                  <div className="timeline-content">
                    <strong>{e.message}</strong>
                    <p>
                      {dateTime(e.createdAt)} · {e.actor.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle
              title="Комментарии"
              subtitle={`${incident.comments.length} сообщений`}
            />
            <div className="px-5 pb-5">
              {incident.comments.map((c) => (
                <article className="maintenance-item" key={c.id}>
                  <div>
                    <strong>{c.author.name}</strong>
                    <span>{dateTime(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </article>
              ))}
              {actor.role !== "VIEWER" && (
                <div className="mt-4">
                  <MutationForm
                    endpoint={`/api/incidents/${id}/comments`}
                    label="Добавить комментарий"
                    reset
                  >
                    <Field label="Комментарий">
                      <textarea name="body" minLength={5} required rows={3} />
                    </Field>
                  </MutationForm>
                </div>
              )}
            </div>
          </Card>
        </div>
        <div>
          <IncidentActions actor={actor} incident={incident} people={people} />
        </div>
      </div>
    </>
  );
}
