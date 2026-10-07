import { pageActor } from "@/lib/session";
import { listIncidents } from "@/lib/queries/incidents";
import { listVisits, todayWindow } from "@/lib/queries/visits";
import {
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  TriangleAlert,
} from "lucide-react";
import { PageHeader, Stat, SectionTitle } from "@/components/common";
import { Card } from "@/components/ui/card";
import { IncidentTable } from "@/components/incident-table";
import { VisitList } from "@/components/visit-list";
export default async function MyWorkPage() {
  const actor = await pageActor();
  const [incidents, visits] = await Promise.all([
    listIncidents(actor, { engineer: actor.id, status: "active" }),
    listVisits(actor, true),
  ]);
  const window = todayWindow();
  const today = visits.filter(
    (v) =>
      v.scheduledAt >= window.gte &&
      v.scheduledAt < window.lt &&
      v.status !== "CANCELLED",
  );
  return (
    <>
      <PageHeader
        title="Моя работа"
        description={`${actor.name} · назначенные инциденты и личное расписание выездов.`}
      />
      <div className="stats-grid">
        <Stat
          label="Назначенные инциденты"
          value={incidents.length}
          detail="Все активные статусы"
          icon={<BriefcaseBusiness size={17} />}
        />
        <Stat
          label="Выезды сегодня"
          value={today.length}
          detail="Время Москвы"
          icon={<CalendarDays size={17} />}
          tone="blue"
        />
        <Stat
          label="На объекте"
          value={visits.filter((v) => v.status === "ON_SITE").length}
          detail="Текущие выезды"
          icon={<MapPin size={17} />}
        />
        <Stat
          label="Критические заявки"
          value={incidents.filter((i) => i.priority === "P1_CRITICAL").length}
          detail="Приоритет P1"
          icon={<TriangleAlert size={17} />}
          tone="red"
        />
      </div>
      <div className="dashboard-grid">
        <Card>
          <SectionTitle
            title="Мои активные инциденты"
            subtitle="Сначала критические заявки"
          />
          <IncidentTable incidents={incidents} compact />
        </Card>
        <Card>
          <SectionTitle
            title="Маршрут на сегодня"
            subtitle="Порядок по запланированному времени"
          />
          <VisitList visits={today} actor={actor} />
        </Card>
      </div>
    </>
  );
}
