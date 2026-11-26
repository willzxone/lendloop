import type { LoanEvent } from "@/convex/lib/constants";

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-12-01" -> "1 Dec 2026". Loan dates are calendar dates, so format them in UTC. */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

const DAY_MS = 86_400_000;
const dayNumber = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS;

/** Length of a loan in days, counting both the first and the last day. */
export function loanDays(startDate: string, endDate: string): number {
  return dayNumber(endDate) - dayNumber(startDate) + 1;
}

/** Whole days from `today` to `isoDate` (negative when it is in the past). */
export function daysUntil(isoDate: string, today: string): number {
  return dayNumber(isoDate) - dayNumber(today);
}

/** How much of a loan has elapsed as of `today`, from 0 to 1. */
export function loanProgress(startDate: string, endDate: string, today: string): number {
  const elapsed = dayNumber(today) - dayNumber(startDate) + 1;
  return Math.min(1, Math.max(0, elapsed / loanDays(startDate, endDate)));
}

export function pluralDays(count: number): string {
  return `${count} day${count === 1 ? "" : "s"}`;
}

/** "Due today", "Due in 3 days", "Overdue by 2 days", "Starts in 4 days". */
export function dueLabel(startDate: string, endDate: string, today: string): string {
  const toStart = daysUntil(startDate, today);
  if (toStart > 0) return toStart === 1 ? "Starts tomorrow" : `Starts in ${pluralDays(toStart)}`;
  const toEnd = daysUntil(endDate, today);
  if (toEnd === 0) return "Due back today";
  if (toEnd === 1) return "Due back tomorrow";
  if (toEnd > 1) return `Due back in ${pluralDays(toEnd)}`;
  return `Overdue by ${pluralDays(-toEnd)}`;
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "2 days ago", "in 5 minutes", "just now". */
export function relativeTime(timestamp: number, now: number): string {
  const diff = timestamp - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relative.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/** Today's date in the browser's time zone, as YYYY-MM-DD (for date input minimums). */
export function localToday(now: Date = new Date()): string {
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

const EVENT_LABELS: Record<LoanEvent, string> = {
  "loan.requested": "Request notification",
  "loan.approved": "Approval notification",
  "loan.declined": "Decline notification",
  "loan.returned": "Return notification",
};

type ActivityLike = {
  kind: "notification" | "reminder" | "workflow_error";
  event?: LoanEvent;
  status: "pending" | "retrying" | "sent" | "failed";
  attempts: number;
};

/** "Overdue reminder sent", "Approval notification retrying (attempt 2 failed)". */
export function activityLabel(item: ActivityLike): string {
  if (item.kind === "workflow_error") return "Automation error";
  const subject =
    item.kind === "reminder" ? "Overdue reminder" : item.event ? EVENT_LABELS[item.event] : "Notification";
  switch (item.status) {
    case "pending":
      return `${subject} queued`;
    case "retrying":
      return `${subject} retrying (attempt ${item.attempts} failed)`;
    case "sent":
      return `${subject} sent`;
    case "failed":
      return item.kind === "notification" && item.attempts > 1
        ? `${subject} failed after ${item.attempts} attempts`
        : `${subject} failed`;
  }
}
