import { pageActor } from "@/lib/session";
import { db } from "@/lib/db";
import { roles } from "@/lib/domain";
import { notFound } from "next/navigation";
import { PageHeader, SectionTitle } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default async function UsersPage() {
  const actor = await pageActor();
  if (actor.role !== "ADMIN") notFound();
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageHeader
        title="Пользователи"
        description="Учётные записи и роли. Управление аккаунтами через интерфейс — следующий этап."
      />
      <Card>
        <SectionTitle
          title="Сотрудники"
          subtitle={`${users.length} учётных записей`}
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Состояние</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="mono">{u.email}</td>
                  <td>{roles[u.role]}</td>
                  <td>
                    <Badge value={u.active ? "ONLINE" : "CLOSED"}>
                      {u.active ? "Активен" : "Отключён"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
