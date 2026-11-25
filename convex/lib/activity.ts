import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

/**
 * Recent automation activity for one loan, as shown in the UI
 * ("Reminder sent 2 days ago"). Error text can contain internal details
 * (hostnames, workflow names), so only admins get it.
 */
export async function loadLoanActivity(
  ctx: QueryCtx,
  loanId: Id<"loans">,
  options: { includeErrors: boolean; limit?: number },
) {
  const rows = await ctx.db
    .query("automationEvents")
    .withIndex("by_loan", (q) => q.eq("loanId", loanId))
    .order("desc")
    .take(options.limit ?? 4);

  return rows.map((row) => ({
    id: row._id,
    kind: row.kind,
    event: row.event,
    status: row.status,
    attempts: row.attempts,
    at: row.updatedAt,
    nextAttemptAt: row.nextAttemptAt,
    error: options.includeErrors ? row.error : undefined,
  }));
}

export type LoanActivity = Awaited<ReturnType<typeof loadLoanActivity>>;
