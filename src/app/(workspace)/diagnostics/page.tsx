import Link from "next/link";
import { db } from "@/lib/db";
import { categories } from "@/lib/domain";
import { PageHeader, Empty } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default async function DiagnosticsPage() {
  const templates = await db.diagnosticTemplate.findMany({
    include: { steps: { orderBy: { order: "asc" } } },
  });
  return (
    <>
      <PageHeader
        eyebrow="FIELDOPS / БАЗА ЗНАНИЙ"
        title="Шаблоны диагностики"
        description="Начните диагностическую сессию из карточки назначенного инцидента."
      />
      <div className="knowledge-grid">
        {templates.map((t) => (
          <Card key={t.id} className="article-card">
            <Badge value="ONLINE">{categories[t.category]}</Badge>
            <h2>{t.name}</h2>
            <p>{t.description}</p>
            <h3>{t.steps.length} шагов проверки</h3>
            <ol>
              {t.steps.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ol>
            <Link href="/my-work" className="text-link mt-6">
              Перейти к моей работе →
            </Link>
          </Card>
        ))}
      </div>
      {!templates.length && <Empty title="Шаблоны не добавлены" />}
    </>
  );
}
