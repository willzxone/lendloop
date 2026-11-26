"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { CheckIcon, CloseIcon, RetryIcon } from "./icons";
import type { LoanView } from "./LoanCard";
import { Button, FormError } from "./ui";

/** Approve / decline a request, or mark an approved loan as returned. */
export function LenderActions({ loan, size = "md" }: { loan: LoanView; size?: "sm" | "md" }) {
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
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <Button size={size} variant="secondary" disabled={busy} onClick={() => run(decline)}>
            <CloseIcon />
            Decline
          </Button>
          <Button size={size} disabled={busy} onClick={() => run(approve)}>
            <CheckIcon />
            Approve
          </Button>
        </div>
        <FormError message={error} />
      </div>
    );
  }
  if (loan.status === "approved") {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button size={size} variant="secondary" disabled={busy} onClick={() => run(markReturned)}>
          <RetryIcon />
          Mark returned
        </Button>
        <FormError message={error} />
      </div>
    );
  }
  return null;
}
