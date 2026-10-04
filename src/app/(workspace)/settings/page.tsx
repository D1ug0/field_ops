import { PageHeader, Detail, SectionTitle } from "@/components/common";
import { Card } from "@/components/ui/card";
export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Конфигурация рабочей среды"
        description="Параметры текущего MVP. Конфигурация задаётся через переменные окружения."
      />
      <Card>
        <SectionTitle title="Приложение" />
        <dl className="info-grid">
          <Detail label="Режим">
            {process.env.DEMO_ENABLED === "true"
              ? "Локальная демонстрация"
              : "Стандартный"}
          </Detail>
          <Detail label="Хранилище">PostgreSQL / Prisma</Detail>
          <Detail label="Время расписания">Europe/Moscow</Detail>
          <Detail label="Вход">Auth.js · email и пароль</Detail>
          <Detail label="Мониторинг">Учебные состояния · polling 30 с</Detail>
          <Detail label="AI-ассистент">Запланирован после основного MVP</Detail>
        </dl>
        <div className="description-block">
          Симулятор событий, редактирование пользователей и шаблонов, интеграция
          AI и офлайн-режим вынесены в следующие этапы разработки. Приложение не
          выполняет сетевые проверки оборудования.
        </div>
      </Card>
    </>
  );
}
