import { MIN_SECRET_LENGTH } from "./hmac";

/**
 * Deployment settings, read from Convex environment variables
 * (`npx convex env set ...`). Nothing secret is hard-coded or sent to the browser.
 */

/** The shared HMAC secret, or null if it is missing or too short to be safe. */
export function getHmacSecret(): string | null {
  const secret = process.env.LENDLOOP_HMAC_SECRET;
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

export function getNotifyWebhookUrl(): string | null {
  return process.env.N8N_NOTIFY_WEBHOOK_URL || null;
}

/** Keeps stored error text short and single-line. */
export function truncateError(message: string, max = 300): string {
  const flat = message.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
