"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { ActivityList } from "@/components/ActivityList";
import { CategoryIcon } from "@/components/category";
import { ConfirmButton } from "@/components/ConfirmButton";
import { useCurrentUser } from "@/components/CurrentUser";
import {
  ActivityIcon,
  AlertIcon,
  CheckCircleIcon,
  LockIcon,
  PackageIcon,
  RetryIcon,
  SendIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/icons";
import { LoanStatusBadge } from "@/components/LoanStatusBadge";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  FormError,
  PageHeader,
  Panel,
  Skeleton,
  StatCard,
  Switch,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import { activityLabel, formatRange, relativeTime } from "@/lib/format";
import { useNow } from "@/lib/useNow";

/**
 * Admin tools. The nav link is only shown to admins, but the real check is
 * requireAdmin() in every convex/admin.ts function.
 */
export default function AdminPage() {
  const user = useCurrentUser();
  if (user.status === "ready" && user.me.role !== "admin") {
    return (
      <EmptyState icon={<LockIcon />} title="Admins only">
        Your account doesn&apos;t have access to this page.
      </EmptyState>
    );
  }
  return <AdminDashboard />;
}

function AdminDashboard() {
  const failures = useQuery(api.admin.listAutomationFailures);
  const users = useQuery(api.admin.listUsers);
  const tools = useQuery(api.admin.listTools);
  const loans = useQuery(api.admin.listLoans);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Workspace health"
        description="Moderate listings, see every loan, and fix failed automation."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Automation failures"
          value={failures?.length ?? 0}
          icon={<AlertIcon />}
          tone={failures && failures.length > 0 ? "red" : "green"}
          loading={failures === undefined}
          hint={failures && failures.length > 0 ? "Need a look" : "All workflows healthy"}
        />
        <StatCard
          label="Members"
          value={users?.length ?? 0}
          icon={<UsersIcon />}
          tone="blue"
          loading={users === undefined}
          hint={`${users?.filter((u) => u.trustedLender).length ?? 0} trusted lenders`}
        />
        <StatCard label="Listings" value={tools?.length ?? 0} icon={<PackageIcon />} tone="violet" loading={tools === undefined} />
        <StatCard
          label="Loans"
          value={loans?.length ?? 0}
          icon={<SendIcon />}
          tone="amber"
          loading={loans === undefined}
          hint={`${loans?.filter((l) => l.overdue).length ?? 0} overdue`}
        />
      </div>

      <div className="space-y-6">
        <AutomationFailures failures={failures} />
        <Users users={users} />
        <div className="grid gap-6 xl:grid-cols-2">
          <Listings tools={tools} />
          <Loans loans={loans} />
        </div>
      </div>
    </>
  );
}

/** Runs a mutation and keeps its busy and error state for the button that triggered it. */
function useRunner<A>(fn: (args: A) => Promise<unknown>) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(args: A) {
    setBusy(true);
    setError(null);
    try {
      await fn(args);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error };
}

type Failure = FunctionReturnType<typeof api.admin.listAutomationFailures>[number];

