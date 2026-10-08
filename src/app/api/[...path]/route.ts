import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { apiActor } from "@/lib/session";
import { DomainError, statuses, type Actor } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  getIncident,
  listIncidents,
  listIncidentPage,
} from "@/lib/queries/incidents";
import {
  listDevices,
  listDevicePage,
  listIncidentDeviceOptions,
} from "@/lib/queries/devices";
import { listLocations } from "@/lib/queries/locations";
import { engineers } from "@/lib/queries/users";
import { listVisits } from "@/lib/queries/visits";
import { scope, normalizeFilters } from "@/lib/queries/filters";
import {
  addComment,
  assignIncident,
  createIncident,
  transitionIncident,
  updatePriority,
} from "@/lib/services/incidents";
import { changeVisit, scheduleVisit } from "@/lib/services/visits";
import {
  completeDiagnostics,
  recordStep,
  startDiagnostics,
} from "@/lib/services/diagnostics";
import {
  addMaintenance,
  saveDevice,
  saveLocation,
} from "@/lib/services/infrastructure";
import { incidentNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function read(
  actor: Actor,
  path: string[],
  req: NextRequest,
): Promise<unknown> {
  const [resource, id, nested] = path;
  if (path.length > 3) throw new DomainError("Маршрут не найден.", 404);
  const filters = normalizeFilters(
    Object.fromEntries(
      Array.from(req.nextUrl.searchParams.keys(), (key) => [
        key,
        req.nextUrl.searchParams.get(key),
      ]),
    ),
  );
  const paginated =
    req.nextUrl.searchParams.has("page") ||
    req.nextUrl.searchParams.has("pageSize");
  if (resource === "search" && !id) {
    const q = filters.q?.trim().slice(0, 100);
    if (!q || q.length < 2) return [];
    const [incidents, devices, locations] = await Promise.all([
      listIncidents(actor, { q }, 8),
      listDevices({ q }, 8),
      db.location.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
      }),
    ]);
    return [
      ...incidents.map((i) => ({
        id: i.id,
        label: `${incidentNumber(i.sequence)} · ${i.title}`,
        detail: i.location.name,
        href: `/incidents/${i.id}`,
      })),
      ...devices.map((d) => ({
        id: d.id,
        label: d.name,
        detail: `${d.assetTag} · ${d.ipAddress}`,
        href: `/equipment/${d.id}`,
      })),
      ...locations.map((l) => ({
        id: l.id,
        label: l.name,
        detail: `${l.code} · ${l.address}`,
        href: `/locations/${l.id}`,
      })),
    ];
  }
  if (resource === "incidents")
    return id
      ? getIncident(actor, id)
      : paginated
        ? listIncidentPage(actor, filters)
        : listIncidents(actor, filters);
  if (resource === "locations") {
    if (id && nested === "device-options") return listIncidentDeviceOptions(id);
    if (nested === "devices") {
      const input = { ...filters, location: id };
      return paginated ? listDevicePage(input) : listDevices(input);
    }
    const all = await listLocations(actor);
    return id ? (all.find((item) => item.id === id) ?? null) : all;
  }
  if (resource === "devices")
    return id
      ? db.device.findUnique({
          where: { id },
          include: {
            location: true,
            parent: true,
            children: true,
            maintenance: { include: { engineer: { select: { name: true } } } },
            incidents: { where: scope(actor) },
          },
        })
      : paginated
        ? listDevicePage(filters)
        : listDevices(filters);
  if (resource === "visits") return listVisits(actor);
  if (resource === "engineers") return engineers();
  if (resource === "diagnostic-templates")
    return db.diagnosticTemplate.findMany({
      include: { steps: { orderBy: { order: "asc" } } },
    });
  if (resource === "knowledge")
    return db.knowledgeArticle.findMany({
      where: filters.q
        ? { title: { contains: filters.q, mode: "insensitive" } }
        : {},
    });
  if (resource === "alerts")
    return db.alert.findMany({
      where: { resolvedAt: null },
      include: { device: true, location: true },
      orderBy: { createdAt: "desc" },
    });
  if (resource === "monitoring")
    return db.device.groupBy({ by: ["status"], _count: { _all: true } });
  throw new DomainError("Маршрут не найден.", 404);
}
async function mutate(
  actor: Actor,
  path: string[],
  input: unknown,
  method: string,
): Promise<unknown> {
  const [resource, id, action, stepId] = path;
  if (path.length > 4) throw new DomainError("Маршрут не найден.", 404);
  if (resource === "locations" && !action) {
    if (method === "POST" && !id) return saveLocation(actor, input);
    if (method === "PATCH" && id) return saveLocation(actor, input, id);
  }
  if (resource === "devices" && !action) {
    if (method === "POST" && !id) return saveDevice(actor, input);
    if (method === "PATCH" && id) return saveDevice(actor, input, id);
  }
  if (resource === "incidents") {
    if (id && !action && method === "PATCH")
      return updatePriority(actor, id, input);
    if (!id && method === "POST") return createIncident(actor, input);
    if (id && method === "POST") {
      if (action === "assign") return assignIncident(actor, id, input);
      if (action === "comments") return addComment(actor, id, input);
      if (action === "diagnostics") return startDiagnostics(actor, id, input);
      const actions: Record<string, keyof typeof statuses> = {
        triage: "TRIAGE",
        start: "IN_PROGRESS",
        arrive: "ON_SITE",
        wait: "WAITING",
        escalate: "ESCALATED",
        resolve: "RESOLVED",
        close: "CLOSED",
        cancel: "CANCELLED",
      };
      if (action in actions)
        return transitionIncident(actor, id, actions[action], input);
    }
  }
  if (resource === "visits" && method === "POST") {
    if (!id) return scheduleVisit(actor, input);
    const actions = {
      "start-travel": "TRAVELING",
      arrive: "ON_SITE",
      complete: "COMPLETED",
      cancel: "CANCELLED",
    } as const;
    if (action in actions)
      return changeVisit(
        actor,
        id,
        actions[action as keyof typeof actions],
        input,
      );
  }
  if (resource === "diagnostics" && id) {
    if (action === "steps" && stepId && method === "PATCH")
      return recordStep(actor, id, stepId, input);
    if (action === "complete" && method === "POST")
      return completeDiagnostics(actor, id, input);
  }
  if (resource === "maintenance" && !id && method === "POST")
    return addMaintenance(actor, input);
  throw new DomainError("Маршрут или метод не поддерживается.", 404);
}
async function handle(req: NextRequest, context: Context) {
  try {
    const actor = await apiActor();
    const { path } = await context.params;
    if (req.method === "GET") {
      const data = await read(actor, path, req);
      if (data === null) throw new DomainError("Запись не найдена.", 404);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    // Cookie authentication: mutations must originate from this application.
    const origin = req.headers.get("origin");
    const allowed = new Set([
      req.nextUrl.origin,
      ...(process.env.AUTH_URL ? [new URL(process.env.AUTH_URL).origin] : []),
    ]);
    if (!origin || !allowed.has(origin))
      throw new DomainError("Недопустимый источник запроса.", 403);
    let input: unknown;
    try {
      input = await req.json();
    } catch {
      throw new DomainError("Ожидается корректный JSON.");
    }
    return NextResponse.json(await mutate(actor, path, input, req.method));
  } catch (error) {
    if (error instanceof DomainError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002")
        return NextResponse.json(
          { error: "Запись с таким уникальным значением уже существует." },
          { status: 409 },
        );
      if (error.code === "P2025")
        return NextResponse.json(
          { error: "Запись не найдена." },
          { status: 404 },
        );
      if (error.code === "P2034")
        return NextResponse.json(
          { error: "Данные изменились параллельно. Повторите действие." },
          { status: 409 },
        );
    }
    console.error("FieldOps API error", error);
    return NextResponse.json(
      {
        error:
          "Не удалось выполнить действие. Проверьте подключение к базе и повторите.",
      },
      { status: 500 },
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
