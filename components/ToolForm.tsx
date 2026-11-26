"use client";

import { useState, type FormEvent } from "react";
import {
  LIMITS,
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
  type ToolCategory,
  type ToolCondition,
} from "@/convex/lib/constants";
import { errorMessage } from "@/lib/errors";
import { CategoryGlyph } from "./category";
import { Button, Field, FormError, inputClass } from "./ui";

export type ToolFormValues = {
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
};

const EMPTY: ToolFormValues = { name: "", category: "Power tools", condition: "good", description: "" };

const CONDITION_HINTS: Record<ToolCondition, string> = {
  new: "Barely used",
  good: "Works well",
  fair: "Some wear",
  worn: "Old but works",
};

/** Create and edit form for a listing. Validation is repeated on the server. */
export function ToolForm({
  idPrefix,
  initial = EMPTY,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initial?: ToolFormValues;
  submitLabel: string;
  onSubmit: (values: ToolFormValues) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ToolFormValues>(key: K, value: ToolFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const id = (field: string) => `${idPrefix}-${field}`;
  const optionClass =
    "relative flex cursor-pointer rounded-xl bg-white ring-1 ring-inset ring-zinc-950/10 transition hover:ring-zinc-950/20 has-checked:bg-emerald-50/60 has-checked:ring-2 has-checked:ring-emerald-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-emerald-600";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Name" htmlFor={id("name")}>
        <input
          id={id("name")}
          className={inputClass}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
          minLength={LIMITS.toolNameMin}
          maxLength={LIMITS.toolNameMax}
          placeholder="e.g. Cordless drill"
          autoFocus
        />
      </Field>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-zinc-800">Category</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOOL_CATEGORIES.map((category) => (
            <label key={category} className={`${optionClass} flex-col items-start gap-2 p-3`}>
              <input
                type="radio"
                name={id("category")}
                value={category}
                checked={values.category === category}
                onChange={() => set("category", category)}
                className="sr-only"
              />
              <CategoryGlyph
                category={category}
                className={`size-[18px] ${values.category === category ? "text-emerald-600" : "text-zinc-400"}`}
              />
              <span className="text-[13px] leading-tight font-medium text-zinc-800">{category}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-zinc-800">Condition</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOOL_CONDITIONS.map((condition) => (
            <label key={condition} className={`${optionClass} flex-col px-3 py-2.5`}>
              <input
                type="radio"
                name={id("condition")}
                value={condition}
                checked={values.condition === condition}
                onChange={() => set("condition", condition)}
                className="sr-only"
              />
              <span className="text-[13px] font-medium text-zinc-900 capitalize">{condition}</span>
              <span className="text-xs text-zinc-500">{CONDITION_HINTS[condition]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Short description"
        htmlFor={id("description")}
        hint={
          <span className="flex justify-between gap-4">
            <span>Optional. What&apos;s included and anything a borrower should know.</span>
            <span className="tabular-nums">
              {values.description.length}/{LIMITS.descriptionMax}
            </span>
          </span>
        }
      >
        <textarea
          id={id("description")}
          className={`${inputClass} resize-none`}
          rows={3}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={LIMITS.descriptionMax}
          placeholder="18V, two batteries and a charger. Comes in a hard case."
        />
      </Field>

      <FormError message={error} />

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
