/**
 * Demo data for local development: npx convex run seed:demo
 *
 * Internal, so it can't be called from the browser. It writes rows directly,
 * skipping the request rules, so it can create an overdue loan for testing
 * the reminder workflow. No notifications are queued for seeded loans.
 */
import { internalMutation } from "./_generated/server";
import { addDays, todayUtc } from "./lib/dates";

export const demo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", "demo|alice"))
      .unique();
    if (existing) return { skipped: "Demo data already exists." };

    const now = Date.now();
    const today = todayUtc();
    const addUser = (clerkId: string, name: string, email: string, trustedLender = false) =>
      ctx.db.insert("users", { clerkId, name, email, role: "user", trustedLender });

    const alice = await addUser("demo|alice", "Alice Lender", "alice@example.com", true);
    const bob = await addUser("demo|bob", "Bob Borrower", "bob@example.com");

    const addTool = (name: string, category: "Power tools" | "Garden" | "Ladders & access", condition: "good" | "fair") =>
      ctx.db.insert("tools", {
        ownerId: alice,
        name,
        category,
        condition,
        description: `Demo listing: ${name.toLowerCase()}.`,
        createdAt: now,
      });

    const drill = await addTool("Cordless drill", "Power tools", "good");
    const ladder = await addTool("Extension ladder", "Ladders & access", "fair");
    await addTool("Hedge trimmer", "Garden", "good");

    const overdueLoan = await ctx.db.insert("loans", {
      toolId: drill,
      toolName: "Cordless drill",
      borrowerId: bob,
      lenderId: alice,
      startDate: addDays(today, -7),
      endDate: addDays(today, -2),
      status: "approved",
      createdAt: now,
      updatedAt: now,
      decidedAt: now,
    });
    const pendingLoan = await ctx.db.insert("loans", {
      toolId: ladder,
      toolName: "Extension ladder",
      borrowerId: bob,
      lenderId: alice,
      startDate: addDays(today, 3),
      endDate: addDays(today, 5),
      status: "requested",
      createdAt: now,
      updatedAt: now,
    });
    return { alice, bob, overdueLoan, pendingLoan };
  },
});
