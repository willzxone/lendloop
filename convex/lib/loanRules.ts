/**
 * Pure loan rules. No database access here, so they are easy to unit test and
 * the mutations in convex/loans.ts read as a list of checks.
 */
import { LIMITS, type LoanStatus } from "./constants";
import { addDays, daysBetween, isIsoDate, rangesOverlap } from "./dates";

type DateRange = { startDate: string; endDate: string };
type LoanLike = DateRange & { status: LoanStatus };

/** Returns a user-facing reason the range is invalid, or null if it is fine. */
export function validateLoanDates(range: DateRange, today: string): string | null {
  const { startDate, endDate } = range;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return "Dates must be real calendar dates in YYYY-MM-DD format.";
  }
  if (endDate < startDate) {
    return "The end date must be on or after the start date.";
  }
  // One day of grace: the server uses UTC, and a borrower behind UTC (e.g. in
  // the Americas, in the evening) is still on the server's "yesterday".
  if (startDate < addDays(today, -1)) {
    return "The start date is in the past.";
  }
  if (daysBetween(today, startDate) > LIMITS.maxAdvanceDays) {
    return `Loans can start at most ${LIMITS.maxAdvanceDays} days from today.`;
  }
  if (daysBetween(startDate, endDate) + 1 > LIMITS.maxLoanDays) {
    return `A loan can last at most ${LIMITS.maxLoanDays} days.`;
  }
  return null;
}

/** Approved loans block their dates. Pending, declined and returned ones do not. */
export function findBlockingLoan<T extends LoanLike>(loans: T[], range: DateRange): T | undefined {
  return loans.find((loan) => loan.status === "approved" && rangesOverlap(loan, range));
}

const TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  requested: ["approved", "declined"],
  approved: ["returned"],
  declined: [],
  returned: [],
};

export function canTransition(from: LoanStatus, to: LoanStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** A tool is out if an approved loan has started and not been marked returned (overdue included). */
export function isOutOnLoan(loans: LoanLike[], today: string): boolean {
  return loans.some((loan) => loan.status === "approved" && loan.startDate <= today);
}
