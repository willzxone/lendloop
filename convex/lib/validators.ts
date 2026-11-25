import { v } from "convex/values";
import { LOAN_EVENTS, LOAN_STATUSES, TOOL_CATEGORIES, TOOL_CONDITIONS } from "./constants";

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));
export const categoryValidator = v.union(...TOOL_CATEGORIES.map((c) => v.literal(c)));
export const conditionValidator = v.union(...TOOL_CONDITIONS.map((c) => v.literal(c)));
export const loanStatusValidator = v.union(...LOAN_STATUSES.map((s) => v.literal(s)));
export const loanEventValidator = v.union(...LOAN_EVENTS.map((e) => v.literal(e)));

export const automationKindValidator = v.union(
  v.literal("notification"),
  v.literal("reminder"),
  v.literal("workflow_error"),
);

export const automationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("retrying"),
  v.literal("sent"),
  v.literal("failed"),
);

export const reminderStatusValidator = v.union(v.literal("sent"), v.literal("failed"));
