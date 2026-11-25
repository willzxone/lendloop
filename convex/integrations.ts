/**
 * Internal functions behind the n8n HTTP endpoints in http.ts. They are not
 * callable from the browser; http.ts only reaches them after the request
 * signature has been verified.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { truncateError } from "./lib/config";
import { daysBetween } from "./lib/dates";
import { reminderStatusValidator } from "./lib/validators";

const MAX_OVERDUE_LOANS = 500;

function reminderKey(loanId: string, date: string) {
  return `${loanId}:${date}`;
}

/**
 * Approved loans whose end date is before `today`, minus any that already have
 * a sent reminder for today. Running the n8n workflow twice in one day
 * therefore does not email anyone twice.
 */
export const overdueLoans = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_and_endDate", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(MAX_OVERDUE_LOANS);

    const results = [];
    for (const loan of loans) {
      const idempotencyKey = reminderKey(loan._id, today);
      const existing = await ctx.db
        .query("reminders")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
        .unique();
      if (existing?.status === "sent") continue;

      const borrower = await ctx.db.get("users", loan.borrowerId);
      if (!borrower?.email) continue;

      // Only what a reminder needs: who to remind, which tool, which dates.
      results.push({
        loanId: loan._id,
        idempotencyKey,
        toolName: loan.toolName,
        startDate: loan.startDate,
        endDate: loan.endDate,
        daysOverdue: daysBetween(loan.endDate, today),
        borrower: { id: borrower._id, name: borrower.name, email: borrower.email },
      });
    }
    return { asOf: today, loans: results };
  },
});

/**
 * Idempotent write-back from the reminder workflow. The reminders table holds
 * at most one row per idempotency key (`loanId:date`). A repeated report is a
 * no-op; the only allowed change is upgrading "failed" to "sent" when a later
 * attempt on the same day succeeds.
 */
export const recordReminders = internalMutation({
  args: {
    reminders: v.array(
      v.object({
        idempotencyKey: v.string(),
        loanId: v.string(),
        reminderDate: v.string(),
        status: reminderStatusValidator,
        channel: v.string(),
        error: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { reminders }) => {
    const results = [];
    for (const report of reminders) {
      const loanId = ctx.db.normalizeId("loans", report.loanId);
      const loan = loanId ? await ctx.db.get("loans", loanId) : null;
      if (!loan) {
        results.push({ idempotencyKey: report.idempotencyKey, outcome: "rejected", reason: "unknown loan" });
        continue;
      }

      const existing = await ctx.db
        .query("reminders")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", report.idempotencyKey))
        .unique();

      let outcome: "created" | "updated" | "duplicate";
      const now = Date.now();
      if (!existing) {
        await ctx.db.insert("reminders", {
          idempotencyKey: report.idempotencyKey,
          loanId: loan._id,
          borrowerId: loan.borrowerId,
          reminderDate: report.reminderDate,
          status: report.status,
          channel: report.channel,
          createdAt: now,
          updatedAt: now,
        });
        outcome = "created";
      } else if (existing.status === "failed" && report.status === "sent") {
        await ctx.db.patch("reminders", existing._id, {
          status: "sent",
          channel: report.channel,
          updatedAt: now,
        });
        outcome = "updated";
      } else {
        outcome = "duplicate";
      }

      if (outcome !== "duplicate") {
        await ctx.db.insert("automationEvents", {
          loanId: loan._id,
          kind: "reminder",
          status: report.status,
          attempts: 1,
          detail: `channel: ${report.channel}`,
          error: report.error ? truncateError(report.error) : undefined,
          dedupeKey: `reminder:${report.idempotencyKey}:${report.status}`,
          createdAt: now,
          updatedAt: now,
        });
      }
      results.push({ idempotencyKey: report.idempotencyKey, outcome });
    }
    return results;
  },
});

/** Records a failed n8n execution reported by the error workflow. Idempotent per execution. */
export const recordWorkflowError = internalMutation({
  args: {
    workflowId: v.string(),
    workflowName: v.string(),
    executionId: v.string(),
    failedNode: v.optional(v.string()),
    message: v.string(),
    loanId: v.optional(v.string()),
  },
  handler: async (ctx, report) => {
    const dedupeKey = `n8n-error:${report.workflowId}:${report.executionId}`;
    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", dedupeKey))
      .first();
    if (existing) return { outcome: "duplicate" as const };

    const loanId = report.loanId ? ctx.db.normalizeId("loans", report.loanId) : null;
    const now = Date.now();
    await ctx.db.insert("automationEvents", {
      loanId: loanId ?? undefined,
      kind: "workflow_error",
      status: "failed",
      attempts: 0,
      error: truncateError(report.message),
      detail: `${report.workflowName} / ${report.failedNode ?? "unknown node"} / execution ${report.executionId}`,
      dedupeKey,
      createdAt: now,
      updatedAt: now,
    });
    return { outcome: "created" as const };
  },
});
