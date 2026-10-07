import { db } from "@/lib/db";
import { listDevices } from "@/lib/queries/devices";
import { Wifi, WifiOff, TriangleAlert, Monitor } from "lucide-react";
import { PageHeader, Stat, SectionTitle } from "@/components/common";
import { Card } from "@/components/ui/card";
import { EquipmentTable } from "@/components/equipment-table";
import { Refresh } from "@/components/refresh";
export default async function MonitoringPage() {
  const [counts, devices] = await Promise.all([
    db.device.groupBy({ by: ["status"], _count: { _all: true } }),
    listDevices(),
  ]);
  const count = (status: string) =>
    counts.find((d) => d.status === status)?._count._all ?? 0;
  return (
    <>
      <PageHeader
        eyebrow="FIELDOPS / ИНФРАСТРУКТУРА"
        title="Мониторинг оборудования"
        description="Учебные состояния устройств из базы. Обновление страницы каждые 30 секунд; реальные проверки сети не выполняются."
      >
        <Refresh poll />
      </PageHeader>
      <div className="stats-grid">
        <Stat
          label="Всего оборудования"
          value={counts.reduce((total, item) => total + item._count._all, 0)}
          detail="Учётные устройства"
          icon={<Monitor size={17} />}
        />
        <Stat
          label="В сети"
          value={count("ONLINE")}
          detail="Демонстрационное состояние"
          icon={<Wifi size={17} />}
        />
        <Stat
          label="Со сбоем"
          value={count("DEGRADED")}
          detail="Требуют диагностики"
          icon={<TriangleAlert size={17} />}
          tone="amber"
        />
        <Stat
          label="Недоступно"
          value={count("OFFLINE")}
          detail="Учебная недоступность"
          icon={<WifiOff size={17} />}
          tone="red"
        />
      </div>
      <Card>
        <SectionTitle
          title="Оборудование, требующее внимания"
          subtitle="OFFLINE / DEGRADED / UNKNOWN"
        />
        <EquipmentTable
          devices={devices.filter((d) =>
            ["OFFLINE", "DEGRADED", "UNKNOWN"].includes(d.status),
          )}
        />
      </Card>
    </>
  );
}
