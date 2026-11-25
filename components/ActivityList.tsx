"use client";

import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { activityLabel, relativeTime } from "@/lib/format";
import { useNow } from "@/lib/useNow";

type Activity = FunctionReturnType<typeof api.loans.myRequests>[number]["activity"];

const dotColour = {
  pending: "bg-stone-400",
  retrying: "bg-amber-500",
  sent: "bg-emerald-600",
  failed: "bg-red-600",
} as const;

/** Recent automation for one loan, e.g. "Overdue reminder sent · 2 days ago". */
export function ActivityList({ activity }: { activity: Activity }) {
  const now = useNow();
  if (activity.length === 0) return null;
  return (
    <ul aria-label="Automation activity" className="mt-3 space-y-1 border-t border-stone-100 pt-3">
      {activity.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-xs text-stone-600">
          <span aria-hidden className={`mt-1 size-1.5 shrink-0 rounded-full ${dotColour[item.status]}`} />
          <span>
            {activityLabel(item)} · {relativeTime(item.at, now)}
            {item.status === "retrying" && item.nextAttemptAt && (
              <> · next try {relativeTime(item.nextAttemptAt, now)}</>
            )}
            {item.error && <span className="block text-red-700">{item.error}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