function AutomationFailures({ failures }: { failures: Failure[] | undefined }) {
  const retry = useRunner(useMutation(api.admin.retryNotification));
  const now = useNow();

  return (
    <Panel
      title="Automation failures"
      count={failures?.length}
      icon={<ActivityIcon />}
      description="Notifications, reminders and n8n workflow runs that gave up."
    >
      {failures === undefined ? (
        <TableSkeleton />
      ) : failures.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/15">
            <CheckCircleIcon className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900">Everything is running</p>
            <p className="text-[13px] text-zinc-500">No failed notifications, reminders or workflow runs.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-950/[0.06]">
          {failures.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/15">
                  <AlertIcon className="size-4" />
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-zinc-900">{activityLabel({ ...row, status: "failed" })}</p>
                  {row.detail && <p className="text-[13px] text-zinc-600">{row.detail}</p>}
                  {row.error && (
                    <p className="mt-1 rounded-md bg-red-50 px-2 py-1 font-mono text-xs break-all text-red-700">
                      {row.error}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">{relativeTime(row.at, now)}</p>
                </div>
              </div>
              {row.canRetry && (
                <Button size="sm" variant="secondary" disabled={retry.busy} onClick={() => retry.run({ eventId: row.id })}>
                  <RetryIcon />
                  Retry
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {retry.error && (
        <div className="px-5 pb-4">
          <FormError message={retry.error} />
        </div>
      )}
    </Panel>
  );
}

type AdminUser = FunctionReturnType<typeof api.admin.listUsers>[number];

function Users({ users }: { users: AdminUser[] | undefined }) {
  const setTrusted = useRunner(useMutation(api.admin.setTrustedLender));

  return (
    <Panel title="Members" count={users?.length} icon={<UsersIcon />} description="Trusted lenders get a badge next to their name.">
      {users === undefined ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-zinc-500">
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 text-right font-medium">Trusted lender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-950/[0.06] border-t border-zinc-950/[0.06]">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-zinc-50/70">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={user.name} size="sm" />
                      <span className="font-medium text-zinc-900">{user.name}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500">{user.email}</td>
                  <td className="px-5 py-3">
                    {user.role === "admin" ? (
                      <Badge tone="amber" dot>
                        Admin
                      </Badge>
                    ) : (
                      <Badge>Member</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Switch
                      checked={user.trustedLender}
                      disabled={setTrusted.busy}
                      label={`Mark ${user.name} as a trusted lender`}
                      onChange={(trusted) => setTrusted.run({ userId: user.id, trusted })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {setTrusted.error && (
        <div className="px-5 pb-4">
          <FormError message={setTrusted.error} />
        </div>
      )}
    </Panel>
  );
}

type AdminTool = FunctionReturnType<typeof api.admin.listTools>[number];

function Listings({ tools }: { tools: AdminTool[] | undefined }) {
  return (
    <Panel title="Listings" count={tools?.length} icon={<PackageIcon />}>
      {tools === undefined ? (
        <TableSkeleton />
      ) : tools.length === 0 ? (
        <div className="p-5">
          <EmptyState compact title="No listings" />
        </div>
      ) : (
        <ul className="divide-y divide-zinc-950/[0.06]">
          {tools.map((tool) => (
            <ListingRow key={tool.id} tool={tool} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ListingRow({ tool }: { tool: AdminTool }) {
  const remove = useRunner(useMutation(api.tools.remove));
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <CategoryIcon category={tool.category} size="sm" />
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium text-zinc-900">{tool.name}</p>
          <p className="text-[13px] text-zinc-500">
            {tool.category} · listed by {tool.ownerName}
          </p>
          <FormError message={remove.error} />
        </div>
      </div>
      <ConfirmButton
        size="sm"
        confirmLabel="Remove listing"
        disabled={remove.busy}
        onConfirm={() => remove.run({ toolId: tool.id })}
      >
        <TrashIcon />
        Remove
      </ConfirmButton>
    </li>
  );
}

type AdminLoan = FunctionReturnType<typeof api.admin.listLoans>[number];

function Loans({ loans }: { loans: AdminLoan[] | undefined }) {
  return (
    <Panel title="All loans" count={loans?.length} icon={<SendIcon />}>
      {loans === undefined ? (
        <TableSkeleton />
      ) : loans.length === 0 ? (
        <div className="p-5">
          <EmptyState compact title="No loans yet" />
        </div>
      ) : (
        <ul className="divide-y divide-zinc-950/[0.06]">
          {loans.map((loan) => (
            <li key={loan.id} className="px-5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-zinc-900">{loan.toolName}</p>
                  <p className="text-[13px] text-zinc-500">
                    {loan.borrowerName} from {loan.lenderName} · {formatRange(loan.startDate, loan.endDate)}
                  </p>
                </div>
                <LoanStatusBadge status={loan.status} overdue={loan.overdue} />
              </div>
              {loan.activity.length > 0 && (
                <details className="group mt-1">
                  <summary className="cursor-pointer list-none text-xs font-medium text-zinc-400 hover:text-zinc-700 [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">Show activity ({loan.activity.length})</span>
                    <span className="hidden group-open:inline">Hide activity</span>
                  </summary>
                  <ActivityList activity={loan.activity} />
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TableSkeleton() {
  return (
    <div role="status" className="space-y-3 px-5 py-4">
      <span className="sr-only">Loading…</span>
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}
