import { db } from "../db";
import { DomainError, canWork, terminalStatuses, type Actor } from "../domain";
import { note, stepInput, text } from "../validation";
import { event, writableIncident } from "./incidents";

export async function startDiagnostics(
  actor: Actor,
  incidentId: string,
  input: unknown,
) {
  const templateId = text.parse(
    (input as { templateId?: unknown })?.templateId,
  );
  return db.$transaction(
    async (tx) => {
      const incident = await writableIncident(tx, actor, incidentId);
      if (!canWork(actor, incident.assignedToId))
        throw new DomainError("Недостаточно прав для диагностики.", 403);
      if (terminalStatuses.includes(incident.status))
        throw new DomainError("Инцидент уже завершён.", 409);
      if (
        !(await tx.diagnosticTemplate.findUnique({ where: { id: templateId } }))
      )
        throw new DomainError("Шаблон не найден.", 404);
      if (
        await tx.diagnosticSession.count({
          where: { incidentId, engineerId: actor.id, completedAt: null },
        })
      )
        throw new DomainError("Завершите текущую диагностическую сессию.", 409);
      const session = await tx.diagnosticSession.create({
        data: { incidentId, templateId, engineerId: actor.id },
      });
      await event(
        tx,
        actor,
        incidentId,
        "DIAGNOSTIC_STARTED",
        "Диагностика начата",
      );
      return session;
    },
    { isolationLevel: "Serializable" },
  );
}
export async function recordStep(
  actor: Actor,
  sessionId: string,
  stepId: string,
  input: unknown,
) {
  const data = stepInput.parse(input);
  return db.$transaction(
    async (tx) => {
      const session = await tx.diagnosticSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) throw new DomainError("Сессия не найдена.", 404);
      const incident = await writableIncident(tx, actor, session.incidentId);
      if (
        !canWork(actor, incident.assignedToId) ||
        (actor.id !== session.engineerId && actor.role !== "ADMIN")
      )
        throw new DomainError("Диагностика принадлежит другому инженеру.", 403);
      if (session.completedAt || terminalStatuses.includes(incident.status))
        throw new DomainError("Диагностика или инцидент уже завершены.", 409);
      const step = await tx.diagnosticStep.findUnique({
        where: { id: stepId },
      });
      if (step?.templateId !== session.templateId)
        throw new DomainError("Шаг не входит в выбранный шаблон.");
      return tx.diagnosticStepResult.upsert({
        where: { sessionId_stepId: { sessionId, stepId } },
        update: data,
        create: { ...data, sessionId, stepId },
      });
    },
    { isolationLevel: "Serializable" },
  );
}
export async function completeDiagnostics(
  actor: Actor,
  sessionId: string,
  input: unknown,
) {
  const summary = note.parse((input as { summary?: unknown })?.summary);
  return db.$transaction(
    async (tx) => {
      const session = await tx.diagnosticSession.findUnique({
        where: { id: sessionId },
        include: { template: { include: { steps: true } }, results: true },
      });
      if (!session) throw new DomainError("Сессия не найдена.", 404);
      const incident = await writableIncident(tx, actor, session.incidentId);
      if (
        !canWork(actor, incident.assignedToId) ||
        (actor.id !== session.engineerId && actor.role !== "ADMIN")
      )
        throw new DomainError("Недостаточно прав.", 403);
      if (session.completedAt || terminalStatuses.includes(incident.status))
        throw new DomainError("Сессия или инцидент уже завершены.", 409);
      if (
        !session.template.steps.every((step) =>
          session.results.some((result) => result.stepId === step.id),
        )
      )
        throw new DomainError(
          "Зафиксируйте результат каждого шага, включая пропущенные и неприменимые.",
        );
      const changed = await tx.diagnosticSession.updateMany({
        where: { id: sessionId, completedAt: null },
        data: { summary, completedAt: new Date() },
      });
      if (!changed.count) throw new DomainError("Сессия уже завершена.", 409);
      await event(
        tx,
        actor,
        session.incidentId,
        "DIAGNOSTIC_COMPLETED",
        `Диагностика завершена: ${summary}`,
      );
      return { id: sessionId };
    },
    { isolationLevel: "Serializable" },
  );
}
