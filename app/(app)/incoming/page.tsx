"use client";

import { useQuery } from "convex/react";
import { AlertIcon, CheckCircleIcon, ClockIcon, InboxIcon } from "@/components/icons";
import { LenderActions } from "@/components/LenderActions";
import { LoanCard, type LoanView } from "@/components/LoanCard";
import { NewToolButton } from "@/components/NewToolButton";
import { EmptyState, PageHeader, SectionTitle, SkeletonList, StatCard } from "@/components/ui";
import { api } from "@/convex/_generated/api";

export default function IncomingPage() {
  const loans = useQuery(api.loans.incoming);
  const loading = loans === undefined;

  const waiting = loans?.filter((loan) => loan.status === "requested") ?? [];
  const active = loans?.filter((loan) => loan.status === "approved") ?? [];
  const overdue = active.filter((loan) => loan.overdue);
  const past = loans?.filter((loan) => loan.status === "declined" || loan.status === "returned") ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Lending"
        title="Incoming requests"
        description="People who want to borrow your tools. Every answer is emailed to the borrower."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Waiting for you"
          value={waiting.length}
          icon={<InboxIcon />}
          tone={waiting.length > 0 ? "green" : "neutral"}
          loading={loading}
        />
        <StatCard label="Lent out or booked" value={active.length} icon={<ClockIcon />} tone="blue" loading={loading} />
        <StatCard
          label="Overdue"
          value={overdue.length}
          icon={<AlertIcon />}
          tone={overdue.length > 0 ? "red" : "neutral"}
          loading={loading}
          hint={overdue.length > 0 ? "Reminders are going out" : "Nothing late"}
        />
        <StatCard label="Completed" value={past.length} icon={<CheckCircleIcon />} tone="violet" loading={loading} />
      </div>

      {loans === undefined ? (
        <SkeletonList rows={3} label="Loading requests…" />
      ) : loans.length === 0 ? (
        <EmptyState icon={<InboxIcon />} title="No requests for your tools yet" action={<NewToolButton variant="secondary" />}>
          When a neighbour asks to borrow something, it lands here and you get an email.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          <LoanSection
            title="Waiting for your answer"
            description="Approve or decline. If requests overlap, only one of them can be approved."
            loans={waiting}
          />
          <LoanSection title="Lent out or booked" description="Mark a loan returned once you have the tool back." loans={active} />
          <LoanSection title="History" loans={past} />
        </div>
      )}
    </>
  );
}

function LoanSection({ title, description, loans }: { title: string; description?: string; loans: LoanView[] }) {
  if (loans.length === 0) return null;
  return (
    <section>
      <SectionTitle count={loans.length} description={description}>
        {title}
      </SectionTitle>
      <div className="space-y-3">
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} perspective="lender" actions={<LenderActions loan={loan} />} />
        ))}
      </div>
    </section>
  );
}
