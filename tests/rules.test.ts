import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isIsoDate, rangesOverlap } from "../convex/lib/dates";
import { canTransition, findBlockingLoan, isOutOnLoan, validateLoanDates } from "../convex/lib/loanRules";
import { parseReminderBatch, parseWorkflowError } from "../convex/lib/n8nPayloads";
import { backoffDelayMs, isRetryableStatus } from "../convex/lib/retry";

const TODAY = "2026-06-10";

describe("dates", () => {
  it("only accepts real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-6-1")).toBe(false);
  });

  it("does date arithmetic across month ends", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(daysBetween("2026-06-08", "2026-06-10")).toBe(2);
  });
});

describe("loan dates", () => {
  it("accepts a valid range", () => {
    expect(validateLoanDates({ startDate: TODAY, endDate: "2026-06-12" }, TODAY)).toBeNull();
  });

  it("rejects bad ranges with a readable reason", () => {
    expect(validateLoanDates({ startDate: "2026-06-12", endDate: "2026-06-11" }, TODAY)).toMatch(/end date/i);
    expect(validateLoanDates({ startDate: "2026-06-01", endDate: "2026-06-02" }, TODAY)).toMatch(/past/i);
    expect(validateLoanDates({ startDate: TODAY, endDate: "2026-09-01" }, TODAY)).not.toBeNull();
    expect(validateLoanDates({ startDate: "2027-12-01", endDate: "2027-12-02" }, TODAY)).not.toBeNull();
  });

  it("treats ranges as inclusive", () => {
    expect(rangesOverlap({ startDate: "2026-06-10", endDate: "2026-06-12" }, { startDate: "2026-06-12", endDate: "2026-06-14" })).toBe(true);
    expect(rangesOverlap({ startDate: "2026-06-10", endDate: "2026-06-11" }, { startDate: "2026-06-12", endDate: "2026-06-14" })).toBe(false);
  });

  it("only approved loans block a booking", () => {
    const loans = [
      { status: "requested" as const, startDate: "2026-06-10", endDate: "2026-06-12" },
      { status: "approved" as const, startDate: "2026-06-11", endDate: "2026-06-13" },
    ];
    expect(findBlockingLoan(loans, { startDate: "2026-06-12", endDate: "2026-06-12" })?.status).toBe("approved");
    expect(findBlockingLoan(loans, { startDate: "2026-06-14", endDate: "2026-06-15" })).toBeUndefined();
  });

  it("a tool is on loan only while an approved loan covers today", () => {
    const approved = [{ status: "approved" as const, startDate: "2026-06-12", endDate: "2026-06-14" }];
    expect(isOutOnLoan(approved, TODAY)).toBe(false);
    expect(isOutOnLoan(approved, "2026-06-13")).toBe(true);
  });
});

describe("loan status transitions", () => {
  it("allows only the documented transitions", () => {
    expect(canTransition("requested", "approved")).toBe(true);
    expect(canTransition("requested", "declined")).toBe(true);
    expect(canTransition("approved", "returned")).toBe(true);
    expect(canTransition("requested", "returned")).toBe(false);
    expect(canTransition("declined", "approved")).toBe(false);
    expect(canTransition("returned", "approved")).toBe(false);
  });
});

describe("retry policy", () => {
  it("backs off exponentially with a cap", () => {
    const noJitter = () => 0;
    expect(backoffDelayMs(1, noJitter)).toBe(15_000);
    expect(backoffDelayMs(2, noJitter)).toBe(30_000);
    expect(backoffDelayMs(20, noJitter)).toBe(600_000);
  });

  it("retries server errors, timeouts and 404, but not other client errors", () => {
    for (const status of [500, 502, 503, 404, 408, 429]) expect(isRetryableStatus(status)).toBe(true);
    for (const status of [400, 401, 403, 422]) expect(isRetryableStatus(status)).toBe(false);
  });
});

describe("n8n payload parsing", () => {
  const reminder = { idempotencyKey: "loan123:2026-06-10", loanId: "loan123", reminderDate: "2026-06-10", status: "sent", channel: "email" };

  it("accepts a well-formed batch and takes the date from the idempotency key", () => {
    const parsed = parseReminderBatch({ reminders: [{ ...reminder, reminderDate: "1999-01-01" }] });
    expect(parsed.ok && parsed.value[0].reminderDate).toBe("2026-06-10");
  });

  it("rejects malformed batches and keys that don't match the loan", () => {
    expect(parseReminderBatch({ reminders: [{ ...reminder, loanId: "other" }] }).ok).toBe(false);
    expect(parseReminderBatch({ reminders: [{ ...reminder, idempotencyKey: "loan123:2026-02-30" }] }).ok).toBe(false);
    expect(parseReminderBatch({ reminders: [{ ...reminder, status: "maybe" }] }).ok).toBe(false);
    expect(parseReminderBatch({ reminders: [] }).ok).toBe(false);
    expect(parseReminderBatch([reminder]).ok).toBe(false);
  });

  it("requires the core fields of a workflow error", () => {
    expect(parseWorkflowError({ workflowId: "1", workflowName: "x", executionId: "2", message: "boom" }).ok).toBe(true);
    expect(parseWorkflowError({ workflowId: "1", workflowName: "x", message: "boom" }).ok).toBe(false);
  });
});
