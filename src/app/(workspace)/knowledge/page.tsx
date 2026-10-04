import { db } from "@/lib/db";
import { categories } from "@/lib/domain";
import { PageHeader, Field, Empty } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const articles = await db.knowledgeArticle.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { symptoms: { contains: q, mode: "insensitive" } },
            { steps: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
  });
  return (
    <>
      <PageHeader
        eyebrow="FIELDOPS / БАЗА ЗНАНИЙ"
        title="База знаний"
        description="Обобщённые учебные инструкции по диагностике. Проверки выполняет инженер вручную."
      />
      <Card className="mb-5">
        <form className="filter-bar">
          <Field label="Поиск по инструкциям">
            <input
              name="q"
              defaultValue={q}
              placeholder="Например, PLU, сеть, принтер…"
            />
          </Field>
          <Button type="submit">Найти</Button>
        </form>
      </Card>
      <div className="knowledge-grid">
        {articles.map((a) => (
          <Card className="article-card" key={a.id}>
            <Badge value="ONLINE">
              {categories[a.category as keyof typeof categories] ?? a.category}
            </Badge>
            <h2>{a.title}</h2>
            <h3>Симптомы</h3>
            <p>{a.symptoms}</p>
            <h3>Возможные причины</h3>
            <p>{a.causes}</p>
            <h3>Порядок диагностики</h3>
            <ol>
              {a.steps.split("\n").map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            <h3>Решение</h3>
            <p>{a.resolution}</p>
            <h3>Когда эскалировать</h3>
            <p>{a.escalation}</p>
          </Card>
        ))}
      </div>
      {!articles.length && <Empty title="Инструкции не найдены" />}
    </>
  );
}
