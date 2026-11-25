"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { LoanCard } from "@/components/LoanCard";
import { EmptyState, Loading, PageHeader } from "@/components/ui";
import { api } from "@/convex/_generated/api";

export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);

  return (
    <>
      <PageHeader title="My requests" description="Tools you've asked to borrow." />
      {loans === undefined ? (
        <Loading />
      ) : loans.length === 0 ? (
        <EmptyState title="No requests yet">
          <Link href="/tools" className="text-emerald-800 underline">
            Browse tools
          </Link>{" "}
          to find something to borrow.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} perspective="borrower" />
          ))}
        </div>
      )}
    </>
  );
}
