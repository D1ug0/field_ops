import Link from "next/link";
import { db } from "@/lib/db";
import { dateTime } from "@/lib/utils";
import { PageHeader, SectionTitle, Empty } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Refresh } from "@/components/refresh";
export default async function AlertsPage() {
  const alerts = await db.alert.findMany({
    where: { resolvedAt: null },
    include: { device: true, location: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader
        title="Оповещения"
        description="Демонстрационные сигналы инфраструктуры. Автоматический сбор телеметрии запланирован на следующую фазу."
      >
        <Refresh poll />
      </PageHeader>
      <Card>
        <SectionTitle
          title="Активные оповещения"
          subtitle={`${alerts.length} сигналов`}
        />
        {alerts.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Важность</th>
                  <th>Сообщение</th>
                  <th>Устройство / объект</th>
                  <th>Создано</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Badge value={a.severity}>
                        {a.severity === "CRITICAL"
                          ? "Критический"
                          : "Предупреждение"}
                      </Badge>
                    </td>
                    <td>{a.message}</td>
                    <td>
                      <Link
                        className="row-title"
                        href={`/equipment/${a.deviceId}`}
                      >
                        <strong>{a.device.name}</strong>
                      </Link>
                      <span className="row-subtitle">{a.location.name}</span>
                    </td>
                    <td className="muted nowrap">{dateTime(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Активных оповещений нет" />
        )}
      </Card>
    </>
  );
}
