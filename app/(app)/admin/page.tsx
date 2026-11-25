"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { ActivityList } from "@/components/ActivityList";
import { ConfirmButton } from "@/components/ConfirmButton";
import { useCurrentUser } from "@/components/CurrentUser";
import { LoanStatusBadge } from "@/components/LoanStatusBadge";
import { Badge, Button, Card, EmptyState, FormError, Loading, PageHeader, SectionTitle } from "@/components/ui";
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
    return <EmptyState title="Admins only">Your account doesn&apos;t have access to this page.</EmptyState>;
  }
  return (
    <>
      <PageHeader title="Admin" description="Moderate listings, view every loan and fix failed automation." />
      <div className="space-y-10">
        <AutomationFailures />
        <Users />
        <Listings />
        <Loans />
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

function AutomationFailures() {
  const failures = useQuery(api.admin.listAutomationFailures);
  const retry = useRunner(useMutation(api.admin.retryNotification));
  const now = useNow();

  return (
    <section>
      <SectionTitle count={failures?.length}>Automation failures</SectionTitle>
      {failures === undefined ? (
        <Loading />
      ) : failures.length === 0 ? (
        <EmptyState title="No failed notifications, reminders or workflow runs" />
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {failures.map((row) => (
            <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-stone-900">{activityLabel({ ...row, status: "failed" })}</p>
                {row.detail && <p className="text-stone-600">{row.detail}</p>}
                {row.error && <p className="text-red-700">{row.error}</p>}
                <p className="text-xs text-stone-500">{relativeTime(row.at, now)}</p>
              </div>
              {row.canRetry && (
                <Button variant="secondary" disabled={retry.busy} onClick={() => retry.run({ eventId: row.id })}>
                  Retry
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
      <div className="mt-2">
        <FormError message={retry.error} />
      </div>
    </section>
  );
}

function Users() {
  const users = useQuery(api.admin.listUsers);
  const setTrusted = useRunner(useMutation(api.admin.setTrustedLender));

  return (
    <section>
      <SectionTitle count={users?.length}>Users</SectionTitle>
      {users === undefined ? (
        <Loading />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Trusted lender</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-2 text-stone-900">{user.name}</td>
                  <td className="px-4 py-2 text-stone-600">{user.email}</td>
                  <td className="px-4 py-2">
                    {user.role === "admin" ? <Badge tone="amber">Admin</Badge> : <Badge>User</Badge>}
                  </td>
                  <td className="px-4 py-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-emerald-700"
                        checked={user.trustedLender}
                        disabled={setTrusted.busy}
                        onChange={(e) => setTrusted.run({ userId: user.id, trusted: e.target.checked })}
                      />
                      <span className="sr-only">Mark {user.name} as a trusted lender</span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <div className="mt-2">
        <FormError message={setTrusted.error} />
      </div>
    </section>
  );
}

type AdminTool = FunctionReturnType<typeof api.admin.listTools>[number];

function Listings() {
  const tools = useQuery(api.admin.listTools);
  return (
    <section>
      <SectionTitle count={tools?.length}>Listings</SectionTitle>
      {tools === undefined ? (
        <Loading />
      ) : tools.length === 0 ? (
        <EmptyState title="No listings" />
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {tools.map((tool) => (
            <ListingRow key={tool.id} tool={tool} />
          ))}
        </Card>
      )}
    </section>
  );
}

function ListingRow({ tool }: { tool: AdminTool }) {
  const remove = useRunner(useMutation(api.tools.remove));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <div>
        <p className="font-medium text-stone-900">{tool.name}</p>
        <p className="text-stone-500">
          {tool.category} · listed by {tool.ownerName}
        </p>
        <FormError message={remove.error} />
      </div>
      <ConfirmButton confirmLabel="Remove listing" disabled={remove.busy} onConfirm={() => remove.run({ toolId: tool.id })}>
        Remove
      </ConfirmButton>
    </div>
  );
}

function Loans() {
  const loans = useQuery(api.admin.listLoans);
  return (
    <section>
      <SectionTitle count={loans?.length}>All loans</SectionTitle>
      {loans === undefined ? (
        <Loading />
      ) : loans.length === 0 ? (
        <EmptyState title="No loans yet" />
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <Card key={loan.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{loan.toolName}</p>
                  <p className="text-stone-600">{formatRange(loan.startDate, loan.endDate)}</p>
                  <p className="text-stone-500">
                    {loan.borrowerName} borrowing from {loan.lenderName}
                  </p>
                </div>
                <LoanStatusBadge status={loan.status} overdue={loan.overdue} />
              </div>
              <ActivityList activity={loan.activity} />
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
