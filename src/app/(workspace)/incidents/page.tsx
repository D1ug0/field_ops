import { pageActor } from "@/lib/session";
import { listIncidentPage } from "@/lib/queries/incidents";
import { listLocations } from "@/lib/queries/locations";
import { engineers } from "@/lib/queries/users";
import { categories, priorities, statuses } from "@/lib/domain";
import {
  PageHeader,
  Field,
  FormPanel,
  SectionTitle,
  SelectOptions,
} from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IncidentTable } from "@/components/incident-table";
import { IncidentCreate } from "@/components/incident-create";
import Link from "next/link";
import { normalizeFilters, type SearchParams } from "@/lib/queries/filters";
import { PaginationControls, PageSizeSelect } from "@/components/pagination";
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await pageActor();
  const f = normalizeFilters(await searchParams);
  const create = ["ADMIN", "DISPATCHER", "SUPPORT_ENGINEER"].includes(
    actor.role,
  );
  const [{ items: incidents, pagination }, locations, people] =
    await Promise.all([
      listIncidentPage(actor, f),
      listLocations(actor),
      engineers(),
    ]);
  return (
    <>
      <PageHeader
        title="Инциденты"
        description="Регистрация, приоритизация и сопровождение сервисных заявок."
      />
      {create && (
        <FormPanel title="Новый инцидент">
          <IncidentCreate locations={locations.filter((l) => l.active)} />
        </FormPanel>
      )}
      <Card>
        <SectionTitle
          title="Журнал инцидентов"
          subtitle={`${pagination.total} записей по выбранным фильтрам`}
        />
        <form className="filter-bar">
          <Field label="Поиск">
            <input
              name="q"
              defaultValue={f.q}
              placeholder="Номер, описание, объект…"
            />
          </Field>
          <Field label="Статус">
            <select name="status" defaultValue={f.status ?? ""}>
              <option value="">Все статусы</option>
              <option value="active">Все активные</option>
              <SelectOptions items={statuses} />
            </select>
          </Field>
          <Field label="Приоритет">
            <select name="priority" defaultValue={f.priority ?? ""}>
              <option value="">Все приоритеты</option>
              <SelectOptions items={priorities} />
            </select>
          </Field>
          <Field label="Объект">
            <select name="location" defaultValue={f.location ?? ""}>
              <option value="">Все объекты</option>
              {locations.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.code} · {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Инженер">
            <select name="engineer" defaultValue={f.engineer ?? ""}>
              <option value="">Все инженеры</option>
              {people
                .filter(
                  (p) => actor.role !== "FIELD_ENGINEER" || p.id === actor.id,
                )
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Тип оборудования">
            <select name="category" defaultValue={f.category ?? ""}>
              <option value="">Все категории</option>
              <SelectOptions items={categories} />
            </select>
          </Field>
          <Field label="Дата создания · МСК">
            <input type="date" name="date" defaultValue={f.date} />
          </Field>
          <PageSizeSelect pageSize={pagination.pageSize} />
          <Button type="submit" size="sm">
            Применить
          </Button>
          <Link className="text-link mb-2" href="/incidents">
            Сбросить
          </Link>
        </form>
        <IncidentTable incidents={incidents} />
        <PaginationControls
          pagination={pagination}
          pathname="/incidents"
          filters={f}
        />
      </Card>
    </>
  );
}
