import { describe, expect, it } from "vitest";
import { computeSignature, signRequest, verifySignature } from "../convex/lib/hmac";

const SECRET = "test-secret-that-is-at-least-32-characters-long";
const BODY = JSON.stringify({ event: "loan.approved", loanId: "abc" });
const NOW = 1_780_000_000_000;

async function signed(body = BODY, nowMs = NOW) {
  const headers = await signRequest(SECRET, body, nowMs);
  return { timestamp: headers["X-LendLoop-Timestamp"], signature: headers["X-LendLoop-Signature"] };
}

describe("HMAC signing", () => {
  it("accepts a correctly signed request", async () => {
    const { timestamp, signature } = await signed();
    expect(await verifySignature({ secret: SECRET, timestamp, signature, rawBody: BODY, nowMs: NOW })).toEqual({ ok: true });
  });

  it("matches the documented scheme hex(HMAC_SHA256(secret, `${timestamp}.${body}`))", async () => {
    // Same value n8n's Code node computes with node:crypto.
    const { createHmac } = await import("node:crypto");
    const expected = createHmac("sha256", SECRET).update(`1780000000.${BODY}`).digest("hex");
    expect(await computeSignature(SECRET, "1780000000", BODY)).toBe(expected);
  });

  it("rejects a tampered body", async () => {
    const { timestamp, signature } = await signed();
    const tampered = BODY.replace("approved", "declined");
    expect(await verifySignature({ secret: SECRET, timestamp, signature, rawBody: tampered, nowMs: NOW })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a signature made with another secret", async () => {
    const headers = await signRequest("another-secret-that-is-also-32-characters", BODY, NOW);
    const result = await verifySignature({
      secret: SECRET,
      timestamp: headers["X-LendLoop-Timestamp"],
      signature: headers["X-LendLoop-Signature"],
      rawBody: BODY,
      nowMs: NOW,
    });
    expect(result).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a new timestamp reused with an old signature", async () => {
    const { signature } = await signed();
    const timestamp = String(NOW / 1000 + 10);
    expect(await verifySignature({ secret: SECRET, timestamp, signature, rawBody: BODY, nowMs: NOW })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects stale and future-dated requests", async () => {
    const { timestamp, signature } = await signed();
    const sixMinutes = 6 * 60 * 1000;
    for (const nowMs of [NOW + sixMinutes, NOW - sixMinutes]) {
      expect(await verifySignature({ secret: SECRET, timestamp, signature, rawBody: BODY, nowMs })).toEqual({
        ok: false,
        reason: "expired",
      });
    }
  });

  it("rejects missing or malformed headers", async () => {
    const { timestamp, signature } = await signed();
    const verify = (t: string | null, s: string | null) =>
      verifySignature({ secret: SECRET, timestamp: t, signature: s, rawBody: BODY, nowMs: NOW });
    expect(await verify(null, signature)).toEqual({ ok: false, reason: "missing_headers" });
    expect(await verify(timestamp, null)).toEqual({ ok: false, reason: "missing_headers" });
    expect(await verify("12abc", signature)).toEqual({ ok: false, reason: "bad_timestamp" });
    expect(await verify(timestamp, "not-hex")).toEqual({ ok: false, reason: "bad_signature" });
  });
});
