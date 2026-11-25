/**
 * Authentication and role checks used at the top of every public function.
 * The browser never sends a role or user id; both come from the verified
 * Clerk token (ctx.auth) and the users table.
 */
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { appError } from "./errors";
import { canDecideLoan, canEditTool, canRemoveTool, canViewLoan, isAdmin } from "./permissions";

export async function getCurrentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw appError("UNAUTHENTICATED", "Please sign in to continue.");
  const user = await getCurrentUser(ctx);
  if (!user) {
    // Signed in with Clerk, but users.store has not run yet.
    throw appError("UNAUTHENTICATED", "Your account is still being set up. Please refresh.");
  }
  return user;
}

export async function requireAdmin(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!isAdmin(user)) throw appError("FORBIDDEN", "Only admins can do that.");
  return user;
}

async function getToolOrThrow(ctx: QueryCtx, toolId: Id<"tools">): Promise<Doc<"tools">> {
  const tool = await ctx.db.get("tools", toolId);
  if (!tool) throw appError("NOT_FOUND", "That listing no longer exists.");
  return tool;
}

async function getLoanOrThrow(ctx: QueryCtx, loanId: Id<"loans">): Promise<Doc<"loans">> {
  const loan = await ctx.db.get("loans", loanId);
  if (!loan) throw appError("NOT_FOUND", "That request no longer exists.");
  return loan;
}

/** Caller must own the tool (edit). */
export async function requireToolOwner(ctx: QueryCtx, toolId: Id<"tools">) {
  const user = await requireUser(ctx);
  const tool = await getToolOrThrow(ctx, toolId);
  if (!canEditTool(user, tool)) throw appError("FORBIDDEN", "You can only change your own listings.");
  return { user, tool };
}

/** Caller must own the tool or be an admin (remove). */
export async function requireToolOwnerOrAdmin(ctx: QueryCtx, toolId: Id<"tools">) {
  const user = await requireUser(ctx);
  const tool = await getToolOrThrow(ctx, toolId);
  if (!canRemoveTool(user, tool)) throw appError("FORBIDDEN", "You can only remove your own listings.");
  return { user, tool };
}

/** Caller must be the lender on the loan (approve, decline, mark returned). */
export async function requireLoanLender(ctx: QueryCtx, loanId: Id<"loans">) {
  const user = await requireUser(ctx);
  const loan = await getLoanOrThrow(ctx, loanId);
  if (!canDecideLoan(user, loan)) {
    throw appError("FORBIDDEN", "Only the owner of the tool can act on this request.");
  }
  return { user, loan };
}

/** Caller must be the borrower, the lender or an admin. */
export async function requireLoanViewer(ctx: QueryCtx, loanId: Id<"loans">) {
  const user = await requireUser(ctx);
  const loan = await getLoanOrThrow(ctx, loanId);
  if (!canViewLoan(user, loan)) throw appError("FORBIDDEN", "You can't view this loan.");
  return { user, loan };
}
