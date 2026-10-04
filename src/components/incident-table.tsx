import Link from "next/link";
import type { listIncidents } from "@/lib/queries";
import { incidentNumber, dateTime } from "@/lib/utils";
import { priorities, statuses } from "@/lib/domain";
import { Badge } from "./ui/badge";
import { Empty } from "./common";
export function IncidentTable({
  incidents,
  compact = false,
}: {
  incidents: Awaited<ReturnType<typeof listIncidents>>;
  compact?: boolean;
}) {
  if (!incidents.length) return <Empty title="Инциденты не найдены" />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Инцидент</th>
            <th>Объект</th>
            <th>Приоритет</th>
            <th>Статус</th>
            {!compact && <th>Инженер</th>}
            <th>Создан</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id}>
              <td>
                <Link className="row-title" href={`/incidents/${i.id}`}>
                  <span className="mono row-code">
                    {incidentNumber(i.sequence)}
                  </span>
                  <strong>{i.title}</strong>
                </Link>
                {!compact && (
                  <span className="row-subtitle">
                    {i.device?.name ?? "Без устройства"}
                  </span>
                )}
              </td>
              <td>
                <Link href={`/locations/${i.locationId}`}>
                  {i.location.name}
                </Link>
                <span className="row-subtitle mono">{i.location.code}</span>
              </td>
              <td>
                <Badge value={i.priority}>{priorities[i.priority]}</Badge>
              </td>
              <td>
                <Badge value={i.status}>{statuses[i.status]}</Badge>
              </td>
              {!compact && (
                <td>
                  {i.assignedTo?.name ?? (
                    <span className="muted">Не назначен</span>
                  )}
                </td>
              )}
              <td className="muted nowrap">{dateTime(i.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
