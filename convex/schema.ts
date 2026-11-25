import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  automationKindValidator,
  automationStatusValidator,
  categoryValidator,
  conditionValidator,
  loanEventValidator,
  loanStatusValidator,
  reminderStatusValidator,
  roleValidator,
} from "./lib/validators";

export default defineSchema({
  /** One row per Clerk user, created on first sign-in by users.store. */
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    // Set only by the internal admin:setRole mutation (CLI), never by the client.
    role: roleValidator,
    trustedLender: v.boolean(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  loans: defineTable({
    toolId: v.id("tools"),
    // Copy of the tool name at request time, so loan history and reminders
    // still make sense after a listing is renamed or removed.
    toolName: v.string(),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD
    endDate: v.string(), // YYYY-MM-DD, inclusive
    status: loanStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool_and_status", ["toolId", "status"])
    .index("by_borrower_and_status", ["borrowerId", "status"])
    .index("by_lender_and_status", ["lenderId", "status"])
    .index("by_status_and_endDate", ["status", "endDate"]),

  /**
   * Outbox and activity log for automation.
   * - notification: a loan event queued for the n8n webhook (pending -> sent | retrying -> failed)
   * - reminder: an overdue reminder reported back by n8n (sent | failed)
   * - workflow_error: a failed n8n execution reported by the error workflow
   */
  automationEvents: defineTable({
    loanId: v.optional(v.id("loans")), // absent for workflow errors with no loan context
    kind: automationKindValidator,
    event: v.optional(loanEventValidator), // notifications only
    status: automationStatusValidator,
    attempts: v.number(),
    nextAttemptAt: v.optional(v.number()),
    error: v.optional(v.string()), // shown to admins only
    detail: v.optional(v.string()), // e.g. channel or workflow/node name
    dedupeKey: v.optional(v.string()), // makes n8n write-backs idempotent
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_loan", ["loanId"])
    .index("by_dedupeKey", ["dedupeKey"])
    .index("by_status", ["status"]),

  /** Ledger of overdue reminders. idempotencyKey = `${loanId}:${YYYY-MM-DD}` and is unique. */
  reminders: defineTable({
    idempotencyKey: v.string(),
    loanId: v.id("loans"),
    borrowerId: v.id("users"),
    reminderDate: v.string(), // YYYY-MM-DD
    status: reminderStatusValidator,
    channel: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotencyKey", ["idempotencyKey"])
    .index("by_loan", ["loanId"]),
});
