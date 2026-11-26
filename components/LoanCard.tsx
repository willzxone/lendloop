"use client";

import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { formatRange, loanDays, pluralDays } from "@/lib/format";
import { ActivityList } from "./ActivityList";
import { CategoryIcon } from "./category";
import { CalendarIcon, ShieldCheckIcon } from "./icons";
import { LoanStatusBadge } from "./LoanStatusBadge";
import { Avatar, Card } from "./ui";

export type LoanView = FunctionReturnType<typeof api.loans.myRequests>[number];

/** One loan as seen by the borrower ("Lent by") or the lender ("Requested by"). */
export function LoanCard({
  loan,
  perspective,
  actions,
}: {
  loan: LoanView;
  perspective: "borrower" | "lender";
  actions?: ReactNode;
}) {
  return (
    <Card tone={loan.overdue ? "danger" : "default"}>
      <div className="flex gap-4">
        <div className="hidden sm:block">
          <CategoryIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-x-2 text-[15px] font-semibold text-zinc-950">
                {loan.toolName}
                {loan.toolRemoved && (
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">
                    Listing removed
                  </span>
                )}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-500">
                <CalendarIcon className="size-3.5 text-zinc-400" />
                {formatRange(loan.startDate, loan.endDate)}
                <span className="text-zinc-300">·</span>
                {pluralDays(loanDays(loan.startDate, loan.endDate))}
              </p>
            </div>
            <LoanStatusBadge status={loan.status} overdue={loan.overdue} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[13px]">
              <Avatar name={loan.otherParty.name} size="sm" />
              <span className="text-zinc-500">{perspective === "borrower" ? "Lent by" : "Requested by"}</span>
              <span className="font-medium text-zinc-900">{loan.otherParty.name}</span>
              {loan.otherParty.trustedLender && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <ShieldCheckIcon className="size-3.5" />
                  Trusted lender
                </span>
              )}
            </p>
            {actions}
          </div>

          <ActivityList activity={loan.activity} />
        </div>
      </div>
    </Card>
  );
}
