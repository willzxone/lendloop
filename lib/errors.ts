import { ConvexError } from "convex/values";

/** Message for errors thrown with appError() on the server; a generic one otherwise. */
export function errorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data: unknown = error.data;
    if (typeof data === "object" && data !== null && "message" in data) return String(data.message);
    if (typeof data === "string") return data;
  }
  return "Something went wrong. Please try again.";
}
