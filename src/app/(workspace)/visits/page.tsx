import { pageActor } from "@/lib/session";
import { listVisits } from "@/lib/queries";
import { PageHeader, SectionTitle } from "@/components/common";
import { Card } from "@/components/ui/card";
import { VisitList } from "@/components/visit-list";
export default async function VisitsPage() {
  const actor = await pageActor();
  const visits = await listVisits(actor);
  return (
    <>
      <PageHeader
        title="Сервисные выезды"
        description="Поездка, прибытие и отчёт о выполненных работах. Планирование доступно в карточке инцидента."
      />
      <Card>
        <SectionTitle
          title="Расписание и история"
          subtitle={`${visits.length} выездов · время Москвы`}
        />
        <VisitList visits={visits} actor={actor} />
      </Card>
    </>
  );
}
