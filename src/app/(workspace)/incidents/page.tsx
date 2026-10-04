import { pageActor } from "@/lib/session";
import {
  engineers,
  listDevices,
  listIncidents,
  listLocations,
} from "@/lib/queries";
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
export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await pageActor();
  const f = await searchParams;
  const [incidents, locations, people, devices] = await Promise.all([
    listIncidents(actor, f),
    listLocations(actor),
    engineers(),
    listDevices(),
  ]);
  const create = ["ADMIN", "DISPATCHER", "SUPPORT_ENGINEER"].includes(
    actor.role,
  );
  return (
    <>
      <PageHeader
        title="Инциденты"
        description="Регистрация, приоритизация и сопровождение сервисных заявок."
      />
      {create && (
        <FormPanel title="Новый инцидент">
          <IncidentCreate
            locations={locations.filter((l) => l.active)}
            devices={devices}
          />
        </FormPanel>
      )}
      <Card>
        <SectionTitle
          title="Журнал инцидентов"
          subtitle={`${incidents.length} записей · до 200 результатов`}
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
          <Button type="submit" size="sm">
            Применить
          </Button>
          <Link className="text-link mb-2" href="/incidents">
            Сбросить
          </Link>
        </form>
        <IncidentTable incidents={incidents} />
      </Card>
    </>
  );
}
