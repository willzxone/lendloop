"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { LIMITS } from "@/convex/lib/constants";
import { errorMessage } from "@/lib/errors";
import { formatRange, loanDays, localToday, pluralDays } from "@/lib/format";
import { CalendarIcon, SendIcon } from "./icons";
import { Button, Field, FormError, inputClass } from "./ui";

/**
 * Date-range request. The browser checks the obvious cases for quick feedback;
 * the server re-checks everything (dates, overlaps, own tool, limits).
 */
export function RequestForm({
  toolId,
  onDone,
  onCancel,
}: {
  toolId: Id<"tools">;
  onDone: () => void;
  onCancel: () => void;
}) {
  const requestLoan = useMutation(api.loans.request);
  const [today] = useState(() => localToday());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validRange = startDate !== "" && endDate !== "" && endDate >= startDate;
  const days = validRange ? loanDays(startDate, endDate) : 0;
  const tooLong = days > LIMITS.maxLoanDays;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (endDate < startDate) {
      setError("The end date must be on or after the start date.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await requestLoan({ toolId, startDate, endDate });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="From" htmlFor={`${toolId}-start`}>
          <input
            id={`${toolId}-start`}
            type="date"
            className={inputClass}
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </Field>
        <Field label="Until" htmlFor={`${toolId}-end`}>
          <input
            id={`${toolId}-end`}
            type="date"
            className={inputClass}
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </Field>
      </div>

      <div
        aria-live="polite"
        className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset ${
          tooLong ? "bg-amber-50 ring-amber-600/20" : "bg-zinc-50 ring-zinc-950/[0.05]"
        }`}
      >
        <span
          className={`grid size-9 place-items-center rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/[0.06] ${
            tooLong ? "text-amber-600" : "text-emerald-600"
          }`}
        >
          <CalendarIcon className="size-4" />
        </span>
        {validRange ? (
          <div className="text-[13px]">
            <p className="font-semibold text-zinc-900">{pluralDays(days)}</p>
            <p className="text-zinc-500">
              {tooLong
                ? `Loans can be up to ${LIMITS.maxLoanDays} days. Pick a shorter range.`
                : formatRange(startDate, endDate)}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-zinc-500">Pick an end date on or after the start date.</p>
        )}
      </div>

      <FormError message={error} />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <SendIcon />
          {saving ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
