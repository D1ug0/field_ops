import Link from "next/link";
import { Building2, ArrowUpRight } from "lucide-react";
import { pageActor } from "@/lib/session";
import { listLocations } from "@/lib/queries";
import { locationTypes } from "@/lib/domain";
import {
  PageHeader,
  SectionTitle,
  FormPanel,
  Empty,
} from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocationMap } from "@/components/maps/location-map";
import { LocationForm } from "@/components/infrastructure-forms";
export default async function LocationsPage() {
  const actor = await pageActor();
  const locations = await listLocations(actor);
  return (
    <>
      <PageHeader
        eyebrow="FIELDOPS / ИНФРАСТРУКТУРА"
        title="Объекты сети"
        description={`${locations.length} объектов · магазины, склады, производство и офисы учебной сети.`}
      />
      {actor.role === "ADMIN" && (
        <FormPanel title="Добавить объект">
          <LocationForm />
        </FormPanel>
      )}
      <Card>
        <SectionTitle
          title="География обслуживания"
          subtitle="Нажмите на маркер, чтобы открыть карточку объекта"
        />
        <LocationMap
          locations={locations.map((l) => ({
            ...l,
            issues: l._count.incidents,
            critical: l.incidents.length,
            devices: l._count.devices,
          }))}
        />
      </Card>
      <div className="locations-grid">
        {locations.map((l) => (
          <Card className="location-card" key={l.id}>
            <div className="location-card-head">
              <span className="location-symbol">
                <Building2 size={19} />
              </span>
              <Badge
                value={
                  !l.active
                    ? "CLOSED"
                    : l.incidents.length
                      ? "P1_CRITICAL"
                      : l._count.incidents
                        ? "DEGRADED"
                        : "ONLINE"
                }
              >
                {!l.active
                  ? "Отключён"
                  : l.incidents.length
                    ? "Критический инцидент"
                    : l._count.incidents
                      ? "Есть инциденты"
                      : "Без инцидентов"}
              </Badge>
            </div>
            <Link href={`/locations/${l.id}`}>
              <h2>{l.name}</h2>
            </Link>
            <p>{l.address}</p>
            <p>
              {l.code} · {locationTypes[l.type]}
            </p>
            <div className="location-card-foot">
              <span>
                {l._count.devices} устройств · {l._count.incidents} инцидентов
              </span>
              <Link
                className="text-link"
                href={`/locations/${l.id}`}
                aria-label={`Открыть ${l.name}`}
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </Card>
        ))}
      </div>
      {!locations.length && <Empty title="Объекты не добавлены" />}
    </>
  );
}
