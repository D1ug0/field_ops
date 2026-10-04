import Link from "next/link";
import { MapPin, Clock3, ArrowUpRight } from "lucide-react";
import { listVisits } from "@/lib/queries";
import { visitStatuses, priorities, type Actor } from "@/lib/domain";
import { dateTime, incidentNumber } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { Empty, Field, FormPanel } from "./common";
import { MutationForm } from "./mutation-form";
export function VisitList({
  visits,
  actor,
  compact = false,
}: {
  visits: Awaited<ReturnType<typeof listVisits>>;
  actor: Actor;
  compact?: boolean;
}) {
  if (!visits.length)
    return (
      <Empty
        title="Выездов пока нет"
        text="Диспетчер может запланировать выезд в карточке назначенного инцидента."
      />
    );
  return (
    <div className="visit-list">
      {visits.map((v, order) => (
        <article className="visit-card" key={v.id}>
          <div className="visit-route">
            <span>{String(order + 1).padStart(2, "0")}</span>
            <div />
          </div>
          <div className="visit-body">
            <div className="visit-top">
              <span className="visit-time">
                <Clock3 size={14} />
                {dateTime(v.scheduledAt)}
              </span>
              <Badge value={v.status}>{visitStatuses[v.status]}</Badge>
            </div>
            <Link href={`/incidents/${v.incidentId}`} className="visit-title">
              {v.location.name}
              <ArrowUpRight size={16} />
            </Link>
            <p>{v.incident.title}</p>
            <div className="visit-address">
              <MapPin size={13} />
              {v.location.address}
            </div>
            {!compact && (
              <>
                <div className="visit-meta">
                  <span className="mono">
                    {incidentNumber(v.incident.sequence)}
                  </span>
                  <Badge value={v.incident.priority}>
                    {priorities[v.incident.priority]}
                  </Badge>
                  <span>{v.engineer.name}</span>
                </div>
                {v.travelNotes && <p className="small-note">{v.travelNotes}</p>}
                {v.workPerformed && (
                  <p className="small-note">
                    <strong>Выполнено:</strong> {v.workPerformed}
                    <br />
                    {v.result}
                  </p>
                )}
                {(actor.role === "ADMIN" ||
                  (actor.role === "FIELD_ENGINEER" &&
                    actor.id === v.engineerId)) && (
                  <div className="visit-actions">
                    {v.status === "PLANNED" && (
                      <MutationForm
                        endpoint={`/api/visits/${v.id}/start-travel`}
                        label="Начать поездку"
                        className="inline-form"
                      />
                    )}
                    {v.status === "TRAVELING" && (
                      <MutationForm
                        endpoint={`/api/visits/${v.id}/arrive`}
                        label="Прибыл на объект"
                        className="inline-form"
                      />
                    )}
                    {v.status === "ON_SITE" && (
                      <FormPanel title="Завершить выезд">
                        <MutationForm
                          endpoint={`/api/visits/${v.id}/complete`}
                          label="Завершить выезд"
                        >
                          <Field label="Выполненные работы">
                            <textarea
                              name="workPerformed"
                              minLength={5}
                              required
                            />
                          </Field>
                          <Field label="Результат">
                            <textarea name="result" minLength={5} required />
                          </Field>
                        </MutationForm>
                      </FormPanel>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
