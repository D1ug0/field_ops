import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type {
  DeviceCategory,
  IncidentStatus,
  Priority,
  Role,
} from "../src/generated/prisma/enums";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function seed() {
  if (process.env.DEMO_ENABLED !== "true" || !process.env.DEMO_PASSWORD)
    throw new Error(
      "Seed requires DEMO_ENABLED=true and an explicit DEMO_PASSWORD. Demo data only.",
    );
  const passwordHash = await hash(process.env.DEMO_PASSWORD, 12);
  const accounts: [string, string, Role][] = [
    ["admin", "Алексей Волков", "ADMIN"],
    ["dispatcher", "Мария Белова", "DISPATCHER"],
    ["support", "Дмитрий Орлов", "SUPPORT_ENGINEER"],
    ["engineer", "Илья Соколов", "FIELD_ENGINEER"],
    ["viewer", "Анна Лебедева", "VIEWER"],
  ];
  for (const [id, name, role] of accounts)
    await db.user.upsert({
      where: { email: `${id}@fieldops.local` },
      update: {},
      create: {
        id: `user-${id}`,
        email: `${id}@fieldops.local`,
        name,
        role,
        passwordHash,
      },
    });
  const districts = [
    "Северный",
    "Центральный",
    "Речной",
    "Парковый",
    "Западный",
    "Восточный",
    "Озёрный",
    "Лесной",
    "Южный",
    "Вокзальный",
    "Солнечный",
    "Новый",
  ];
  const deviceProfiles: [DeviceCategory, string, string, string][] = [
    ["ROUTER", "ROUTER", "Generic", "Demo Edge 100"],
    ["SWITCH", "SWITCH", "Generic", "Demo Switch 24"],
    ["POS", "POS-01", "Generic", "Demo POS 200"],
    ["POS", "POS-02", "Generic", "Demo POS 200"],
    ["SCALE", "SCALE-03", "DIGI", "Demo Scale 500"],
    ["BARCODE_SCANNER", "SCANNER-03", "Generic", "Demo Scan 10"],
    ["RECEIPT_PRINTER", "PRINTER-03", "Generic", "Demo Print 80"],
    ["ACCESS_POINT", "AP-01", "Generic", "Demo Wi-Fi 6"],
    ["TSD", "TSD-01", "Generic", "Demo Mobile 30"],
  ];
  const now = new Date();
  for (let i = 1; i <= 16; i++) {
    const code = String(i).padStart(3, "0");
    const name =
      i <= 12
        ? `Маркет ${districts[i - 1]}`
        : i <= 14
          ? `Склад №${i - 12}`
          : i === 15
            ? "Производственный центр"
            : "Центральный офис";
    const locationId = `location-${code}`;
    await db.location.upsert({
      where: { id: locationId },
      update: {},
      create: {
        id: locationId,
        code: `FO-${code}`,
        name,
        type:
          i <= 12
            ? "STORE"
            : i <= 14
              ? "WAREHOUSE"
              : i === 15
                ? "PRODUCTION"
                : "OFFICE",
        address: `Демо-квартал ${code}, здание ${i + 10}`,
        city: "Амстердам · учебная сеть",
        latitude: 52.345 + (i % 4) * 0.019,
        longitude: 4.82 + Math.floor((i - 1) / 4) * 0.043,
        phone: `DEMO-${code}`,
        subnet: `10.${i}.20.0/24`,
        gateway: `10.${i}.20.1`,
      },
    });
    for (let j = 0; j < deviceProfiles.length; j++) {
      const [category, label, vendor, model] = deviceProfiles[j];
      const id = `device-${code}-${j}`;
      const status =
        i === 3
          ? "OFFLINE"
          : i <= 5 && j === 4
            ? "DEGRADED"
            : i === 7 && j === 5
              ? "OFFLINE"
              : "ONLINE";
      await db.device.upsert({
        where: { id },
        update: {},
        create: {
          id,
          assetTag: `FO-${code}-${String(j + 1).padStart(3, "0")}`,
          name: `${label} / ${code}`,
          category,
          vendor,
          model,
          serialNumber: `DEMO-SN-${code}-${j}`,
          locationId,
          parentId: j === 5 || j === 6 ? `device-${code}-2` : undefined,
          ipAddress: `10.${i}.20.${20 + j}`,
          macAddress: `02:00:00:${i.toString(16).padStart(2, "0")}:20:${j.toString(16).padStart(2, "0")}`,
          hostname: `demo-${code}-${label.toLowerCase()}`,
          status,
          lastSeenAt: new Date(
            now.getTime() - (status === "OFFLINE" ? 7200000 : 60000),
          ),
          installedAt: new Date("2026-01-15T09:00:00Z"),
          warrantyUntil: new Date("2028-01-15T09:00:00Z"),
          pluSyncStatus:
            category === "SCALE"
              ? status === "ONLINE"
                ? "OK"
                : "FAILED"
              : null,
          lastPluSyncAt:
            category === "SCALE" ? new Date(now.getTime() - 14400000) : null,
          printerStatus: category === "SCALE" ? "OK" : null,
          paperStatus: category === "SCALE" ? "OK" : null,
          scaleStatus: category === "SCALE" ? "OK" : null,
          firmwareVersion: category === "SCALE" ? "demo-1.2.0" : null,
          notes:
            "Вымышленное устройство. Сетевые адреса учебные, реальные запросы не выполняются.",
        },
      });
      if (status !== "ONLINE")
        await db.alert.upsert({
          where: { id: `alert-${id}` },
          update: {},
          create: {
            id: `alert-${id}`,
            deviceId: id,
            locationId,
            type: status === "OFFLINE" ? "CONNECTIVITY" : "PLU_SYNC",
            severity: status === "OFFLINE" ? "CRITICAL" : "WARNING",
            message:
              status === "OFFLINE"
                ? "Устройство не отвечает: демонстрационное состояние"
                : "Последняя синхронизация PLU завершилась ошибкой",
          },
        });
    }
  }
  const scenarios = [
    ["PLU не обновляются на торговых весах", 4],
    ["Чековый принтер не печатает", 6],
    ["Все кассы объекта недоступны", 2],
    ["Сканер штрихкодов не определяется", 5],
    ["Терминал сбора данных теряет Wi-Fi", 8],
    ["Весы не отвечают по сети", 4],
    ["На кассе отсутствует подключение к сети", 3],
    ["Ошибка печати этикеток", 4],
    ["Нестабильное соединение точки доступа", 7],
    ["Плановое обслуживание POS", 2],
    ["Рабочая станция не загружается", 3],
    ["Маршрутизатор недоступен", 0],
    ["Зависает очередь чекового принтера", 6],
    ["Требуется замена Ethernet-кабеля", 4],
    ["Не работает считывание штрихкодов", 5],
    ["Проверка коммутатора", 1],
    ["Весы пропускают новые товары", 4],
    ["Настройка беспроводной сети ТСД", 8],
    ["Профилактическая чистка принтера", 6],
    ["Восстановление конфигурации POS", 2],
  ] as const;
  const incidentStates: IncidentStatus[] = [
    "ASSIGNED",
    "IN_PROGRESS",
    "ON_SITE",
    "NEW",
    "ASSIGNED",
    "WAITING",
    "TRIAGE",
    "ESCALATED",
    "ASSIGNED",
    "NEW",
    "IN_PROGRESS",
    "TRIAGE",
    "RESOLVED",
    "CLOSED",
    "ASSIGNED",
    "NEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "CLOSED",
    "RESOLVED",
  ];
  const priorities: Priority[] = [
    "P3_MEDIUM",
    "P2_HIGH",
    "P1_CRITICAL",
    "P2_HIGH",
    "P3_MEDIUM",
    "P3_MEDIUM",
    "P2_HIGH",
    "P3_MEDIUM",
    "P3_MEDIUM",
    "P4_LOW",
  ];
  for (let i = 0; i < scenarios.length; i++) {
    const [title, deviceIndex] = scenarios[i];
    const code = String((i % 12) + 1).padStart(3, "0");
    const status = incidentStates[i];
    const assignedToId = ["NEW", "TRIAGE"].includes(status)
      ? null
      : "user-engineer";
    const createdAt = new Date(now.getTime() - (i + 1) * 3600000);
    await db.incident.upsert({
      where: { id: `incident-${i + 1}` },
      update: {},
      create: {
        id: `incident-${i + 1}`,
        title,
        description: `${title}. Сотрудник демо-объекта сообщил о проблеме. Необходимо проверить питание, локальные подключения и конфигурацию, зафиксировать результаты диагностики. Все сведения в заявке вымышлены.`,
        locationId: `location-${code}`,
        deviceId: `device-${code}-${deviceIndex}`,
        category: deviceProfiles[deviceIndex][0],
        priority: priorities[i % 10],
        status,
        createdById: "user-dispatcher",
        assignedToId,
        createdAt,
        assignedAt: assignedToId ? createdAt : null,
        startedAt: ["IN_PROGRESS", "ON_SITE", "RESOLVED", "CLOSED"].includes(
          status,
        )
          ? createdAt
          : null,
        resolution: ["RESOLVED", "CLOSED"].includes(status)
          ? "Соединение восстановлено. Контрольная проверка успешна."
          : null,
        rootCause: ["RESOLVED", "CLOSED"].includes(status) ? "CABLING" : null,
        resolvedAt: ["RESOLVED", "CLOSED"].includes(status)
          ? new Date(now.getTime() - 600000)
          : null,
        closedAt: status === "CLOSED" ? new Date(now.getTime() - 300000) : null,
        events: {
          create: [
            {
              actorId: "user-dispatcher",
              type: "CREATED",
              message: "Инцидент зарегистрирован диспетчером",
              createdAt,
            },
            ...(assignedToId
              ? [
                  {
                    actorId: "user-dispatcher",
                    type: "ASSIGNED",
                    message: "Назначен инженер Илья Соколов",
                    createdAt: new Date(createdAt.getTime() + 300000),
                  },
                ]
              : []),
          ],
        },
      },
    });
  }
  for (const i of [0, 1, 2, 4, 8, 14]) {
    const code = String((i % 12) + 1).padStart(3, "0");
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
    }).format(now);
    await db.serviceVisit.upsert({
      where: { id: `visit-${i}` },
      update: {},
      create: {
        id: `visit-${i}`,
        incidentId: `incident-${i + 1}`,
        engineerId: "user-engineer",
        locationId: `location-${code}`,
        scheduledAt: new Date(
          `${day}T${String(9 + (i % 7)).padStart(2, "0")}:30:00+03:00`,
        ),
        status: i === 2 ? "ON_SITE" : "PLANNED",
        arrivedAt: i === 2 ? now : null,
        travelNotes: "Позвонить ответственному сотруднику при прибытии.",
      },
    });
  }
  const templates = [
    {
      id: "template-plu",
      name: "Весы: ошибка синхронизации PLU",
      category: "SCALE" as const,
      steps: [
        "Проверить питание и Ethernet",
        "Проверить IP, маску и шлюз",
        "Зафиксировать результат учебного ping",
        "Сравнить работу других весов",
        "Проверить время последней PLU-синхронизации",
        "Проверить идентификатор устройства",
        "Проверить сервис синхронизации и журналы",
        "Определить необходимость эскалации",
      ],
    },
    {
      id: "template-network",
      name: "Устройство недоступно по сети",
      category: "ROUTER" as const,
      steps: [
        "Проверить питание",
        "Осмотреть Ethernet-кабель",
        "Проверить индикацию порта",
        "Сверить IP и подсеть",
        "Зафиксировать результат учебного ping",
        "Проверить шлюз и VLAN",
        "Проверить дублирующийся IP",
      ],
    },
    {
      id: "template-print",
      name: "Принтер: нет печати",
      category: "RECEIPT_PRINTER" as const,
      steps: [
        "Проверить расходные материалы",
        "Проверить крышку и тракт бумаги",
        "Проверить состояние датчиков",
        "Проверить подключение",
        "Проверить очередь печати",
        "Выполнить учебную тестовую печать",
        "Оценить необходимость аппаратного ремонта",
      ],
    },
  ];
  for (const t of templates)
    await db.diagnosticTemplate.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        name: t.name,
        category: t.category,
        description:
          "Учебный чек-лист. Проверки выполняются инженером вручную, приложение не обращается к оборудованию.",
        steps: {
          create: t.steps.map((title, order) => ({
            id: `${t.id}-${order}`,
            title,
            order,
            hint: "Запишите наблюдение, результат и проверенное значение. При недостатке данных отметьте шаг как пропущенный.",
          })),
        },
      },
    });
  for (let i = 1; i <= 16; i++)
    await db.maintenanceRecord.upsert({
      where: { id: `maintenance-${i}` },
      update: {},
      create: {
        id: `maintenance-${i}`,
        deviceId: `device-${String(i).padStart(3, "0")}-4`,
        engineerId: "user-engineer",
        type: i % 2 ? "NETWORK" : "PREVENTIVE",
        description:
          i % 2
            ? "Проверка Ethernet и исправление IP-конфигурации"
            : "Профилактическое обслуживание печатающего узла",
        result: "Контрольная проверка успешна. Устройство возвращено в работу.",
        performedAt: new Date(now.getTime() - i * 86400000),
      },
    });
  for (const t of templates)
    await db.knowledgeArticle.upsert({
      where: { id: `article-${t.id}` },
      update: {},
      create: {
        id: `article-${t.id}`,
        title: t.name,
        category: t.category,
        symptoms:
          "Оборудование включено, но одна из функций недоступна или работает нестабильно.",
        causes:
          "Ошибка локальной конфигурации; неисправное соединение; расходные материалы; сбой сервисного ПО.",
        steps: t.steps.join("\n"),
        resolution:
          "Устраните подтверждённую причину, выполните контрольную проверку и запишите результат в историю обслуживания.",
        escalation:
          "Несколько объектов затронуты одновременно; требуется серверный доступ; аппаратная неисправность или причина не подтверждена.",
      },
    });
  console.log(
    "Demo seed ready: 5 users, 16 locations, 144 devices, 20 incidents, 6 visits, 3 checklists. Existing data preserved.",
  );
}
seed()
  .finally(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
