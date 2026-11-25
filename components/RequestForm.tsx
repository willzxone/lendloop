"use client";

import { useMutation } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";
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
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-md bg-stone-50 p-3">
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
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Sending…" : "Send request"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
