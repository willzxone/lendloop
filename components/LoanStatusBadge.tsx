"use client";

import type { LoanStatus } from "@/convex/lib/constants";
import { Badge } from "./ui";

const TONES = { requested: "blue", approved: "green", declined: "neutral", returned: "violet" } as const;
const LABELS: Record<LoanStatus, string> = {
  requested: "Awaiting answer",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
};

export function LoanStatusBadge({ status, overdue }: { status: LoanStatus; overdue?: boolean }) {
  if (overdue) {
    return (
      <Badge tone="red" dot>
        Overdue
      </Badge>
    );
  }
  return (
    <Badge tone={TONES[status]} dot>
      {LABELS[status]}
    </Badge>
  );
}
