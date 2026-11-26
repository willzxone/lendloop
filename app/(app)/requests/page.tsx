"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { CompassIcon, SendIcon } from "@/components/icons";
import { LoanCard } from "@/components/LoanCard";
import { EmptyState, PageHeader, Segmented, SkeletonList, buttonClass } from "@/components/ui";
import { api } from "@/convex/_generated/api";

type Filter = "all" | "requested" | "approved" | "past";

export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);
  const [filter, setFilter] = useState<Filter>("all");

  const groups = {
    all: loans ?? [],
    requested: loans?.filter((loan) => loan.status === "requested") ?? [],
    approved: loans?.filter((loan) => loan.status === "approved") ?? [],
    past: loans?.filter((loan) => loan.status === "declined" || loan.status === "returned") ?? [],
  };
  const shown = groups[filter];

  return (
    <>
      <PageHeader
        eyebrow="Borrowing"
        title="My requests"
        description="Tools you've asked to borrow, and what the lender said."
        action={
          <Link href="/tools" className={buttonClass("primary")}>
            <CompassIcon />
            Find a tool
          </Link>
        }
      />

      {loans === undefined ? (
        <SkeletonList rows={3} label="Loading your requests…" />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={<SendIcon />}
          title="No requests yet"
          action={
            <Link href="/tools" className={buttonClass("secondary")}>
              Browse tools
            </Link>
          }
        >
          Find something you need, pick your dates, and the owner gets an email straight away.
        </EmptyState>
      ) : (
        <>
          <div className="mb-5">
            <Segmented
              label="Filter requests"
              value={filter}
              onChange={setFilter}
              items={[
                { value: "all", label: "All", count: groups.all.length },
                { value: "requested", label: "Awaiting answer", count: groups.requested.length },
                { value: "approved", label: "Approved", count: groups.approved.length },
                { value: "past", label: "Past", count: groups.past.length },
              ]}
            />
          </div>
          {shown.length === 0 ? (
            <EmptyState compact title="Nothing here">
              No requests in this group right now.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {shown.map((loan) => (
                <LoanCard key={loan.id} loan={loan} perspective="borrower" />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
