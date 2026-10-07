import Link from "next/link";
import {
  CircleAlert,
  TriangleAlert,
  WifiOff,
  BriefcaseBusiness,
  ArrowUpRight,
  MapPin,
  CalendarDays,
} from "lucide-react";
import { db } from "@/lib/db";
import { pageActor } from "@/lib/session";
import { listIncidents, activeIncidentCounts } from "@/lib/queries/incidents";
import { listLocations } from "@/lib/queries/locations";
import { listVisits, todayWindow } from "@/lib/queries/visits";
import { scope } from "@/lib/queries/filters";
import { activeStatuses } from "@/lib/domain";
import { PageHeader, SectionTitle, Stat } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncidentTable } from "@/components/incident-table";
import { LocationMap } from "@/components/maps/location-map";
import { VisitList } from "@/components/visit-list";

export default async function Dashboard() {
  const actor = await pageActor();
  const [
    incidents,
    locations,
    visits,
    deviceCounts,
    alerts,
    users,
    incidentCounts,
  ] = await Promise.all([
    listIncidents(actor, { status: "active" }, 6),
    listLocations(actor),
    listVisits(actor),
    db.device.groupBy({ by: ["status"], _count: { _all: true } }),
    db.alert.findMany({
      where: { resolvedAt: null },
      include: { device: true, location: true },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: {
        role: { in: ["FIELD_ENGINEER", "SUPPORT_ENGINEER"] },
        ...(actor.role === "FIELD_ENGINEER" ? { id: actor.id } : {}),
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            assigned: {
              where: { ...scope(actor), status: { in: activeStatuses } },
            },
          },
        },
      },
    }),
    activeIncidentCounts(actor),
  ]);
  const count = (status: string) =>
    deviceCounts.find((d) => d.status === status)?._count._all ?? 0;
  const totalDevices = deviceCounts.reduce((n, d) => n + d._count._all, 0);
  const window = todayWindow();
  const todayVisits = visits.filter(
    (v) =>
      v.scheduledAt >= window.gte &&
      v.scheduledAt < window.lt &&
      v.status !== "CANCELLED",
  );
  const impacted = locations.filter((l) => l._count.incidents > 0);
  const date = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(new Date());
  return (
    <>
      <PageHeader
        eyebrow={`РАБОЧАЯ СРЕДА / ${date.toUpperCase()}`}
        title="Обзор сети"
        description={
          actor.role === "FIELD_ENGINEER"
            ? "Инфраструктура сети и назначенные вам инциденты."
            : "Текущее состояние инфраструктуры и сервисных операций."
        }
      >
        <span className="muted text-xs inline-flex items-center gap-2">
          <MapPin size={14} />
          {locations.length} объектов
        </span>
        <Button asChild variant="outline">
          <Link href="/my-work">
            <BriefcaseBusiness size={15} />
            Моя работа
          </Link>
        </Button>
      </PageHeader>
      <div className="stats-grid">
        <Stat
          label="Открытые инциденты"
          value={incidentCounts.total}
          detail={`${impacted.length} объектов с инцидентами`}
          icon={<CircleAlert size={17} />}
          href="/incidents?status=active"
        />
        <Stat
          label="Критические инциденты"
          value={incidentCounts.critical}
          detail="Приоритет P1 · требуют внимания"
          icon={<TriangleAlert size={17} />}
          tone="red"
          href="/incidents?priority=P1_CRITICAL&status=active"
        />
        <Stat
          label="Недоступное оборудование"
          value={count("OFFLINE")}
          detail={`Из ${totalDevices} устройств в сети`}
          icon={<WifiOff size={17} />}
          tone="amber"
          href="/equipment?status=OFFLINE"
        />
        <Stat
          label="Назначено мне"
          value={incidentCounts.assigned}
          detail={`${todayVisits.filter((v) => v.engineerId === actor.id).length} выездов сегодня`}
          icon={<BriefcaseBusiness size={17} />}
          tone="blue"
          href="/my-work"
        />
      </div>
      <div className="dashboard-grid">
        <div className="stack">
          <Card>
            <SectionTitle
              title="Активные инциденты"
              subtitle="Критические заявки в начале списка"
              href="/incidents"
              link="Все инциденты"
            />
            <IncidentTable incidents={incidents} compact />
          </Card>
          <Card>
            <SectionTitle
              title="Карта объектов"
              subtitle="Учебная сеть · Амстердам"
              href="/locations"
              link="Объекты сети"
            />
            <LocationMap
              compact
              locations={locations.map((l) => ({
                ...l,
                issues: l._count.incidents,
                critical: l.incidents.length,
                devices: l._count.devices,
              }))}
            />
          </Card>
          <Card>
            <SectionTitle
              title="Нагрузка инженеров"
              subtitle="Количество активных назначенных инцидентов"
            />
            <div className="workload">
              {users.map((u) => (
                <div className="workload-row" key={u.id}>
                  <span className="avatar">
                    {u.name
                      .split(" ")
                      .map((s) => s[0])
                      .join("")}
                  </span>
                  <div className="workload-info">
                    <p>
                      <span>{u.name}</span>
                      <span>{u._count.assigned} заявок</span>
                    </p>
                    <div>
                      <i
                        style={{
                          width: `${Math.min(100, (u._count.assigned / Math.max(1, ...users.map((item) => item._count.assigned))) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="stack">
          <Card>
            <SectionTitle
              title="Выезды сегодня"
              subtitle={`${todayVisits.length} выездов · время Москвы`}
              href="/visits"
              link="Расписание"
            />
            <VisitList visits={todayVisits.slice(0, 4)} actor={actor} compact />
          </Card>
          <Card>
            <SectionTitle
              title="Состояние оборудования"
              subtitle="Демонстрационные состояния устройств"
              href="/monitoring"
              link="Мониторинг"
            />
            <div className="health-strip">
              <div className="health-bar">
                <span
                  className="online"
                  style={{
                    width: `${(count("ONLINE") / Math.max(totalDevices, 1)) * 100}%`,
                  }}
                />
                <span
                  className="degraded"
                  style={{
                    width: `${(count("DEGRADED") / Math.max(totalDevices, 1)) * 100}%`,
                  }}
                />
                <span
                  className="offline"
                  style={{
                    width: `${(count("OFFLINE") / Math.max(totalDevices, 1)) * 100}%`,
                  }}
                />
              </div>
              <div className="health-labels">
                <span>{count("ONLINE")} в сети</span>
                <span>{count("DEGRADED")} сбой</span>
                <span>{count("OFFLINE")} offline</span>
              </div>
            </div>
            {alerts.map((a) => (
              <div className="alert-row" key={a.id}>
                <span
                  className={`alert-indicator ${a.severity === "CRITICAL" ? "red-dot" : "amber-dot"}`}
                />
                <div>
                  <strong>{a.device.name}</strong>
                  <p>{a.message}</p>
                </div>
                <Link
                  href={`/equipment/${a.deviceId}`}
                  aria-label="Открыть оборудование"
                >
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            ))}
          </Card>
          <Card>
            <SectionTitle
              title="Объекты с инцидентами"
              subtitle="По количеству активных заявок"
            />
            {impacted
              .sort((a, b) => b._count.incidents - a._count.incidents)
              .slice(0, 4)
              .map((l) => (
                <div className="alert-row" key={l.id}>
                  <MapPin size={15} className="muted mt-1" />
                  <div>
                    <Link href={`/locations/${l.id}`}>
                      <strong>{l.name}</strong>
                    </Link>
                    <p>
                      {l._count.incidents} инцидентов · {l._count.devices}{" "}
                      устройств
                    </p>
                  </div>
                  <Link href={`/locations/${l.id}`} aria-label="Открыть объект">
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              ))}
            {!impacted.length && (
              <p className="muted px-5 pb-5 text-xs">
                Активных инцидентов нет.
              </p>
            )}
          </Card>
          <div className="muted text-xs flex items-center gap-2 px-1">
            <CalendarDays size={14} />
            Состояние на момент загрузки страницы
          </div>
        </div>
      </div>
    </>
  );
}
