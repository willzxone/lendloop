"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";
import { CONDITION_TONE, CategoryIcon } from "@/components/category";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CheckCircleIcon, ClockIcon, InboxIcon, PackageIcon, PencilIcon, TrashIcon } from "@/components/icons";
import { NewToolButton } from "@/components/NewToolButton";
import { ToolForm } from "@/components/ToolForm";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormError,
  Modal,
  PageHeader,
  SkeletonList,
  StatCard,
} from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";

type MyTool = FunctionReturnType<typeof api.tools.mine>[number];

export default function MyListingsPage() {
  const tools = useQuery(api.tools.mine);
  const loading = tools === undefined;
  const available = tools?.filter((tool) => tool.available).length ?? 0;
  const pending = tools?.reduce((sum, tool) => sum + tool.pendingRequests, 0) ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Lending"
        title="My listings"
        description="The tools you're happy to lend. Edit them any time."
        action={<NewToolButton />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Listed" value={tools?.length ?? 0} icon={<PackageIcon />} tone="violet" loading={loading} />
        <StatCard
          label="Available now"
          value={available}
          icon={<CheckCircleIcon />}
          tone="green"
          loading={loading}
          hint={tools && tools.length > available ? `${tools.length - available} out on loan` : "Ready to lend"}
        />
        <StatCard
          label="Pending requests"
          value={pending}
          icon={<InboxIcon />}
          tone={pending > 0 ? "amber" : "neutral"}
          href="/incoming"
          loading={loading}
          hint={pending > 0 ? "Answer them under Incoming" : "Nothing waiting"}
        />
      </div>

      {tools === undefined ? (
        <SkeletonList rows={3} label="Loading your listings…" />
      ) : tools.length === 0 ? (
        <EmptyState
          icon={<PackageIcon />}
          title="You haven't listed anything yet"
          action={<NewToolButton label="List your first tool" />}
        >
          Got a drill or a ladder that sits in the shed most of the year? List it and let a neighbour use it.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <ListingRow key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </>
  );
}

function ListingRow({ tool }: { tool: MyTool }) {
  const updateTool = useMutation(api.tools.update);
  const removeTool = useMutation(api.tools.remove);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await removeTool({ toolId: tool.id });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex gap-4">
        <CategoryIcon category={tool.category} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-zinc-950">{tool.name}</h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-zinc-500">
                {tool.category}
                <span className="text-zinc-300">·</span>
                <Badge tone={CONDITION_TONE[tool.condition]}>
                  <span className="capitalize">{tool.condition}</span>
                </Badge>
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <PencilIcon />
                Edit
              </Button>
              <ConfirmButton size="sm" confirmLabel="Remove listing" onConfirm={remove} disabled={busy}>
                <TrashIcon />
                Remove
              </ConfirmButton>
            </div>
          </div>

          {tool.description && <p className="mt-2 max-w-2xl text-sm text-zinc-600">{tool.description}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tool.available ? (
              <Badge tone="green" dot>
                Available
              </Badge>
            ) : (
              <Badge tone="amber" dot>
                On loan
              </Badge>
            )}
            {tool.approvedLoans > 0 && (
              <Badge tone="neutral" icon={<ClockIcon />}>
                {tool.approvedLoans} booked
              </Badge>
            )}
            {tool.pendingRequests > 0 && (
              <Link
                href="/incoming"
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                <Badge tone="blue" icon={<InboxIcon />}>
                  {tool.pendingRequests} pending request{tool.pendingRequests === 1 ? "" : "s"}
                </Badge>
              </Link>
            )}
          </div>

          {tool.pendingRequests > 0 && (
            <p className="mt-2 text-xs text-zinc-400">
              Removing this listing declines its pending requests and tells the borrowers.
            </p>
          )}
          {error && (
            <div className="mt-3">
              <FormError message={error} />
            </div>
          )}
        </div>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        size="lg"
        icon={<PencilIcon />}
        title={`Edit ${tool.name}`}
        description="Changes show up for borrowers straight away."
      >
        <ToolForm
          idPrefix={`edit-${tool.id}`}
          initial={{
            name: tool.name,
            category: tool.category,
            condition: tool.condition,
            description: tool.description,
          }}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await updateTool({ toolId: tool.id, ...values });
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </Card>
  );
}
