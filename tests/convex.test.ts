/**
 * Runs the real Convex functions against convex-test's in-memory backend:
 * permissions, booking rules, the outbox, and the signed n8n endpoints.
 */
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { addDays, todayUtc } from "../convex/lib/dates";
import { signRequest } from "../convex/lib/hmac";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");
const SECRET = "test-secret-that-is-at-least-32-characters-long";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("LENDLOOP_HMAC_SECRET", SECRET);
  vi.stubEnv("N8N_NOTIFY_WEBHOOK_URL", "http://n8n.test/webhook/lendloop-notify");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** A backend with a lender (Alice, owns a drill), a borrower (Bob) and an admin. */
async function setup() {
  const t = convexTest(schema, modules);
  const alice = t.withIdentity({ subject: "user_alice", name: "Alice Lender", email: "alice@example.com" });
  const bob = t.withIdentity({ subject: "user_bob", name: "Bob Borrower", email: "bob@example.com" });
  const admin = t.withIdentity({ subject: "user_admin", name: "Ada Admin", email: "admin@example.com" });
  await alice.mutation(api.users.store, {});
  await bob.mutation(api.users.store, {});
  await admin.mutation(api.users.store, {});
  await t.mutation(internal.admin.setRole, { email: "admin@example.com", role: "admin" });

  const toolId = await alice.mutation(api.tools.create, {
    name: "Cordless drill",
    category: "Power tools",
    condition: "good",
    description: "18V, two batteries.",
  });
  const today = todayUtc();
  return { t, alice, bob, admin, toolId, today };
}

function outboxRows(t: ReturnType<typeof convexTest>) {
  return t.run((ctx) => ctx.db.query("automationEvents").collect());
}

/** Error text from a rejected Convex call. */
async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected the call to be rejected.");
}

describe("auth and roles", () => {
  it("rejects signed-out callers", async () => {
    const { t } = await setup();
    expect(await rejection(t.query(api.tools.browse, {}))).toMatch(/UNAUTHENTICATED/);
  });

  it("new users are never admins, and only admins can use admin functions", async () => {
    const { bob, admin } = await setup();
    expect((await bob.query(api.users.me, {}))?.role).toBe("user");
    expect(await rejection(bob.query(api.admin.listUsers, {}))).toMatch(/FORBIDDEN/);
    expect(await admin.query(api.admin.listUsers, {})).toHaveLength(3);
  });

  it("only the owner or an admin can edit or remove a listing", async () => {
    const { bob, admin, toolId } = await setup();
    const edit = { toolId, name: "Mine now", category: "Power tools" as const, condition: "good" as const, description: "" };
    expect(await rejection(bob.mutation(api.tools.update, edit))).toMatch(/FORBIDDEN/);
    expect(await rejection(bob.mutation(api.tools.remove, { toolId }))).toMatch(/FORBIDDEN/);
    await admin.mutation(api.tools.remove, { toolId });
    expect(await admin.query(api.admin.listTools, {})).toHaveLength(0);
  });

  it("the public list exposes no owner or id fields", async () => {
    const { t } = await setup();
    const tools = await t.query(api.tools.listPublic, {});
    expect(tools).toEqual([{ name: "Cordless drill", category: "Power tools" }]);
  });

  it("the public list hides tools that are out on loan today", async () => {
    const { t, alice, bob, toolId, today } = await setup();
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: today });
    await alice.mutation(api.loans.approve, { loanId });
    expect(await t.query(api.tools.listPublic, {})).toEqual([]);
  });
});

