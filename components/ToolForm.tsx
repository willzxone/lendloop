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
import { Button, Field, FormError, inputClass } from "./ui";

export type ToolFormValues = {
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
};

const EMPTY: ToolFormValues = { name: "", category: "Power tools", condition: "good", description: "" };

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
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor={id("category")}>
          <select
            id={id("category")}
            className={inputClass}
            value={values.category}
            onChange={(e) => set("category", e.target.value as ToolCategory)}
          >
            {TOOL_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="Condition" htmlFor={id("condition")}>
          <select
            id={id("condition")}
            className={`${inputClass} capitalize`}
            value={values.condition}
            onChange={(e) => set("condition", e.target.value as ToolCondition)}
          >
            {TOOL_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label="Short description"
        htmlFor={id("description")}
        hint={`${values.description.length}/${LIMITS.descriptionMax}`}
      >
        <textarea
          id={id("description")}
          className={inputClass}
          rows={3}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={LIMITS.descriptionMax}
          placeholder="What it is, what's included, anything a borrower should know."
        />
      </Field>
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
