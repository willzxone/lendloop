import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireToolOwner, requireToolOwnerOrAdmin, requireUser } from "./lib/auth";
import { LIMITS } from "./lib/constants";
import { todayUtc } from "./lib/dates";
import { appError } from "./lib/errors";
import { isOutOnLoan } from "./lib/loanRules";
import { enqueueLoanEvent } from "./lib/outbox";
import { shortName } from "./lib/people";
import { isAdmin } from "./lib/permissions";
import { categoryValidator, conditionValidator } from "./lib/validators";

const MAX_TOOLS_LISTED = 500;

/** Requested and approved loans for a tool: the only ones that affect availability. */
async function openLoans(ctx: QueryCtx, toolId: Id<"tools">) {
  const [requested, approved] = await Promise.all(
    (["requested", "approved"] as const).map((status) =>
      ctx.db
        .query("loans")
        .withIndex("by_tool_and_status", (q) => q.eq("toolId", toolId).eq("status", status))
        .collect(),
    ),
  );
  return { requested, approved };
}

function cleanToolInput(input: { name: string; description: string }) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < LIMITS.toolNameMin || name.length > LIMITS.toolNameMax) {
    throw appError(
      "INVALID_INPUT",
      `The name must be ${LIMITS.toolNameMin}–${LIMITS.toolNameMax} characters.`,
    );
  }
  if (description.length > LIMITS.descriptionMax) {
    throw appError("INVALID_INPUT", `The description can be at most ${LIMITS.descriptionMax} characters.`);
  }
  return { name, description };
}

/**
 * Public, unauthenticated list for the landing page. Returns name, category
 * and availability only: no ids, owners, descriptions or dates.
 */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const today = todayUtc();
    const tools = await ctx.db.query("tools").order("desc").take(MAX_TOOLS_LISTED);
    return await Promise.all(
      tools.map(async (tool) => {
        const { approved } = await openLoans(ctx, tool._id);
        return { name: tool.name, category: tool.category, available: !isOutOnLoan(approved, today) };
      }),
    );
  },
});

/** Signed-in browse view, optionally filtered by category. */
export const browse = query({
  args: { category: v.optional(categoryValidator) },
  handler: async (ctx, { category }) => {
    const user = await requireUser(ctx);
    const today = todayUtc();
    const tools = category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", category))
          .order("desc")
          .take(MAX_TOOLS_LISTED)
      : await ctx.db.query("tools").order("desc").take(MAX_TOOLS_LISTED);

    return await Promise.all(
      tools.map(async (tool) => {
        const [owner, { requested, approved }] = await Promise.all([
          ctx.db.get("users", tool.ownerId),
          openLoans(ctx, tool._id),
        ]);
        return {
          id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          isMine: tool.ownerId === user._id,
          owner: {
            name: owner ? shortName(owner.name) : "A neighbour",
            trustedLender: owner?.trustedLender ?? false,
          },
          available: !isOutOnLoan(approved, today),
          // Approved bookings that have not ended, so borrowers can pick free dates.
          booked: approved
            .filter((loan) => loan.endDate >= today)
            .map((loan) => ({ startDate: loan.startDate, endDate: loan.endDate }))
            .sort((a, b) => a.startDate.localeCompare(b.startDate)),
          myPendingRequests: requested.filter((loan) => loan.borrowerId === user._id).length,
        };
      }),
    );
  },
});

/** The caller's own listings. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const today = todayUtc();
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      tools.map(async (tool) => {
        const { requested, approved } = await openLoans(ctx, tool._id);
        return {
          id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          createdAt: tool.createdAt,
          available: !isOutOnLoan(approved, today),
          pendingRequests: requested.length,
          approvedLoans: approved.length,
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const { name, description } = cleanToolInput(args);
    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name,
      category: args.category,
      condition: args.condition,
      description,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, { toolId, ...args }) => {
    await requireToolOwner(ctx, toolId);
    const { name, description } = cleanToolInput(args);
    await ctx.db.patch("tools", toolId, {
      name,
      category: args.category,
      condition: args.condition,
      description,
    });
  },
});

/**
 * Owners remove their own listings; admins can remove any listing.
 * Pending requests are declined (and the borrowers notified). An owner cannot
 * remove a tool with an approved loan until it is marked returned. An admin
 * can (moderation); the loan keeps its own copy of the tool name.
 */
export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const { user } = await requireToolOwnerOrAdmin(ctx, toolId);
    const { requested, approved } = await openLoans(ctx, toolId);

    if (approved.length > 0 && !isAdmin(user)) {
      throw appError(
        "CONFLICT",
        "This tool has an approved loan. Mark it returned before removing the listing.",
      );
    }

    const now = Date.now();
    for (const loan of requested) {
      await ctx.db.patch("loans", loan._id, { status: "declined", decidedAt: now, updatedAt: now });
      await enqueueLoanEvent(ctx, loan._id, "loan.declined");
    }
    await ctx.db.delete("tools", toolId);
  },
});