describe("borrowing", () => {
  it("runs request -> approve -> returned, and only the lender can decide", async () => {
    const { alice, bob, toolId, today } = await setup();
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: addDays(today, 2) });

    expect(await rejection(bob.mutation(api.loans.approve, { loanId }))).toMatch(/FORBIDDEN/);
    await alice.mutation(api.loans.approve, { loanId });
    expect(await rejection(alice.mutation(api.loans.decline, { loanId }))).toMatch(/already approved/);
    await alice.mutation(api.loans.markReturned, { loanId });

    const [loan] = await bob.query(api.loans.myRequests, {});
    expect(loan.status).toBe("returned");
    expect(loan.otherParty).toEqual({ name: "Alice L.", trustedLender: false });
  });

  it("rejects borrowing your own tool and past dates", async () => {
    const { alice, bob, toolId, today } = await setup();
    expect(await rejection(alice.mutation(api.loans.request, { toolId, startDate: today, endDate: today }))).toMatch(/own tool/);
    // One day of grace is allowed for time zones behind UTC; two days is too far.
    const twoDaysAgo = addDays(today, -2);
    expect(await rejection(bob.mutation(api.loans.request, { toolId, startDate: twoDaysAgo, endDate: today }))).toMatch(/past/);
  });

  it("blocks requests and approvals that overlap an approved loan", async () => {
    const { t, alice, bob, toolId, today } = await setup();
    const carol = t.withIdentity({ subject: "user_carol", name: "Carol", email: "carol@example.com" });
    await carol.mutation(api.users.store, {});

    const first = await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: addDays(today, 3) });
    const second = await carol.mutation(api.loans.request, { toolId, startDate: addDays(today, 2), endDate: addDays(today, 4) });
    await alice.mutation(api.loans.approve, { loanId: first });

    expect(await rejection(alice.mutation(api.loans.approve, { loanId: second }))).toMatch(/overlaps/);
    expect(
      await rejection(carol.mutation(api.loans.request, { toolId, startDate: addDays(today, 1), endDate: addDays(today, 1) })),
    ).toMatch(/already booked/);
    // Days after the approved loan are still free.
    await bob.mutation(api.loans.request, { toolId, startDate: addDays(today, 4), endDate: addDays(today, 5) });
  });
});

describe("notification outbox", () => {
  it("writes one outbox row per loan event in the same transaction", async () => {
    const { t, alice, bob, toolId, today } = await setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", { status: 200 })));
    const loanId = await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: today });
    await alice.mutation(api.loans.decline, { loanId });

    const rows = await outboxRows(t);
    expect(rows.map((row) => [row.event, row.status])).toEqual([
      ["loan.requested", "pending"],
      ["loan.declined", "pending"],
    ]);
  });

  it("sends a signed, minimal payload and marks the row sent", async () => {
    const { t, bob, toolId, today } = await setup();
    const fetchMock = vi.fn(async (...args: [string, RequestInit]) => {
      void args;
      return new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: today });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://n8n.test/webhook/lendloop-notify");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-LendLoop-Signature"]).toMatch(/^[0-9a-f]{64}$/);

    const body = JSON.parse(init.body as string);
    expect(body.event).toBe("loan.requested");
    expect(body.recipient).toEqual({ name: "Alice Lender", email: "alice@example.com", role: "lender" });
    // Only the recipient's contact details are sent: nothing about the borrower, no user ids.
    expect(JSON.stringify(body)).not.toContain("Bob");
    expect(JSON.stringify(body)).not.toContain("bob@example.com");
    expect(Object.keys(body.loan).sort()).toEqual(["endDate", "id", "startDate", "status", "toolName"]);

    const [row] = await outboxRows(t);
    expect(row.status).toBe("sent");
    expect(row.attempts).toBe(1);
  });

  it("retries 5xx responses with backoff, then gives up", async () => {
    const { t, bob, toolId, today } = await setup();
    const fetchMock = vi.fn(async () => new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: today });
    vi.runOnlyPendingTimers(); // start the first delivery attempt only
    await t.finishInProgressScheduledFunctions();
    let [row] = await outboxRows(t);
    expect(row.status).toBe("retrying");
    expect(row.nextAttemptAt).toBeGreaterThan(Date.now());

    await t.finishAllScheduledFunctions(vi.runAllTimers);
    [row] = await outboxRows(t);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(row.status).toBe("failed");
    expect(row.error).toContain("Gave up after 5 attempts");
  });

  it("does not retry a 401 from n8n", async () => {
    const { t, bob, toolId, today } = await setup();
    const fetchMock = vi.fn(async () => new Response("bad signature", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: today });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const [row] = await outboxRows(t);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(row.status).toBe("failed");
  });

  it("borrowers see activity without internal error text; admins see the error", async () => {
    const { t, bob, admin, toolId, today } = await setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 400 })));
    await bob.mutation(api.loans.request, { toolId, startDate: today, endDate: today });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const [mine] = await bob.query(api.loans.myRequests, {});
    expect(mine.activity[0]).toMatchObject({ status: "failed" });
    expect(mine.activity[0].error).toBeUndefined();

    const failures = await admin.query(api.admin.listAutomationFailures, {});
    expect(failures[0].error).toContain("HTTP 400");
  });
});

