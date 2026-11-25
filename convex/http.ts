/**
 * HTTP endpoints called by n8n. Every request must carry a valid
 * X-LendLoop-Timestamp / X-LendLoop-Signature pair (see lib/hmac.ts).
 *
 *   GET  /n8n/overdue-loans      overdue loans that still need today's reminder
 *   POST /n8n/reminders          idempotent reminder write-back
 *   POST /n8n/automation-errors  failures reported by the n8n error workflow
 */
import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction, type ActionCtx } from "./_generated/server";
import { getHmacSecret } from "./lib/config";
import { todayUtc } from "./lib/dates";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from "./lib/hmac";
import { parseReminderBatch, parseWorkflowError } from "./lib/n8nPayloads";

const MAX_BODY_BYTES = 64 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Wraps a handler with signature verification. The signature is checked
 * against the raw body text before it is parsed, because re-serialising
 * parsed JSON would not reproduce the exact bytes that were signed.
 */
function signedEndpoint(handler: (ctx: ActionCtx, body: unknown) => Promise<Response>) {
  return httpAction(async (ctx, request) => {
    const secret = getHmacSecret();
    if (!secret) {
      console.error("LENDLOOP_HMAC_SECRET is missing or shorter than 32 characters.");
      return json({ error: "not_configured" }, 503);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return json({ error: "payload_too_large" }, 413);
    }

    const result = await verifySignature({
      secret,
      timestamp: request.headers.get(TIMESTAMP_HEADER),
      signature: request.headers.get(SIGNATURE_HEADER),
      rawBody,
    });
    if (!result.ok) {
      // The reason is logged for us but not returned, so callers can't probe.
      console.warn(`Rejected ${request.method} ${new URL(request.url).pathname}: ${result.reason}`);
      return json({ error: "invalid_signature" }, 401);
    }

    let body: unknown = null;
    if (rawBody.length > 0) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
    }
    return handler(ctx, body);
  });
}

const http = httpRouter();

http.route({
  path: "/n8n/overdue-loans",
  method: "GET",
  handler: signedEndpoint(async (ctx) => {
    const result = await ctx.runQuery(internal.integrations.overdueLoans, { today: todayUtc() });
    return json(result);
  }),
});

http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const parsed = parseReminderBatch(body);
    if (!parsed.ok) return json({ error: "invalid_body", detail: parsed.error }, 400);
    const results = await ctx.runMutation(internal.integrations.recordReminders, {
      reminders: parsed.value,
    });
    return json({ results });
  }),
});

http.route({
  path: "/n8n/automation-errors",
  method: "POST",
  handler: signedEndpoint(async (ctx, body) => {
    const parsed = parseWorkflowError(body);
    if (!parsed.ok) return json({ error: "invalid_body", detail: parsed.error }, 400);
    const result = await ctx.runMutation(internal.integrations.recordWorkflowError, parsed.value);
    return json(result);
  }),
});

export default http;
