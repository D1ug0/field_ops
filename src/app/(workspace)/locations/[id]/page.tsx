import Link from "next/link";
import { notFound } from "next/navigation";
import { pageActor } from "@/lib/session";
import { db } from "@/lib/db";
import { listIncidents } from "@/lib/queries/incidents";
import { listDevices } from "@/lib/queries/devices";
import { categories, deviceStatuses, locationTypes } from "@/lib/domain";
import { dateTime } from "@/lib/utils";
import {
  PageHeader,
  SectionTitle,
  Detail,
  FormPanel,
} from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EquipmentTable } from "@/components/equipment-table";
import { IncidentTable } from "@/components/incident-table";
import { MaintenanceList } from "@/components/maintenance-list";
import { LocationForm } from "@/components/infrastructure-forms";
export default async function LocationDetails({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await pageActor();
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const [location, devices, incidents, maintenance, visit] = await Promise.all([
    db.location.findUnique({ where: { id } }),
    listDevices({ location: id }),
    listIncidents(actor, { location: id }),
    db.maintenanceRecord.findMany({
      where: { device: { locationId: id } },
      include: {
        engineer: { select: { name: true } },
        device: { select: { name: true } },
      },
      orderBy: { performedAt: "desc" },
      take: 50,
    }),
    db.serviceVisit.findFirst({
      where: { locationId: id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    }),
  ]);
  if (!location) notFound();
  const tabs = {
    overview: "Обзор",
    equipment: "Оборудование",
    incidents: "Инциденты",
    maintenance: "Обслуживание",
    network: "Сеть",
  };
  return (
    <>
      <PageHeader
        eyebrow={`ИНФРАСТРУКТУРА / ${location.code}`}
        title={location.name}
        description={`${location.address} · ${location.city}`}
      >
        <Badge value={location.active ? "ONLINE" : "CLOSED"}>
          {location.active ? "Действующий объект" : "Отключён"}
        </Badge>
      </PageHeader>
      {actor.role === "ADMIN" && (
        <FormPanel title="Редактировать объект">
          <LocationForm location={location} />
        </FormPanel>
      )}
      <Card>
        <nav className="tabs" aria-label="Разделы объекта">
          {Object.entries(tabs).map(([key, label]) => (
            <Link
              href={`/locations/${id}?tab=${key}`}
              key={key}
              className={tab === key ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        {tab === "equipment" ? (
          <>
            <SectionTitle
              title="Оборудование объекта"
              subtitle={`${devices.length} устройств`}
            />
            <EquipmentTable devices={devices} />
          </>
        ) : tab === "incidents" ? (
          <>
            <SectionTitle title="Инциденты объекта" />
            <IncidentTable incidents={incidents} />
          </>
        ) : tab === "maintenance" ? (
          <>
            <SectionTitle title="История обслуживания" />
            <MaintenanceList records={maintenance} />
          </>
        ) : tab === "network" ? (
          <>
            <SectionTitle
              title="Сетевая конфигурация"
              subtitle="Учебные данные · реальные сканирования не выполняются"
            />
            <dl className="info-grid">
              <Detail label="Подсеть">
                <span className="mono">{location.subnet}</span>
              </Detail>
              <Detail label="Шлюз">
                <span className="mono">{location.gateway}</span>
              </Detail>
              <Detail label="IP-устройств">
                {devices.filter((d) => d.ipAddress).length}
              </Detail>
            </dl>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>IP-адрес</th>
                    <th>Устройство</th>
                    <th>Тип</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id}>
                      <td className="mono">{d.ipAddress}</td>
                      <td>
                        <Link href={`/equipment/${d.id}`}>{d.name}</Link>
                      </td>
                      <td>{categories[d.category]}</td>
                      <td>
                        <Badge value={d.status}>
                          {deviceStatuses[d.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <SectionTitle title="Об объекте" />
            <dl className="info-grid">
              <Detail label="Код">
                <span className="mono">{location.code}</span>
              </Detail>
              <Detail label="Тип">{locationTypes[location.type]}</Detail>
              <Detail label="Контакт">{location.phone}</Detail>
              <Detail label="Оборудование">{devices.length} устройств</Detail>
              <Detail label="Активные инциденты">
                {
                  incidents.filter(
                    (i) =>
                      !["RESOLVED", "CLOSED", "CANCELLED"].includes(i.status),
                  ).length
                }
              </Detail>
              <Detail label="Последний завершённый выезд">
                {dateTime(visit?.completedAt)}
              </Detail>
            </dl>
            <SectionTitle title="Последние работы" />
            <MaintenanceList records={maintenance.slice(0, 4)} />
          </>
        )}
      </Card>
    </>
  );
}
