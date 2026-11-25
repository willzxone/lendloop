import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { loadLoanActivity } from "./lib/activity";
import { requireAdmin } from "./lib/auth";
import { todayUtc } from "./lib/dates";
import { appError } from "./lib/errors";
import { roleValidator } from "./lib/validators";

const ADMIN_LIST_LIMIT = 200;

/**
 * Bootstrap and role changes. Internal, so it can only be run with deployment
 * credentials, e.g.:
 *   npx convex run admin:setRole '{"email":"you@example.com","role":"admin"}'
 * The user must have signed in once so their users row exists.
 */
export const setRole = internalMutation({
  args: { email: v.string(), role: roleValidator },
  handler: async (ctx, { email, role }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .unique();
    if (!user) throw new Error(`No user with email ${email}. Sign in once first, then retry.`);
    await ctx.db.patch("users", user._id, { role });
    return { userId: user._id, email: user.email, role };
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(ADMIN_LIST_LIMIT);
    return users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      trustedLender: user.trustedLender,
    }));
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user) throw appError("NOT_FOUND", "User not found.");
    await ctx.db.patch("users", userId, { trustedLender: trusted });
  },
});

export const listTools = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const tools = await ctx.db.query("tools").order("desc").take(ADMIN_LIST_LIMIT);
    return await Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get("users", tool.ownerId);
        return {
          id: tool._id,
          name: tool.name,
          category: tool.category,
          ownerName: owner?.name ?? "Unknown",
          createdAt: tool.createdAt,
        };
      }),
    );
  },
});

/** Every loan, newest first, with its automation activity (including error text). */
export const listLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = todayUtc();
    const loans = await ctx.db.query("loans").order("desc").take(ADMIN_LIST_LIMIT);
    return await Promise.all(
      loans.map(async (loan) => {
        const [borrower, lender, activity] = await Promise.all([
          ctx.db.get("users", loan.borrowerId),
          ctx.db.get("users", loan.lenderId),
          loadLoanActivity(ctx, loan._id, { includeErrors: true, limit: 3 }),
        ]);
        return {
          id: loan._id,
          toolName: loan.toolName,
          borrowerName: borrower?.name ?? "Unknown",
          lenderName: lender?.name ?? "Unknown",
          startDate: loan.startDate,
          endDate: loan.endDate,
          status: loan.status,
          overdue: loan.status === "approved" && loan.endDate < today,
          activity,
        };
      }),
    );
  },
});

/** Failed deliveries, failed reminders and n8n workflow errors. */
export const listAutomationFailures = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const failed = await ctx.db
      .query("automationEvents")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(50);
    return failed.map((row) => ({
      id: row._id,
      loanId: row.loanId,
      kind: row.kind,
      event: row.event,
      attempts: row.attempts,
      error: row.error,
      detail: row.detail,
      at: row.updatedAt,
      canRetry: row.kind === "notification",
    }));
  },
});

/** Re-queues a notification that ran out of attempts (e.g. after fixing a bad secret). */
export const retryNotification = mutation({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, { eventId }) => {
    await requireAdmin(ctx);
    const row = await ctx.db.get("automationEvents", eventId);
    if (!row || row.kind !== "notification") throw appError("NOT_FOUND", "Notification not found.");
    if (row.status !== "failed") throw appError("CONFLICT", "Only failed notifications can be retried.");
    await ctx.db.patch("automationEvents", eventId, {
      status: "pending",
      attempts: 0,
      error: undefined,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.notifications.deliver, { eventId });
  },
});
