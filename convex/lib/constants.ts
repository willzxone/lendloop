/**
 * Values shared by the Convex backend and the Next.js UI.
 * Keep this file free of Convex server imports so the browser can import it.
 */

export const TOOL_CATEGORIES = [
  "Power tools",
  "Hand tools",
  "Garden",
  "Ladders & access",
  "Cleaning",
  "Painting & decorating",
  "Outdoor & camping",
  "Other",
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const TOOL_CONDITIONS = ["new", "good", "fair", "worn"] as const;
export type ToolCondition = (typeof TOOL_CONDITIONS)[number];

export const LOAN_STATUSES = ["requested", "approved", "declined", "returned"] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

/** Events sent to the n8n notification workflow. One per loan status change. */
export const LOAN_EVENTS = [
  "loan.requested",
  "loan.approved",
  "loan.declined",
  "loan.returned",
] as const;
export type LoanEvent = (typeof LOAN_EVENTS)[number];

export const LIMITS = {
  toolNameMin: 2,
  toolNameMax: 80,
  descriptionMax: 500,
  /** Longest loan a borrower can ask for, counting both end days. */
  maxLoanDays: 30,
  /** How far ahead a loan can start. */
  maxAdvanceDays: 180,
  /** Pending requests one borrower can have open at once (basic abuse limit). */
  maxOpenRequestsPerBorrower: 10,
} as const;
