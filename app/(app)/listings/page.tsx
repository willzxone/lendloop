"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ToolForm } from "@/components/ToolForm";
import { Badge, Button, Card, EmptyState, FormError, Loading, PageHeader } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";

type MyTool = FunctionReturnType<typeof api.tools.mine>[number];

export default function MyListingsPage() {
  const tools = useQuery(api.tools.mine);
  const createTool = useMutation(api.tools.create);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeader
        title="My listings"
        description="Tools you're happy to lend."
        action={!adding && <Button onClick={() => setAdding(true)}>List a tool</Button>}
      />

      {adding && (
        <Card className="mb-6">
          <h2 className="mb-4 font-medium text-stone-900">List a tool</h2>
          <ToolForm
            idPrefix="new-tool"
            submitLabel="Publish listing"
            onSubmit={async (values) => {
              await createTool(values);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </Card>
      )}

      {tools === undefined ? (
        <Loading />
      ) : tools.length === 0 ? (
        !adding && (
          <EmptyState title="You haven't listed anything yet">
            Got a drill or a ladder that sits in the shed most of the year? List it.
          </EmptyState>
        )
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

  if (editing) {
    return (
      <Card>
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
      </Card>
    );
  }

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-stone-900">{tool.name}</h3>
          <p className="text-sm text-stone-500">
            {tool.category} · <span className="capitalize">{tool.condition}</span>
          </p>
          {tool.description && <p className="mt-1 text-sm text-stone-700">{tool.description}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {tool.available ? <Badge tone="green">Available</Badge> : <Badge>On loan</Badge>}
            {tool.pendingRequests > 0 && (
              <Link href="/incoming">
                <Badge tone="blue">
                  {tool.pendingRequests} pending request{tool.pendingRequests === 1 ? "" : "s"}
                </Badge>
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <ConfirmButton confirmLabel="Remove listing" onConfirm={remove} disabled={busy}>
            Remove
          </ConfirmButton>
        </div>
      </div>
      {tool.pendingRequests > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          Removing this listing declines its pending requests and tells the borrowers.
        </p>
      )}
      <div className="mt-2">
        <FormError message={error} />
      </div>
    </Card>
  );
}
