/**
 * Parsers for the bodies n8n sends to our HTTP endpoints. A valid signature
 * proves who sent a request, not that its contents are well formed, so every
 * field is still checked here before it reaches a mutation.
 */
import { isIsoDate } from "./dates";

export type ReminderReport = {
  idempotencyKey: string;
  loanId: string;
  reminderDate: string;
  status: "sent" | "failed";
  channel: string;
  error?: string;
};

export type WorkflowErrorReport = {
  workflowId: string;
  workflowName: string;
  executionId: string;
  failedNode?: string;
  message: string;
  loanId?: string;
};

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_REMINDERS_PER_REQUEST = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : undefined;
}

/** Splits "<loanId>:<YYYY-MM-DD>". */
export function parseIdempotencyKey(key: string): { loanId: string; reminderDate: string } | null {
  const separator = key.lastIndexOf(":");
  if (separator <= 0) return null;
  const loanId = key.slice(0, separator);
  const reminderDate = key.slice(separator + 1);
  return isIsoDate(reminderDate) ? { loanId, reminderDate } : null;
}

export function parseReminderBatch(body: unknown): Parsed<ReminderReport[]> {
  if (!isRecord(body) || !Array.isArray(body.reminders)) {
    return { ok: false, error: "Expected { reminders: [...] }." };
  }
  if (body.reminders.length === 0 || body.reminders.length > MAX_REMINDERS_PER_REQUEST) {
    return { ok: false, error: `Send between 1 and ${MAX_REMINDERS_PER_REQUEST} reminders.` };
  }
  const reminders: ReminderReport[] = [];
  for (const [index, item] of body.reminders.entries()) {
    if (!isRecord(item)) return { ok: false, error: `reminders[${index}] is not an object.` };
    const idempotencyKey = str(item.idempotencyKey, 100);
    const loanId = str(item.loanId, 64);
    const parsedKey = idempotencyKey ? parseIdempotencyKey(idempotencyKey) : null;
    if (!idempotencyKey || !loanId || !parsedKey || parsedKey.loanId !== loanId) {
      return { ok: false, error: `reminders[${index}] needs idempotencyKey "<loanId>:<YYYY-MM-DD>" matching loanId.` };
    }
    if (item.status !== "sent" && item.status !== "failed") {
      return { ok: false, error: `reminders[${index}].status must be "sent" or "failed".` };
    }
    reminders.push({
      idempotencyKey,
      loanId,
      reminderDate: parsedKey.reminderDate,
      status: item.status,
      channel: str(item.channel, 32) ?? "unknown",
      error: str(item.error, 500),
    });
  }
  return { ok: true, value: reminders };
}

export function parseWorkflowError(body: unknown): Parsed<WorkflowErrorReport> {
  if (!isRecord(body)) return { ok: false, error: "Expected a JSON object." };
  const workflowId = str(body.workflowId, 64);
  const workflowName = str(body.workflowName, 200);
  const executionId = str(body.executionId, 64);
  const message = str(body.message, 2000);
  if (!workflowId || !workflowName || !executionId || !message) {
    return { ok: false, error: "workflowId, workflowName, executionId and message are required." };
  }
  return {
    ok: true,
    value: {
      workflowId,
      workflowName,
      executionId,
      message,
      failedNode: str(body.failedNode, 200),
      loanId: str(body.loanId, 64),
    },
  };
}
