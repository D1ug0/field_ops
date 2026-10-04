import Link from "next/link";
import type { listDevices } from "@/lib/queries";
import { categories, deviceStatuses } from "@/lib/domain";
import { Badge } from "./ui/badge";
import { Empty } from "./common";
export function EquipmentTable({
  devices,
}: {
  devices: Awaited<ReturnType<typeof listDevices>>;
}) {
  return devices.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Оборудование</th>
            <th>Категория</th>
            <th>Объект</th>
            <th>IP-адрес</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id}>
              <td>
                <Link className="row-title" href={`/equipment/${d.id}`}>
                  <strong>{d.name}</strong>
                </Link>
                <span className="row-subtitle">
                  {d.vendor} · {d.model} ·{" "}
                  <span className="mono">{d.assetTag}</span>
                </span>
              </td>
              <td>{categories[d.category]}</td>
              <td>
                <Link href={`/locations/${d.locationId}`}>
                  {d.location.name}
                </Link>
              </td>
              <td className="mono muted">{d.ipAddress || "—"}</td>
              <td>
                <Badge value={d.status}>{deviceStatuses[d.status]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title="Оборудование не найдено" />
  );
}
