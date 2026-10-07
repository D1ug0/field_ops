import Link from "next/link";
import { pageActor } from "@/lib/session";
import { listDevicePage, deviceVendors } from "@/lib/queries/devices";
import { listLocations } from "@/lib/queries/locations";
import { categories, deviceStatuses } from "@/lib/domain";
import {
  PageHeader,
  SectionTitle,
  Field,
  SelectOptions,
  FormPanel,
} from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EquipmentTable } from "@/components/equipment-table";
import { DeviceForm } from "@/components/infrastructure-forms";
import { normalizeFilters, type SearchParams } from "@/lib/queries/filters";
import { PaginationControls, PageSizeSelect } from "@/components/pagination";
export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await pageActor();
  const f = normalizeFilters(await searchParams);
  const [{ items: devices, pagination }, locations, vendors] =
    await Promise.all([
      listDevicePage(f),
      listLocations(actor),
      deviceVendors(),
    ]);
  return (
    <>
      <PageHeader
        eyebrow="FIELDOPS / ИНФРАСТРУКТУРА"
        title="Оборудование"
        description="Инвентаризация, сетевые параметры и история обслуживания устройств."
      />
      {actor.role === "ADMIN" && (
        <FormPanel title="Добавить оборудование">
          <DeviceForm locations={locations.filter((l) => l.active)} />
        </FormPanel>
      )}
      <Card>
        <SectionTitle
          title="Реестр оборудования"
          subtitle={`${pagination.total} устройств по выбранным фильтрам`}
        />
        <form className="filter-bar">
          <Field label="Поиск">
            <input
              name="q"
              defaultValue={f.q}
              placeholder="Название, IP, номер, hostname…"
            />
          </Field>
          <Field label="Объект">
            <select name="location" defaultValue={f.location ?? ""}>
              <option value="">Все объекты</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} · {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Категория">
            <select name="category" defaultValue={f.category ?? ""}>
              <option value="">Все категории</option>
              <SelectOptions items={categories} />
            </select>
          </Field>
          <Field label="Производитель">
            <select name="vendor" defaultValue={f.vendor ?? ""}>
              <option value="">Все производители</option>
              {vendors.map((v) => (
                <option key={v.vendor}>{v.vendor}</option>
              ))}
            </select>
          </Field>
          <Field label="Статус">
            <select name="status" defaultValue={f.status ?? ""}>
              <option value="">Все статусы</option>
              <SelectOptions items={deviceStatuses} />
            </select>
          </Field>
          <PageSizeSelect pageSize={pagination.pageSize} />
          <Button type="submit" size="sm">
            Применить
          </Button>
          <Link href="/equipment" className="text-link mb-2">
            Сбросить
          </Link>
        </form>
        <EquipmentTable devices={devices} />
        <PaginationControls
          pagination={pagination}
          pathname="/equipment"
          filters={f}
        />
      </Card>
    </>
  );
}
