import type { LoanStatus } from "@/convex/lib/constants";
import { Badge } from "./ui";

const TONES = { requested: "blue", approved: "green", declined: "neutral", returned: "neutral" } as const;
const LABELS: Record<LoanStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  declined: "Declined",
  returned: "Returned",
};

export function LoanStatusBadge({ status, overdue }: { status: LoanStatus; overdue?: boolean }) {
  if (overdue) return <Badge tone="red">Overdue</Badge>;
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
