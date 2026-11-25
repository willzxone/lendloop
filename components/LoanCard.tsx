"use client";

import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import type { api } from "@/convex/_generated/api";
import { formatRange } from "@/lib/format";
import { ActivityList } from "./ActivityList";
import { LoanStatusBadge } from "./LoanStatusBadge";
import { Badge, Card } from "./ui";

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
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-stone-900">
            {loan.toolName}
            {loan.toolRemoved && <span className="ml-2 text-xs font-normal text-stone-400">(listing removed)</span>}
          </h3>
          <p className="text-sm text-stone-600">{formatRange(loan.startDate, loan.endDate)}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
            {perspective === "borrower" ? "Lent by" : "Requested by"} {loan.otherParty.name}
            {loan.otherParty.trustedLender && <Badge tone="green">Trusted lender</Badge>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LoanStatusBadge status={loan.status} overdue={loan.overdue} />
          {actions}
        </div>
      </div>
      <ActivityList activity={loan.activity} />
    </Card>
  );
}
