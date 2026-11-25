import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { LoanEvent } from "./constants";

/**
 * Transactional outbox. Called inside the same mutation that changes the loan,
 * so the loan change, the outbox row and the scheduled delivery either all
 * commit or none do. The HTTP call to n8n happens later in an action
 * (notifications.deliver), outside the transaction.
 */
export async function enqueueLoanEvent(ctx: MutationCtx, loanId: Id<"loans">, event: LoanEvent) {
  const now = Date.now();
  const eventId = await ctx.db.insert("automationEvents", {
    loanId,
    kind: "notification",
    event,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver, { eventId });
  return eventId;
}
