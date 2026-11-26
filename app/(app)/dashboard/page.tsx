"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ACTIVITY_DOT } from "@/components/ActivityList";
import { CategoryIcon } from "@/components/category";
import { useCurrentUser } from "@/components/CurrentUser";
import {
  ActivityIcon,
  CheckCircleIcon,
  ClockIcon,
  CompassIcon,
  InboxIcon,
  PackageIcon,
  SendIcon,
} from "@/components/icons";
import { LenderActions } from "@/components/LenderActions";
import type { LoanView } from "@/components/LoanCard";
import { NewToolButton } from "@/components/NewToolButton";
import { Avatar, Panel, Skeleton, StatCard, buttonClass } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import {
  activityLabel,
  dueLabel,
  formatRange,
  loanDays,
  loanProgress,
  localToday,
  pluralDays,
  relativeTime,
} from "@/lib/format";
import { useNow } from "@/lib/useNow";

const dayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function OverviewPage() {
  const user = useCurrentUser();
  const mine = useQuery(api.tools.mine);
  const incoming = useQuery(api.loans.incoming);
  const requests = useQuery(api.loans.myRequests);
  const now = useNow();
  const today = localToday(new Date(now));

  const loading = mine === undefined || incoming === undefined || requests === undefined;
  const firstName = user.status === "ready" ? user.me.name.split(/\s+/)[0] : "";

  const waiting = incoming?.filter((loan) => loan.status === "requested") ?? [];
  const lentOut = (incoming?.filter((loan) => loan.status === "approved") ?? []).sort((a, b) =>
    a.endDate.localeCompare(b.endDate),
  );
  const overdue = lentOut.filter((loan) => loan.overdue);
  const myPending = requests?.filter((loan) => loan.status === "requested") ?? [];
  const myApproved = requests?.filter((loan) => loan.status === "approved") ?? [];
  const available = mine?.filter((tool) => tool.available).length ?? 0;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-emerald-700">{dayFormat.format(now)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px] sm:leading-9">
            {greeting(new Date(now).getHours())}
            {firstName && `, ${firstName}`}
          </h1>
          <p className="mt-1.5 text-[15px] text-zinc-500">
            Here&apos;s what&apos;s happening with your tools and loans.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tools" className={buttonClass("secondary")}>
            <CompassIcon />
            Browse tools
          </Link>
          <NewToolButton />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Waiting for your answer"
          value={waiting.length}
          icon={<InboxIcon />}
          tone={waiting.length > 0 ? "green" : "neutral"}
          href="/incoming"
          loading={loading}
          hint={waiting.length > 0 ? "Borrowers are waiting on you" : "You're all caught up"}
        />
        <StatCard
          label="Out on loan"
          value={lentOut.length}
          icon={<ClockIcon />}
          tone={overdue.length > 0 ? "red" : "blue"}
          href="/incoming"
          loading={loading}
          hint={
            overdue.length > 0 ? (
              <span className="font-medium text-red-600">{overdue.length} overdue</span>
            ) : lentOut.length > 0 ? (
              "All on schedule"
            ) : (
              "Nothing lent out"
            )
          }
        />
        <StatCard
          label="Your listings"
          value={mine?.length ?? 0}
          icon={<PackageIcon />}
          tone="violet"
          href="/listings"
          loading={loading}
          hint={`${available} available right now`}
        />
        <StatCard
          label="Your requests"
          value={myPending.length + myApproved.length}
          icon={<SendIcon />}
          tone="amber"
          href="/requests"
          loading={loading}
          hint={`${myApproved.length} approved · ${myPending.length} pending`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel
            title="Needs your answer"
            count={loading ? undefined : waiting.length}
            icon={<InboxIcon />}
            description="Approve or decline. The borrower is emailed either way."
            action={
              <Link href="/incoming" className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900">
                View all
              </Link>
            }
          >
            {loading ? (
              <RowsSkeleton />
            ) : waiting.length === 0 ? (
              <PanelEmpty
                icon={<CheckCircleIcon />}
                title="You're all caught up"
                body="New requests for your tools show up here the moment they arrive."
              />
            ) : (
              <ul className="divide-y divide-zinc-950/[0.06]">
                {waiting.slice(0, 5).map((loan) => (
                  <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={loan.otherParty.name} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-zinc-900">
                          <span className="font-semibold">{loan.otherParty.name}</span>
                          <span className="text-zinc-500"> wants </span>
                          <span className="font-semibold">{loan.toolName}</span>
                        </p>
                        <p className="text-[13px] text-zinc-500">
                          {formatRange(loan.startDate, loan.endDate)} ·{" "}
                          {pluralDays(loanDays(loan.startDate, loan.endDate))} · asked{" "}
                          {relativeTime(loan.createdAt, now)}
                        </p>
                      </div>
                    </div>
                    <LenderActions loan={loan} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Out on loan"
            count={loading ? undefined : lentOut.length}
            icon={<ClockIcon />}
            description="Overdue reminders go out automatically once a day."
          >
            {loading ? (
              <RowsSkeleton />
            ) : lentOut.length === 0 ? (
              <PanelEmpty
                icon={<PackageIcon />}
                title="Nothing lent out right now"
                body="Approved loans show up here with a countdown to their return date."
              />
            ) : (
              <ul className="divide-y divide-zinc-950/[0.06]">
                {lentOut.map((loan) => (
                  <LoanProgressRow key={loan.id} loan={loan} today={today} />
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <LoanMix loans={incoming} />
          <AutomationFeed incoming={incoming} requests={requests} now={now} />
        </div>
      </div>
    </>
  );
}

function LoanProgressRow({ loan, today }: { loan: LoanView; today: string }) {
  const progress = loanProgress(loan.startDate, loan.endDate, today);
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <CategoryIcon size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-zinc-900">{loan.toolName}</p>
          <p className={`shrink-0 text-xs font-medium ${loan.overdue ? "text-red-600" : "text-zinc-500"}`}>
            {dueLabel(loan.startDate, loan.endDate, today)}
          </p>
        </div>
        <p className="text-[13px] text-zinc-500">
          With {loan.otherParty.name} · {formatRange(loan.startDate, loan.endDate)}
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-label={`${loan.toolName} loan progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className={`h-full rounded-full ${loan.overdue ? "bg-red-500" : "bg-linear-to-r from-emerald-400 to-emerald-600"}`}
            style={{ width: `${Math.max(progress * 100, 4)}%` }}
          />
        </div>
      </div>
      <LenderActions loan={loan} size="sm" />
    </li>
  );
}

const MIX = [
  { key: "requested", label: "Awaiting answer", bar: "bg-sky-500" },
  { key: "approved", label: "Approved", bar: "bg-emerald-500" },
  { key: "returned", label: "Returned", bar: "bg-violet-400" },
  { key: "declined", label: "Declined", bar: "bg-zinc-300" },
] as const;

function LoanMix({ loans }: { loans: LoanView[] | undefined }) {
  const total = loans?.length ?? 0;
  const counts = MIX.map((item) => ({
    ...item,
    count: loans?.filter((loan) => loan.status === item.key).length ?? 0,
  }));
  return (
    <Panel title="Lending at a glance" icon={<ActivityIcon />}>
      <div className="px-5 py-4">
        {loans === undefined ? (
          <>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
            <Skeleton className="mt-4 h-16 w-full" />
          </>
        ) : (
          <>
            <p className="text-[32px] leading-10 font-semibold tracking-tight text-zinc-950 tabular-nums">{total}</p>
            <p className="text-[13px] text-zinc-500">requests for your tools</p>
            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-zinc-100">
              {counts
                .filter((item) => item.count > 0)
                .map((item) => (
                  <div
                    key={item.key}
                    className={`${item.bar} transition-all`}
                    style={{ width: `${(item.count / total) * 100}%` }}
                  />
                ))}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {counts.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-2 text-[13px]">
                  <dt className="flex items-center gap-2 text-zinc-500">
                    <span aria-hidden className={`size-2 rounded-full ${item.bar}`} />
                    {item.label}
                  </dt>
                  <dd className="font-semibold text-zinc-900 tabular-nums">{item.count}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </Panel>
  );
}

function AutomationFeed({
  incoming,
  requests,
  now,
}: {
  incoming: LoanView[] | undefined;
  requests: LoanView[] | undefined;
  now: number;
}) {
  const feed =
    incoming && requests
      ? [...incoming, ...requests]
          .flatMap((loan) => loan.activity.map((item) => ({ ...item, toolName: loan.toolName, key: `${loan.id}-${item.id}` })))
          .sort((a, b) => b.at - a.at)
          .slice(0, 7)
      : undefined;

  return (
    <Panel
      title="Automation"
      icon={<ActivityIcon />}
      description="Emails and reminders sent by the n8n workflows."
    >
      {feed === undefined ? (
        <RowsSkeleton rows={4} />
      ) : feed.length === 0 ? (
        <PanelEmpty
          icon={<ActivityIcon />}
          title="Nothing sent yet"
          body="Every request, approval, decline and return triggers an email."
        />
      ) : (
        <ul className="relative px-5 py-4">
          <span aria-hidden className="absolute top-6 bottom-6 left-[23.5px] w-px bg-zinc-200" />
          {feed.map((item) => (
            <li key={item.key} className="relative flex gap-3 py-1.5">
              <span aria-hidden className={`mt-[7px] size-[7px] shrink-0 rounded-full ring-2 ${ACTIVITY_DOT[item.status]}`} />
              <div className="min-w-0 text-[13px]">
                <p className="text-zinc-800">{activityLabel(item)}</p>
                <p className="truncate text-zinc-400">
                  {item.toolName} · {relativeTime(item.at, now)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PanelEmpty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-xl bg-zinc-50 text-zinc-400 ring-1 ring-inset ring-zinc-950/[0.06] [&_svg]:size-5">
        {icon}
      </span>
      <p className="text-sm font-medium text-zinc-900">{title}</p>
      <p className="mt-1 max-w-xs text-[13px] text-zinc-500">{body}</p>
    </div>
  );
}

function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" className="space-y-4 px-5 py-4">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