describe("signed n8n endpoints", () => {
  async function signedPost(t: ReturnType<typeof convexTest>, path: string, payload: unknown) {
    const rawBody = JSON.stringify(payload);
    return t.fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await signRequest(SECRET, rawBody)) },
      body: rawBody,
    });
  }

  async function overdueLoan() {
    const ctx = await setup();
    const loanId: Id<"loans"> = await ctx.t.run(async (db) => {
      const users = await db.db.query("users").collect();
      const alice = users.find((u) => u.email === "alice@example.com")!;
      const bob = users.find((u) => u.email === "bob@example.com")!;
      return db.db.insert("loans", {
        toolId: ctx.toolId,
        toolName: "Cordless drill",
        borrowerId: bob._id,
        lenderId: alice._id,
        startDate: addDays(ctx.today, -5),
        endDate: addDays(ctx.today, -2),
        status: "approved",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    return { ...ctx, loanId };
  }

  it("rejects unsigned and tampered requests", async () => {
    const { t } = await setup();
    const unsigned = await t.fetch("/n8n/overdue-loans", { method: "GET" });
    expect(unsigned.status).toBe(401);

    const rawBody = JSON.stringify({ reminders: [] });
    const headers = await signRequest(SECRET, rawBody);
    const tampered = await t.fetch("/n8n/reminders", {
      method: "POST",
      headers,
      body: JSON.stringify({ reminders: [{}] }),
    });
    expect(tampered.status).toBe(401);
  });

  it("returns overdue loans with an idempotency key per loan per day", async () => {
    const { t, loanId, today } = await overdueLoan();
    const headers = await signRequest(SECRET, "");
    const response = await t.fetch("/n8n/overdue-loans", { method: "GET", headers });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.loans).toHaveLength(1);
    expect(body.loans[0]).toMatchObject({
      loanId,
      idempotencyKey: `${loanId}:${today}`,
      daysOverdue: 2,
      borrower: { name: "Bob Borrower", email: "bob@example.com" },
    });
  });

  it("a duplicate reminder write-back does not create a second row", async () => {
    const { t, loanId, today } = await overdueLoan();
    const report = {
      reminders: [{ idempotencyKey: `${loanId}:${today}`, loanId, reminderDate: today, status: "sent", channel: "email" }],
    };

    const first = await signedPost(t, "/n8n/reminders", report);
    const second = await signedPost(t, "/n8n/reminders", report);
    expect((await first.json()).results[0].outcome).toBe("created");
    expect((await second.json()).results[0].outcome).toBe("duplicate");

    const reminders = await t.run((ctx) => ctx.db.query("reminders").collect());
    expect(reminders).toHaveLength(1);

    // Already reminded today, so the next poll skips this loan.
    const headers = await signRequest(SECRET, "");
    const overdue = await (await t.fetch("/n8n/overdue-loans", { method: "GET", headers })).json();
    expect(overdue.loans).toHaveLength(0);
  });

  it("a later success upgrades a failed reminder, but not the other way round", async () => {
    const { t, loanId, today } = await overdueLoan();
    const item = { idempotencyKey: `${loanId}:${today}`, loanId, reminderDate: today, channel: "email" };

    await signedPost(t, "/n8n/reminders", { reminders: [{ ...item, status: "failed", error: "SMTP timeout" }] });
    const upgraded = await signedPost(t, "/n8n/reminders", { reminders: [{ ...item, status: "sent" }] });
    expect((await upgraded.json()).results[0].outcome).toBe("updated");
    const downgraded = await signedPost(t, "/n8n/reminders", { reminders: [{ ...item, status: "failed" }] });
    expect((await downgraded.json()).results[0].outcome).toBe("duplicate");

    const reminders = await t.run((ctx) => ctx.db.query("reminders").collect());
    expect(reminders.map((r) => r.status)).toEqual(["sent"]);
  });

  it("records n8n workflow errors once per execution", async () => {
    const { t, admin } = await setup();
    const report = { workflowId: "wf1", workflowName: "LendLoop overdue reminders", executionId: "42", failedNode: "Send email", message: "SMTP refused" };
    await signedPost(t, "/n8n/automation-errors", report);
    await signedPost(t, "/n8n/automation-errors", report);
    const failures = await admin.query(api.admin.listAutomationFailures, {});
    expect(failures).toHaveLength(1);
    expect(failures[0].kind).toBe("workflow_error");
  });

  it("returns 503 when the secret is not configured", async () => {
    const { t } = await setup();
    vi.stubEnv("LENDLOOP_HMAC_SECRET", "");
    const response = await t.fetch("/n8n/overdue-loans", { method: "GET" });
    expect(response.status).toBe(503);
  });
});
