import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { loadLoanActivity } from "./lib/activity";
import { requireLoanLender, requireUser } from "./lib/auth";
import { LIMITS, type LoanEvent, type LoanStatus } from "./lib/constants";
import { rangesOverlap, todayUtc } from "./lib/dates";
import { appError } from "./lib/errors";
import { canTransition, findBlockingLoan, validateLoanDates } from "./lib/loanRules";
import { enqueueLoanEvent } from "./lib/outbox";
import { shortName } from "./lib/people";

const MAX_LOANS_LISTED = 200;

/** Ask to borrow a tool for an inclusive date range. */
export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get("tools", toolId);
    if (!tool) throw appError("NOT_FOUND", "That listing no longer exists.");
    if (tool.ownerId === user._id) throw appError("INVALID_INPUT", "You can't borrow your own tool.");

    const range = { startDate, endDate };
    const dateError = validateLoanDates(range, todayUtc());
    if (dateError) throw appError("INVALID_INPUT", dateError);

    const approved = await ctx.db
      .query("loans")
      .withIndex("by_tool_and_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
      .collect();
    const blocking = findBlockingLoan(approved, range);
    if (blocking) {
      throw appError(
        "CONFLICT",
        `This tool is already booked from ${blocking.startDate} to ${blocking.endDate}. Please pick other dates.`,
      );
    }

    const myPending = await ctx.db
      .query("loans")
      .withIndex("by_borrower_and_status", (q) =>
        q.eq("borrowerId", user._id).eq("status", "requested"),
      )
      .collect();
    if (myPending.some((loan) => loan.toolId === toolId && rangesOverlap(loan, range))) {
      throw appError("CONFLICT", "You already have a pending request for this tool on these dates.");
    }
    if (myPending.length >= LIMITS.maxOpenRequestsPerBorrower) {
      throw appError(
        "CONFLICT",
        `You can have at most ${LIMITS.maxOpenRequestsPerBorrower} pending requests at a time.`,
      );
    }

    const now = Date.now();
    const loanId = await ctx.db.insert("loans", {
      toolId,
      toolName: tool.name,
      borrowerId: user._id,
      lenderId: tool.ownerId,
      startDate,
      endDate,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    });
    await enqueueLoanEvent(ctx, loanId, "loan.requested");
    return loanId;
  },
});

export const approve = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const { loan } = await requireLoanLender(ctx, loanId);
    assertTransition(loan, "approved");

    if (loan.endDate < todayUtc()) {
      throw appError("CONFLICT", "These dates have already passed. Decline the request instead.");
    }
    // Several pending requests can overlap; only one of them can be approved.
    const approved = await ctx.db
      .query("loans")
      .withIndex("by_tool_and_status", (q) => q.eq("toolId", loan.toolId).eq("status", "approved"))
      .collect();
    const blocking = findBlockingLoan(approved, loan);
    if (blocking) {
      throw appError(
        "CONFLICT",
        `You already approved a loan from ${blocking.startDate} to ${blocking.endDate} that overlaps these dates.`,
      );
    }

    await applyTransition(ctx, loan, "approved", "loan.approved", { decidedAt: Date.now() });
  },
});

export const decline = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const { loan } = await requireLoanLender(ctx, loanId);
    assertTransition(loan, "declined");
    await applyTransition(ctx, loan, "declined", "loan.declined", { decidedAt: Date.now() });
  },
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const { loan } = await requireLoanLender(ctx, loanId);
    assertTransition(loan, "returned");
    await applyTransition(ctx, loan, "returned", "loan.returned", { returnedAt: Date.now() });
  },
});

/** Loans where the caller is the borrower. */
export const myRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrower_and_status", (q) => q.eq("borrowerId", user._id))
      .take(MAX_LOANS_LISTED);
    return await toLoanViews(ctx, loans, "lender");
  },
});

/** Loans for the caller's tools. */
export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lender_and_status", (q) => q.eq("lenderId", user._id))
      .take(MAX_LOANS_LISTED);
    return await toLoanViews(ctx, loans, "borrower");
  },
});

function assertTransition(loan: Doc<"loans">, to: LoanStatus) {
  if (!canTransition(loan.status, to)) {
    throw appError("CONFLICT", `This request is already ${loan.status}.`);
  }
}

async function applyTransition(
  ctx: MutationCtx,
  loan: Doc<"loans">,
  status: LoanStatus,
  event: LoanEvent,
  extra: Partial<Pick<Doc<"loans">, "decidedAt" | "returnedAt">>,
) {
  await ctx.db.patch("loans", loan._id, { status, updatedAt: Date.now(), ...extra });
  await enqueueLoanEvent(ctx, loan._id, event);
}

/** Shapes loans for the UI. Each side sees the other party's short name only. */
async function toLoanViews(ctx: QueryCtx, loans: Doc<"loans">[], otherParty: "lender" | "borrower") {
  const today = todayUtc();
  const views = await Promise.all(
    loans.map(async (loan) => {
      const [other, tool, activity] = await Promise.all([
        ctx.db.get("users", otherParty === "lender" ? loan.lenderId : loan.borrowerId),
        ctx.db.get("tools", loan.toolId),
        loadLoanActivity(ctx, loan._id, { includeErrors: false }),
      ]);
      return {
        id: loan._id,
        toolName: loan.toolName,
        toolRemoved: tool === null,
        startDate: loan.startDate,
        endDate: loan.endDate,
        status: loan.status,
        createdAt: loan.createdAt,
        overdue: loan.status === "approved" && loan.endDate < today,
        otherParty: {
          name: other ? shortName(other.name) : "A former member",
          trustedLender: otherParty === "lender" ? (other?.trustedLender ?? false) : false,
        },
        activity,
      };
    }),
  );
  return views.sort((a, b) => b.createdAt - a.createdAt);
}
