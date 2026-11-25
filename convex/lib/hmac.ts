/**
 * HMAC-SHA256 signing for every request between Convex and n8n.
 *
 *   signature = hex( HMAC_SHA256(secret, `${timestamp}.${rawBody}`) )
 *
 * `timestamp` is Unix time in seconds, sent as X-LendLoop-Timestamp. The
 * signature goes in X-LendLoop-Signature. Including the timestamp in the signed
 * string stops an attacker from reusing an old signature with a new timestamp,
 * and the freshness window limits how long a captured request can be replayed.
 *
 * Uses Web Crypto only, so the same file runs in the Convex runtime and in
 * Node (Vitest). The n8n Code nodes implement the same scheme with node:crypto.
 */

export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
export const SIGNATURE_HEADER = "X-LendLoop-Signature";
export const MAX_CLOCK_SKEW_SECONDS = 300;
export const MIN_SECRET_LENGTH = 32;

export type VerifyFailure = "missing_headers" | "bad_timestamp" | "expired" | "bad_signature";
export type VerifyResult = { ok: true } | { ok: false; reason: VerifyFailure };

const encoder = new TextEncoder();

function importKey(secret: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Parses a 64-character hex SHA-256 MAC. Returns null for anything else. */
function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export async function computeSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
): Promise<string> {
  const key = await importKey(secret, "sign");
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`));
  return toHex(new Uint8Array(mac));
}

/** Headers for an outgoing signed request. A new timestamp is used on every call, including retries. */
export async function signRequest(
  secret: string,
  rawBody: string,
  nowMs: number = Date.now(),
): Promise<Record<string, string>> {
  const timestamp = Math.floor(nowMs / 1000).toString();
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: await computeSignature(secret, timestamp, rawBody),
  };
}

export async function verifySignature(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowMs?: number;
  maxSkewSeconds?: number;
}): Promise<VerifyResult> {
  const { secret, timestamp, signature, rawBody } = input;
  const nowMs = input.nowMs ?? Date.now();
  const maxSkew = input.maxSkewSeconds ?? MAX_CLOCK_SKEW_SECONDS;

  if (!timestamp || !signature) return { ok: false, reason: "missing_headers" };
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "bad_timestamp" };
  // Reject both stale and future-dated requests.
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > maxSkew) return { ok: false, reason: "expired" };

  const expected = fromHex(signature);
  if (!expected) return { ok: false, reason: "bad_signature" };

  // subtle.verify does a constant-time comparison, so response timing does
  // not leak how many leading bytes of a guessed signature were right.
  const key = await importKey(secret, "verify");
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    expected,
    encoder.encode(`${timestamp}.${rawBody}`),
  );
  return valid ? { ok: true } : { ok: false, reason: "bad_signature" };
}
