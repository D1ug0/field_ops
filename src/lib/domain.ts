import {
  IncidentStatus,
  type DeviceCategory,
  type DeviceStatus,
  type LocationType,
  type MaintenanceType,
  type Priority,
  type Role,
  type StepStatus,
  type VisitStatus,
} from "@/generated/prisma/enums";

export type Actor = { id: string; name: string; email: string; role: Role };
export const roles = {
  ADMIN: "Администратор",
  DISPATCHER: "Диспетчер",
  FIELD_ENGINEER: "Выездной инженер",
  SUPPORT_ENGINEER: "Инженер поддержки",
  VIEWER: "Наблюдатель",
} satisfies Record<Role, string>;
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
} satisfies Record<IncidentStatus, string>;
export const priorities = {
  P1_CRITICAL: "P1 · Критический",
  P2_HIGH: "P2 · Высокий",
  P3_MEDIUM: "P3 · Средний",
  P4_LOW: "P4 · Низкий",
} satisfies Record<Priority, string>;
export const deviceStatuses = {
  ONLINE: "В сети",
  OFFLINE: "Недоступно",
  DEGRADED: "Сбой",
  MAINTENANCE: "Обслуживание",
  UNKNOWN: "Неизвестно",
  RETIRED: "Списано",
} satisfies Record<DeviceStatus, string>;
export const locationTypes = {
  STORE: "Магазин",
  WAREHOUSE: "Склад",
  PRODUCTION: "Производство",
  OFFICE: "Офис",
} satisfies Record<LocationType, string>;
export const visitStatuses = {
  PLANNED: "Запланирован",
  TRAVELING: "В пути",
  ON_SITE: "На объекте",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
} satisfies Record<VisitStatus, string>;
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
} satisfies Record<DeviceCategory, string>;
export const maintenanceTypes = {
  DIAGNOSTIC: "Диагностика",
  REPAIR: "Ремонт",
  REPLACEMENT: "Замена",
  PREVENTIVE: "Профилактика",
  CONFIGURATION: "Настройка",
  CLEANING: "Чистка",
  SOFTWARE: "ПО",
  NETWORK: "Сеть",
} satisfies Record<MaintenanceType, string>;
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
} satisfies Record<StepStatus, string>;
export const terminalStatuses: IncidentStatus[] = [
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];
export const activeStatuses = Object.values(IncidentStatus).filter(
  (status) => !terminalStatuses.includes(status),
);
const transitions: Readonly<Record<IncidentStatus, readonly IncidentStatus[]>> =
  {
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
const visitTransitions: Readonly<Record<VisitStatus, readonly VisitStatus[]>> =
  {
    PLANNED: ["TRAVELING", "CANCELLED"],
    TRAVELING: ["ON_SITE", "CANCELLED"],
    ON_SITE: ["COMPLETED"],
    COMPLETED: [],
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
  return [...transitions[from]];
}
export function assertVisitTransition(from: VisitStatus, to: VisitStatus) {
  if (!visitTransitions[from].includes(to))
    throw new DomainError("Недопустимый переход статуса выезда.", 409);
}
