#!/usr/bin/env node
/**
 * End-to-end checks against the local stack: Convex (npx convex dev), n8n and
 * Mailpit (docker compose up). Run after `npx convex run seed:demo`.
 *
 *   npm run verify:e2e
 *
 * Reads the HMAC secret from n8n/.env and the Convex site URL from .env.local.
 * It writes to the local deployment only (one reminder row for a demo loan).
 */
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

function readEnvFile(path) {
  const values = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

const n8nEnv = readEnvFile("n8n/.env");
const appEnv = readEnvFile(".env.local");
const SECRET = n8nEnv.LENDLOOP_HMAC_SECRET;
const CONVEX_SITE = appEnv.NEXT_PUBLIC_CONVEX_SITE_URL ?? "http://127.0.0.1:3211";
const N8N_WEBHOOK = "http://localhost:5678/webhook/lendloop-notify";

if (!SECRET) {
  console.error("LENDLOOP_HMAC_SECRET is missing from n8n/.env");
  process.exit(1);
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
const sign = (timestamp, body, secret = SECRET) =>
  createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

function signedHeaders(body, { timestamp = nowSeconds(), secret } = {}) {
  return {
    "Content-Type": "application/json",
    "X-LendLoop-Timestamp": String(timestamp),
    "X-LendLoop-Signature": sign(timestamp, body, secret),
  };
}

async function call(url, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(url, { method, headers, body });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON; keep the text
  }
  return { status: response.status, json, text };
}

function convexData(table) {
  const out = execFileSync("npx", ["convex", "data", table, "--format", "jsonl", "--limit", "1000"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return out
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line));
}

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}

// ---- Convex HTTP endpoints -------------------------------------------------

const overdueUrl = `${CONVEX_SITE}/n8n/overdue-loans`;

await check("Convex rejects an unsigned request", async () => {
  const { status } = await call(overdueUrl);
  expect(status === 401, `expected 401, got ${status}`);
  return `GET /n8n/overdue-loans -> ${status}`;
});

await check("Convex rejects a signature made with the wrong secret", async () => {
  const { status } = await call(overdueUrl, { headers: signedHeaders("", { secret: "x".repeat(64) }) });
  expect(status === 401, `expected 401, got ${status}`);
  return `-> ${status}`;
});

await check("Convex rejects a stale timestamp (replay)", async () => {
  const { status } = await call(overdueUrl, { headers: signedHeaders("", { timestamp: nowSeconds() - 600 }) });
  expect(status === 401, `expected 401, got ${status}`);
  return `10 minutes old -> ${status}`;
});

await check("Convex rejects a tampered write-back body", async () => {
  const body = JSON.stringify({ reminders: [] });
  const headers = signedHeaders(body);
  const tampered = JSON.stringify({ reminders: [{ injected: true }] });
  const { status } = await call(`${CONVEX_SITE}/n8n/reminders`, { method: "POST", headers, body: tampered });
  expect(status === 401, `expected 401, got ${status}`);
  return `POST /n8n/reminders -> ${status}`;
});

await check("Convex accepts a correctly signed request", async () => {
  const { status, json } = await call(overdueUrl, { headers: signedHeaders("") });
  expect(status === 200 && Array.isArray(json?.loans), `expected 200 with loans, got ${status}`);
  return `-> ${status}, ${json.loans.length} overdue loan(s) still to remind today`;
});

// ---- n8n notification webhook ----------------------------------------------

const event = {
  eventId: `verify-${randomUUID()}`,
  event: "loan.approved",
  occurredAt: new Date().toISOString(),
  loan: { id: "verify", status: "approved", startDate: "2026-12-01", endDate: "2026-12-02", toolName: "Test tool" },
  recipient: { name: "Verify Script", email: "verify@example.com", role: "borrower" },
};
const eventBody = JSON.stringify(event);

await check("n8n rejects an unsigned request", async () => {
  const { status } = await call(N8N_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: eventBody,
  });
  expect(status === 401, `expected 401, got ${status}`);
  return `-> ${status}`;
});

await check("n8n rejects a tampered body", async () => {
  const headers = signedHeaders(eventBody);
  const tampered = eventBody.replace("verify@example.com", "attacker@example.com");
  const { status } = await call(N8N_WEBHOOK, { method: "POST", headers, body: tampered });
  expect(status === 401, `expected 401, got ${status}`);
  return `-> ${status}`;
});

await check("n8n accepts a correctly signed request and sends the email", async () => {
  const { status, json } = await call(N8N_WEBHOOK, { method: "POST", headers: signedHeaders(eventBody), body: eventBody });
  expect(status === 200 && json?.ok === true && !json.duplicate, `expected 200 {ok:true}, got ${status} ${JSON.stringify(json)}`);
  const inbox = await call("http://localhost:8025/api/v1/search?query=to:verify@example.com");
  const found = inbox.json?.messages?.some((message) => message.Subject === "Approved: Test tool");
  expect(found, "email not found in Mailpit");
  return `-> ${status}, email delivered to Mailpit`;
});

await check("n8n does not email twice when Convex retries the same event", async () => {
  const { status, json } = await call(N8N_WEBHOOK, { method: "POST", headers: signedHeaders(eventBody), body: eventBody });
  expect(status === 200 && json?.duplicate === true, `expected 200 {duplicate:true}, got ${status} ${JSON.stringify(json)}`);
  return `-> ${status} ${JSON.stringify(json)}`;
});

// ---- Idempotent reminder write-back ----------------------------------------

await check("A repeated reminder write-back does not create a second row", async () => {
  const loan = convexData("loans").find((row) => row.status === "approved");
  expect(loan, "no approved loan found; run `npx convex run seed:demo` first");
  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `${loan._id}:${today}`;
  const body = JSON.stringify({
    reminders: [{ idempotencyKey, loanId: loan._id, status: "sent", channel: "email" }],
  });

  const outcomes = [];
  for (let i = 0; i < 2; i += 1) {
    const { status, json } = await call(`${CONVEX_SITE}/n8n/reminders`, {
      method: "POST",
      headers: signedHeaders(body),
      body,
    });
    expect(status === 200, `write-back ${i + 1} returned ${status}`);
    outcomes.push(json.results[0].outcome);
  }
  const rows = convexData("reminders").filter((row) => row.idempotencyKey === idempotencyKey);
  expect(outcomes[1] === "duplicate", `second write-back outcome was ${outcomes[1]}`);
  expect(rows.length === 1, `expected 1 reminder row, found ${rows.length}`);
  return `outcomes ${outcomes.join(" then ")}, ${rows.length} row for ${idempotencyKey}`;
});

// ---- Report -------------------------------------------------------------------

for (const { name, ok, detail } of results) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `: ${detail}` : ""}`);
}
const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
