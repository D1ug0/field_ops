import Link from "next/link";
import { notFound } from "next/navigation";
import { pageActor } from "@/lib/session";
import { db } from "@/lib/db";
import { listIncidents } from "@/lib/queries/incidents";
import { listLocations } from "@/lib/queries/locations";
import { categories, deviceStatuses, maintenanceTypes } from "@/lib/domain";
import { dateTime } from "@/lib/utils";
import {
  PageHeader,
  Detail,
  SectionTitle,
  Field,
  FormPanel,
  SelectOptions,
} from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeviceForm } from "@/components/infrastructure-forms";
import { MaintenanceList } from "@/components/maintenance-list";
import { IncidentTable } from "@/components/incident-table";
import { MutationForm } from "@/components/mutation-form";
export default async function EquipmentDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await pageActor();
  const { id } = await params;
  const [device, locations] = await Promise.all([
    db.device.findUnique({
      where: { id },
      include: {
        location: true,
        parent: true,
        children: true,
        maintenance: {
          include: { engineer: { select: { name: true } } },
          orderBy: { performedAt: "desc" },
        },
      },
    }),
    listLocations(actor),
  ]);
  if (!device) notFound();
  const incidents = (
    await listIncidents(actor, { location: device.locationId })
  ).filter((i) => i.deviceId === id);
  return (
    <>
      <PageHeader
        eyebrow={`ОБОРУДОВАНИЕ / ${device.assetTag}`}
        title={device.name}
        description={`${categories[device.category]} · ${device.vendor} ${device.model}`}
      >
        <Badge value={device.status}>{deviceStatuses[device.status]}</Badge>
      </PageHeader>
      {actor.role === "ADMIN" && (
        <FormPanel title="Редактировать оборудование">
          <DeviceForm
            device={device}
            locations={locations.filter((l) => l.active)}
          />
        </FormPanel>
      )}
      <div className="detail-grid">
        <div className="stack">
          <Card>
            <SectionTitle title="Паспорт устройства" />
            <dl className="info-grid">
              <Detail label="Инвентарный номер">
                <span className="mono">{device.assetTag}</span>
              </Detail>
              <Detail label="Серийный номер">
                <span className="mono">{device.serialNumber}</span>
              </Detail>
              <Detail label="Объект">
                <Link href={`/locations/${device.locationId}`}>
                  {device.location.name}
                </Link>
              </Detail>
              <Detail label="IP-адрес">
                <span className="mono">{device.ipAddress}</span>
              </Detail>
              <Detail label="MAC-адрес">
                <span className="mono">{device.macAddress}</span>
              </Detail>
              <Detail label="Hostname">
                <span className="mono">{device.hostname}</span>
              </Detail>
              <Detail label="Установлено">
                {dateTime(device.installedAt)}
              </Detail>
              <Detail label="Гарантия до">
                {dateTime(device.warrantyUntil)}
              </Detail>
              <Detail label="Последнее демо-наблюдение">
                {dateTime(device.lastSeenAt)}
              </Detail>
            </dl>
            <div className="description-block">{device.notes}</div>
            {device.parent && (
              <div className="px-5 pb-5 text-xs">
                Родительская касса:{" "}
                <Link
                  className="text-link"
                  href={`/equipment/${device.parentId}`}
                >
                  {device.parent.name}
                </Link>
              </div>
            )}
            {device.children.length > 0 && (
              <div className="px-5 pb-5">
                <h3 className="mb-3">Периферия кассы</h3>
                {device.children.map((d) => (
                  <Link
                    className="text-link mr-5"
                    key={d.id}
                    href={`/equipment/${d.id}`}
                  >
                    {d.name} →
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <SectionTitle title="Инциденты оборудования" />
            <IncidentTable incidents={incidents} compact />
          </Card>
          <Card>
            <SectionTitle
              title="История обслуживания"
              subtitle={`${device.maintenance.length} записей`}
            />
            <MaintenanceList records={device.maintenance} />
          </Card>
        </div>
        <div className="stack">
          {device.category === "SCALE" && (
            <Card>
              <SectionTitle
                title="Профиль торговых весов"
                subtitle="Обобщённый учебный профиль"
              />
              <dl className="info-grid !grid-cols-1">
                <Detail label="Синхронизация PLU">
                  <Badge
                    value={device.pluSyncStatus === "OK" ? "ONLINE" : "FAIL"}
                  >
                    {device.pluSyncStatus ?? "Неизвестно"}
                  </Badge>
                </Detail>
                <Detail label="Последняя синхронизация">
                  {dateTime(device.lastPluSyncAt)}
                </Detail>
                <Detail label="Весовой датчик">{device.scaleStatus}</Detail>
                <Detail label="Принтер / бумага">
                  {device.printerStatus} / {device.paperStatus}
                </Detail>
                <Detail label="Прошивка">
                  <span className="mono">{device.firmwareVersion}</span>
                </Detail>
              </dl>
            </Card>
          )}
          {["ADMIN", "SUPPORT_ENGINEER", "FIELD_ENGINEER"].includes(
            actor.role,
          ) &&
            (actor.role !== "FIELD_ENGINEER" || incidents.length > 0) && (
              <Card className="action-box">
                <h2>Добавить запись обслуживания</h2>
                <MutationForm
                  endpoint="/api/maintenance"
                  label="Сохранить работу"
                  reset
                >
                  <input type="hidden" name="deviceId" value={id} />
                  <Field label="Связанный инцидент">
                    <select
                      name="incidentId"
                      required={actor.role === "FIELD_ENGINEER"}
                    >
                      {actor.role !== "FIELD_ENGINEER" && (
                        <option value="">Плановое обслуживание</option>
                      )}
                      {incidents.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Вид работы">
                    <select name="type">
                      <SelectOptions items={maintenanceTypes} />
                    </select>
                  </Field>
                  <Field label="Выполненные работы">
                    <textarea name="description" minLength={5} required />
                  </Field>
                  <Field label="Результат проверки">
                    <textarea name="result" minLength={5} required />
                  </Field>
                </MutationForm>
              </Card>
            )}
        </div>
      </div>
    </>
  );
}
