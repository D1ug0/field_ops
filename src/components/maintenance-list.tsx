import Link from "next/link";
import { dateTime } from "@/lib/utils";
import { maintenanceTypes } from "@/lib/domain";
import { Empty } from "./common";
import type { MaintenanceType } from "@/generated/prisma/enums";
type Record = {
  id: string;
  deviceId: string;
  type: MaintenanceType;
  description: string;
  result: string;
  performedAt: Date;
  engineer: { name: string };
  device?: { name: string };
};
export function MaintenanceList({ records }: { records: Record[] }) {
  if (!records.length)
    return (
      <Empty
        title="История обслуживания пуста"
        text="Результаты выполненных работ появятся после завершения выезда или решения инцидента."
      />
    );
  return (
    <div className="maintenance">
      {records.map((m) => (
        <article className="maintenance-item" key={m.id}>
          <div>
            <span>
              {maintenanceTypes[m.type]} · {m.engineer.name}
            </span>
            <time>{dateTime(m.performedAt)}</time>
          </div>
          {m.device && (
            <Link className="text-link mb-1" href={`/equipment/${m.deviceId}`}>
              {m.device.name}
            </Link>
          )}
          <h3>{m.description}</h3>
          <p>{m.result}</p>
        </article>
      ))}
    </div>
  );
}
