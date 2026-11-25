import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { appError } from "./lib/errors";

/**
 * Creates or refreshes the caller's users row from their Clerk token.
 * Called by the client right after sign-in. New users always start as
 * role "user"; roles are changed only via the internal admin:setRole.
 */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw appError("UNAUTHENTICATED", "Please sign in to continue.");

    const email = (identity.email ?? "").trim().toLowerCase();
    const name = identity.name || identity.givenName || email.split("@")[0] || "Neighbour";

    const existing = await getCurrentUser(ctx);
    if (existing) {
      if (existing.name !== name || existing.email !== email) {
        await ctx.db.patch("users", existing._id, { name, email });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
      role: "user",
      trustedLender: false,
    });
  },
});

/** The caller's own profile. Null until store has run. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      role: user.role,
      trustedLender: user.trustedLender,
    };
  },
});
