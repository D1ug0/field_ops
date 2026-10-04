import type {
  IncidentStatus,
  Role,
  VisitStatus,
} from "@/generated/prisma/enums";

export type Actor = { id: string; name: string; email: string; role: Role };
export const roles = {
  ADMIN: "Администратор",
  DISPATCHER: "Диспетчер",
  FIELD_ENGINEER: "Выездной инженер",
  SUPPORT_ENGINEER: "Инженер поддержки",
  VIEWER: "Наблюдатель",
};
export const statuses = {
  NEW: "Новый",
  TRIAGE: "Разбор",
  ASSIGNED: "Назначен",
  IN_PROGRESS: "В работе",
  ON_SITE: "На объекте",
  WAITING: "Ожидание",
  ESCALATED: "Эскалация",
  RESOLVED: "Решён",
  CLOSED: "Закрыт",
  CANCELLED: "Отменён",
};
export const priorities = {
  P1_CRITICAL: "P1 · Критический",
  P2_HIGH: "P2 · Высокий",
  P3_MEDIUM: "P3 · Средний",
  P4_LOW: "P4 · Низкий",
};
export const deviceStatuses = {
  ONLINE: "В сети",
  OFFLINE: "Недоступно",
  DEGRADED: "Сбой",
  MAINTENANCE: "Обслуживание",
  UNKNOWN: "Неизвестно",
  RETIRED: "Списано",
};
export const locationTypes = {
  STORE: "Магазин",
  WAREHOUSE: "Склад",
  PRODUCTION: "Производство",
  OFFICE: "Офис",
};
export const visitStatuses = {
  PLANNED: "Запланирован",
  TRAVELING: "В пути",
  ON_SITE: "На объекте",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};
export const categories = {
  POS: "Касса / POS",
  PC: "Рабочая станция",
  LAPTOP: "Ноутбук",
  SCALE: "Торговые весы",
  BARCODE_SCANNER: "Сканер штрихкодов",
  FISCAL_DEVICE: "Фискальный регистратор",
  RECEIPT_PRINTER: "Чековый принтер",
  OFFICE_PRINTER: "Офисный принтер",
  MFP: "МФУ",
  TSD: "Терминал сбора данных",
  SWITCH: "Коммутатор",
  ROUTER: "Маршрутизатор",
  ACCESS_POINT: "Точка доступа",
  IP_PHONE: "IP-телефон",
  CAMERA: "Камера",
  OTHER: "Другое",
};
export const maintenanceTypes = {
  DIAGNOSTIC: "Диагностика",
  REPAIR: "Ремонт",
  REPLACEMENT: "Замена",
  PREVENTIVE: "Профилактика",
  CONFIGURATION: "Настройка",
  CLEANING: "Чистка",
  SOFTWARE: "ПО",
  NETWORK: "Сеть",
};
export const rootCauses = {
  POWER: "Питание",
  CABLING: "Кабель",
  NETWORK: "Сеть",
  CONFIGURATION: "Конфигурация",
  DRIVER: "Драйвер",
  OPERATING_SYSTEM: "ОС",
  APPLICATION: "Приложение",
  DATABASE: "База данных",
  SERVER: "Сервер",
  HARDWARE: "Оборудование",
  USER_ERROR: "Ошибка пользователя",
  VENDOR: "Поставщик",
  UNKNOWN: "Не установлена",
};
export const stepStatuses = {
  PASS: "Пройдено",
  FAIL: "Ошибка",
  SKIPPED: "Пропущено",
  NOT_APPLICABLE: "Не применимо",
};
export const terminalStatuses: IncidentStatus[] = [
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];
export const activeStatuses = Object.keys(statuses).filter(
  (s) => !terminalStatuses.includes(s as IncidentStatus),
) as IncidentStatus[];
const transitions: Record<IncidentStatus, IncidentStatus[]> = {
  NEW: ["TRIAGE", "ASSIGNED", "CANCELLED"],
  TRIAGE: ["ASSIGNED", "ESCALATED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "ESCALATED", "CANCELLED"],
  IN_PROGRESS: ["ON_SITE", "WAITING", "ESCALATED", "RESOLVED"],
  ON_SITE: ["WAITING", "ESCALATED", "RESOLVED"],
  WAITING: ["IN_PROGRESS", "ESCALATED", "RESOLVED"],
  ESCALATED: ["ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function requireRole(actor: Actor, allowed: Role[]) {
  if (!allowed.includes(actor.role))
    throw new DomainError("Недостаточно прав для этого действия.", 403);
}
export function canManage(actor: Actor) {
  return ["ADMIN", "DISPATCHER"].includes(actor.role);
}
export function canWork(actor: Actor, assignedToId: string | null) {
  return (
    actor.role === "ADMIN" ||
    actor.role === "SUPPORT_ENGINEER" ||
    (actor.role === "FIELD_ENGINEER" && assignedToId === actor.id)
  );
}
export function assertIncidentAccess(
  actor: Actor,
  assignedToId: string | null,
) {
  if (actor.role === "FIELD_ENGINEER" && actor.id !== assignedToId)
    throw new DomainError("Инцидент не назначен вам.", 403);
}
export function assertTransition(from: IncidentStatus, to: IncidentStatus) {
  if (!transitions[from].includes(to))
    throw new DomainError(
      `Переход «${statuses[from]} → ${statuses[to]}» недоступен.`,
      409,
    );
}
export function nextStatuses(from: IncidentStatus) {
  return transitions[from];
}
export function assertVisitTransition(from: VisitStatus, to: VisitStatus) {
  const allowed: Record<VisitStatus, VisitStatus[]> = {
    PLANNED: ["TRAVELING", "CANCELLED"],
    TRAVELING: ["ON_SITE", "CANCELLED"],
    ON_SITE: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  if (!allowed[from].includes(to))
    throw new DomainError("Недопустимый переход статуса выезда.", 409);
}
