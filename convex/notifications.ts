/**
 * Delivery of loan events to the n8n notification webhook.
 *
 * Flow: a loan mutation calls enqueueLoanEvent (lib/outbox.ts), which writes a
 * "pending" automationEvents row and schedules `deliver`. `deliver` claims an
 * attempt, POSTs a signed minimal payload to n8n, and records the result.
 * Retryable failures are rescheduled with exponential backoff until
 * MAX_DELIVERY_ATTEMPTS, then the row is marked "failed" (admins can retry it).
 */
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import type { LoanEvent, LoanStatus } from "./lib/constants";
import { getHmacSecret, getNotifyWebhookUrl, truncateError } from "./lib/config";
import { signRequest } from "./lib/hmac";
import { MAX_DELIVERY_ATTEMPTS, backoffDelayMs, isRetryableStatus } from "./lib/retry";

const REQUEST_TIMEOUT_MS = 10_000;

/** Who is told about each event. */
const RECIPIENT_ROLE: Record<LoanEvent, "lender" | "borrower"> = {
  "loan.requested": "lender",
  "loan.approved": "borrower",
  "loan.declined": "borrower",
  "loan.returned": "borrower",
};

/** The status the event announces (the loan may have moved on since). */
const STATUS_FOR_EVENT: Record<LoanEvent, LoanStatus> = {
  "loan.requested": "requested",
  "loan.approved": "approved",
  "loan.declined": "declined",
  "loan.returned": "returned",
};

const outcomeValidator = v.union(v.literal("sent"), v.literal("retry"), v.literal("failed"));
type Outcome = { outcome: "sent" | "retry" | "failed"; error?: string };

/**
 * Claims the next attempt and builds the payload. Returns null if the event
 * was already delivered or given up on, so a duplicate run does nothing.
 */
export const startAttempt = internalMutation({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, { eventId }) => {
    const row = await ctx.db.get("automationEvents", eventId);
    if (!row || row.kind !== "notification" || !row.event || !row.loanId) return null;
    if (row.status !== "pending" && row.status !== "retrying") return null;

    const fail = async (error: string) => {
      await ctx.db.patch("automationEvents", eventId, { status: "failed", error, updatedAt: Date.now() });
      return null;
    };

    const loan = await ctx.db.get("loans", row.loanId);
    if (!loan) return await fail("Loan no longer exists.");
    const role = RECIPIENT_ROLE[row.event];
    const recipient = await ctx.db.get("users", role === "lender" ? loan.lenderId : loan.borrowerId);
    if (!recipient?.email) return await fail("Recipient has no email address.");

    const attempt = row.attempts + 1;
    await ctx.db.patch("automationEvents", eventId, { attempts: attempt, updatedAt: Date.now() });

    // Only what the notification needs: no user ids, no tool description,
    // no details about the other party beyond the dates and tool name.
    const payload = {
      eventId,
      event: row.event,
      occurredAt: new Date(row.createdAt).toISOString(),
      loan: {
        id: loan._id,
        status: STATUS_FOR_EVENT[row.event],
        startDate: loan.startDate,
        endDate: loan.endDate,
        toolName: loan.toolName,
      },
      recipient: { name: recipient.name, email: recipient.email, role },
    };
    return { attempt, payload };
  },
});

export const finishAttempt = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    attempt: v.number(),
    outcome: outcomeValidator,
    error: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, attempt, outcome, error }) => {
    const now = Date.now();
    if (outcome === "sent") {
      await ctx.db.patch("automationEvents", eventId, {
        status: "sent",
        error: undefined,
        nextAttemptAt: undefined,
        updatedAt: now,
      });
      return;
    }
    if (outcome === "retry" && attempt < MAX_DELIVERY_ATTEMPTS) {
      const delay = backoffDelayMs(attempt);
      await ctx.db.patch("automationEvents", eventId, {
        status: "retrying",
        error,
        nextAttemptAt: now + delay,
        updatedAt: now,
      });
      await ctx.scheduler.runAfter(delay, internal.notifications.deliver, { eventId });
      return;
    }
    await ctx.db.patch("automationEvents", eventId, {
      status: "failed",
      error: outcome === "retry" ? `Gave up after ${attempt} attempts. Last error: ${error}` : error,
      nextAttemptAt: undefined,
      updatedAt: now,
    });
  },
});

export const deliver = internalAction({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, { eventId }) => {
    const claim = await ctx.runMutation(internal.notifications.startAttempt, { eventId });
    if (!claim) return;

    let result: Outcome;
    const url = getNotifyWebhookUrl();
    const secret = getHmacSecret();
    if (!url || !secret) {
      result = {
        outcome: "failed",
        error: "N8N_NOTIFY_WEBHOOK_URL or LENDLOOP_HMAC_SECRET is not set on the Convex deployment.",
      };
    } else {
      result = await postSigned(url, secret, claim.payload);
    }

    await ctx.runMutation(internal.notifications.finishAttempt, {
      eventId,
      attempt: claim.attempt,
      outcome: result.outcome,
      error: result.error ? truncateError(result.error) : undefined,
    });
  },
});

async function postSigned(url: string, secret: string, payload: unknown): Promise<Outcome> {
  const rawBody = JSON.stringify(payload);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await signRequest(secret, rawBody)) },
      body: rawBody,
      signal: controller.signal,
    });
    if (response.ok) return { outcome: "sent" };
    return {
      outcome: isRetryableStatus(response.status) ? "retry" : "failed",
      error: `n8n responded with HTTP ${response.status}.`,
    };
  } catch (err) {
    // Network errors and timeouts are transient as far as we can tell.
    const message = err instanceof Error ? err.message : String(err);
    return { outcome: "retry", error: `Could not reach n8n: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}
