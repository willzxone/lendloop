"use client";

import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import type { api } from "@/convex/_generated/api";
import { formatRange } from "@/lib/format";
import { RequestForm } from "./RequestForm";
import { Badge, Button, Card } from "./ui";

type BrowseTool = FunctionReturnType<typeof api.tools.browse>[number];

export function ToolCard({ tool }: { tool: BrowseTool }) {
  const [requesting, setRequesting] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-stone-900">{tool.name}</h3>
          <p className="text-sm text-stone-500">
            {tool.category} · <span className="capitalize">{tool.condition}</span>
          </p>
        </div>
        {tool.available ? <Badge tone="green">Available</Badge> : <Badge>On loan</Badge>}
      </div>

      {tool.description && <p className="mt-2 text-sm text-stone-700">{tool.description}</p>}

      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
        {tool.isMine ? "Your listing" : <>Lent by {tool.owner.name}</>}
        {tool.owner.trustedLender && <Badge tone="green">Trusted lender</Badge>}
      </p>

      {tool.booked.length > 0 && (
        <p className="mt-1 text-xs text-stone-500">
          Booked: {tool.booked.map((b) => formatRange(b.startDate, b.endDate)).join(", ")}
        </p>
      )}

      <div className="mt-auto pt-3">
        {sent && (
          <p role="status" className="text-sm text-emerald-800">
            Request sent. You&apos;ll see the answer under My requests.
          </p>
        )}
        {!tool.isMine && !sent && tool.myPendingRequests > 0 && !requesting && (
          <p className="mb-2 text-xs text-stone-500">You have a pending request for this tool.</p>
        )}
        {!tool.isMine && !requesting && !sent && (
          <Button variant="secondary" onClick={() => setRequesting(true)}>
            Request to borrow
          </Button>
        )}
        {requesting && (
          <RequestForm
            toolId={tool.id}
            onCancel={() => setRequesting(false)}
            onDone={() => {
              setRequesting(false);
              setSent(true);
            }}
          />
        )}
      </div>
    </Card>
  );
}
