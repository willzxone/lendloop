"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { LoanCard, type LoanView } from "@/components/LoanCard";
import { Button, EmptyState, FormError, Loading, PageHeader, SectionTitle } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";

export default function IncomingPage() {
  const loans = useQuery(api.loans.incoming);

  if (loans === undefined) return <Loading />;

  const waiting = loans.filter((loan) => loan.status === "requested");
  const active = loans.filter((loan) => loan.status === "approved");
  const past = loans.filter((loan) => loan.status === "declined" || loan.status === "returned");

  return (
    <>
      <PageHeader title="Incoming requests" description="Requests to borrow your tools." />
      {loans.length === 0 ? (
        <EmptyState title="No requests for your tools yet" />
      ) : (
        <div className="space-y-8">
          <LoanSection title="Waiting for your answer" loans={waiting} />
          <LoanSection title="Lent out or booked" loans={active} />
          <LoanSection title="History" loans={past} />
        </div>
      )}
    </>
  );
}

function LoanSection({ title, loans }: { title: string; loans: LoanView[] }) {
  if (loans.length === 0) return null;
  return (
    <section>
      <SectionTitle count={loans.length}>{title}</SectionTitle>
      <div className="space-y-3">
        {loans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} perspective="lender" actions={<LenderActions loan={loan} />} />
        ))}
      </div>
    </section>
  );
}

function LenderActions({ loan }: { loan: LoanView }) {
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: (args: { loanId: LoanView["id"] }) => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action({ loanId: loan.id });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loan.status === "requested") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => run(approve)}>
            Approve
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(decline)}>
            Decline
          </Button>
        </div>
        <FormError message={error} />
      </div>
    );
  }
  if (loan.status === "approved") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button variant="secondary" disabled={busy} onClick={() => run(markReturned)}>
          Mark returned
        </Button>
        <FormError message={error} />
      </div>
    );
  }
  return null;
}
