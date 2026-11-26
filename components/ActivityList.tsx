"use client";

import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { activityLabel, relativeTime } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { BellIcon } from "./icons";

type Activity = FunctionReturnType<typeof api.loans.myRequests>[number]["activity"];

export const ACTIVITY_DOT = {
  pending: "bg-zinc-300 ring-zinc-100",
  retrying: "bg-amber-500 ring-amber-100",
  sent: "bg-emerald-500 ring-emerald-100",
  failed: "bg-red-500 ring-red-100",
} as const;

/** Recent automation for one loan, as a small timeline ("Overdue reminder sent · 2 days ago"). */
export function ActivityList({ activity }: { activity: Activity }) {
  const now = useNow();
  if (activity.length === 0) return null;
  return (
    <div className="mt-4 rounded-xl bg-zinc-50 px-3.5 py-3 ring-1 ring-inset ring-zinc-950/[0.04]">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
        <BellIcon className="size-3" />
        Notifications
      </p>
      <ul aria-label="Automation activity" className="relative space-y-2">
        <span aria-hidden className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-zinc-200" />
        {activity.map((item) => (
          <li key={item.id} className="relative flex items-start gap-3 text-[13px] text-zinc-600">
            <span aria-hidden className={`mt-1.5 size-[7px] shrink-0 rounded-full ring-2 ${ACTIVITY_DOT[item.status]}`} />
            <span className="min-w-0">
              <span className="text-zinc-800">{activityLabel(item)}</span>
              <span className="text-zinc-400"> · {relativeTime(item.at, now)}</span>
              {item.status === "retrying" && item.nextAttemptAt && (
                <span className="text-zinc-400"> · next try {relativeTime(item.nextAttemptAt, now)}</span>
              )}
              {item.error && <span className="mt-0.5 block text-xs text-red-600">{item.error}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
