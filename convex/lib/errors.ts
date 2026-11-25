import { ConvexError } from "convex/values";

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "CONFLICT";

/**
 * Errors thrown on purpose by our functions. The client shows `message` to the
 * user; `code` lets the UI branch without string matching. Unexpected errors
 * stay plain `Error`s, which Convex redacts before they reach the browser.
 */
export function appError(code: AppErrorCode, message: string) {
  return new ConvexError({ code, message });
}
