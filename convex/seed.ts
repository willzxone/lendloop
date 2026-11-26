/**
 * Demo data: npx convex run seed:demo (add --prod for the live deployment).
 *
 * Internal, so it can't be called from the browser. It writes rows directly,
 * skipping the request rules, so it can create an overdue loan for testing
 * the reminder workflow. Five neighbours, twelve listings and loans in every
 * state, so the board and the admin views have something to show.
 *
 * The pending ladder request queues a "loan.requested" notification like a
 * real request would, so the notification workflow can be tried without
 * signing in. Running it twice does nothing the second time.
 */
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import type { LoanStatus, ToolCategory, ToolCondition } from "./lib/constants";
import { addDays, todayUtc } from "./lib/dates";
import { enqueueLoanEvent } from "./lib/outbox";

const DAY_MS = 86_400_000;

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
    const daysAgo = (days: number) => now - days * DAY_MS;

    const addUser = (clerkId: string, name: string, email: string, trustedLender = false) =>
      ctx.db.insert("users", { clerkId, name, email, role: "user", trustedLender });

    const alice = await addUser("demo|alice", "Alice Lender", "alice@example.com", true);
    const bob = await addUser("demo|bob", "Bob Borrower", "bob@example.com");
    const priya = await addUser("demo|priya", "Priya Shah", "priya@example.com", true);
    const tom = await addUser("demo|tom", "Tom Okafor", "tom@example.com");
    const maria = await addUser("demo|maria", "Maria Lopez", "maria@example.com");

    const addTool = (
      ownerId: Id<"users">,
      name: string,
      category: ToolCategory,
      condition: ToolCondition,
      description: string,
      listedDaysAgo: number,
    ) =>
      ctx.db.insert("tools", { ownerId, name, category, condition, description, createdAt: daysAgo(listedDaysAgo) });

    const drill = await addTool(alice, "Cordless drill", "Power tools", "good", "18V drill with two batteries, the charger and a basic bit set.", 30);
    const ladder = await addTool(alice, "Extension ladder", "Ladders & access", "fair", "Aluminium, reaches about 6 m. The feet are scuffed but it's solid. Easier to carry with two people.", 28);
    await addTool(alice, "Hedge trimmer", "Garden", "good", "Electric, 55 cm blade, 10 m cable. You'll need an extension lead for the far end of most gardens.", 21);
    const washer = await addTool(priya, "Pressure washer", "Cleaning", "good", "1800W with the patio cleaner attachment. Please empty the water out before bringing it back.", 26);
    const sander = await addTool(priya, "Orbital sander", "Power tools", "new", "Random orbit sander, bought last month. Comes with about 20 discs in 80 and 120 grit.", 9);
    await addTool(priya, "Wallpaper steamer", "Painting & decorating", "good", "Takes around 10 minutes to heat up. Both plates included.", 14);
    const sockets = await addTool(tom, "Socket set", "Hand tools", "good", "94 pieces, metric and imperial, in a carry case. A couple of the tiny sockets are missing.", 19);
    await addTool(tom, "Step ladder", "Ladders & access", "good", "Five treads, folds flat. Fine for ceilings and bungalow gutters.", 12);
    await addTool(tom, "Tile cutter", "Hand tools", "fair", "Manual cutter for tiles up to 60 cm. Spare wheel in the box.", 5);
    const tent = await addTool(maria, "4-person tent", "Outdoor & camping", "good", "Goes up in about 10 minutes. Pegs, groundsheet and mallet are in the bag.", 17);
    await addTool(maria, "Lawn aerator", "Garden", "fair", "Manual hollow-tine aerator. Hard work, but it does the job.", 8);
    await addTool(maria, "Folding tables", "Other", "good", "Two 6 ft trestle tables. Handy for parties and car boot sales.", 3);

    const addLoan = (
      toolId: Id<"tools">,
      toolName: string,
      borrowerId: Id<"users">,
      lenderId: Id<"users">,
      startOffset: number,
      endOffset: number,
      status: LoanStatus,
      requestedDaysAgo: number,
    ) => {
      const createdAt = daysAgo(requestedDaysAgo);
      const decidedAt = status === "requested" ? undefined : createdAt + DAY_MS / 4;
      return ctx.db.insert("loans", {
        toolId,
        toolName,
        borrowerId,
        lenderId,
        startDate: addDays(today, startOffset),
        endDate: addDays(today, endOffset),
        status,
        createdAt,
        updatedAt: decidedAt ?? createdAt,
        decidedAt,
        returnedAt: status === "returned" ? daysAgo(-endOffset) : undefined,
      });
    };

    // Overdue: ended two days ago and not marked returned, so the reminder workflow picks it up.
    const overdueLoan = await addLoan(drill, "Cordless drill", bob, alice, -7, -2, "approved", 9);
    // Waiting for Alice's answer.
    const pendingLoan = await addLoan(ladder, "Extension ladder", bob, alice, 3, 5, "requested", 0);
    // Out on loan right now, and one booked for next week.
    await addLoan(sockets, "Socket set", maria, tom, -1, 2, "approved", 3);
    await addLoan(tent, "4-person tent", priya, maria, 6, 9, "approved", 2);
    // History.
    await addLoan(washer, "Pressure washer", tom, priya, -21, -19, "returned", 24);
    await addLoan(sander, "Orbital sander", bob, priya, 1, 2, "declined", 1);

    await enqueueLoanEvent(ctx, pendingLoan, "loan.requested");
    return { users: 5, tools: 12, loans: 6, overdueLoan, pendingLoan };
  },
});
