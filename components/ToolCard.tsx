"use client";

import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";
import type { api } from "@/convex/_generated/api";
import { formatRange } from "@/lib/format";
import { CONDITION_TONE, CategoryIcon } from "./category";
import { ArrowRightIcon, CalendarIcon, CheckCircleIcon, ShieldCheckIcon } from "./icons";
import { RequestForm } from "./RequestForm";
import { Avatar, Badge, Button, Modal } from "./ui";

type BrowseTool = FunctionReturnType<typeof api.tools.browse>[number];

export function ToolCard({ tool }: { tool: BrowseTool }) {
  const [requesting, setRequesting] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <article className="group flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-zinc-950/[0.07] transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <CategoryIcon category={tool.category} />
        {tool.available ? (
          <Badge tone="green" dot>
            Available
          </Badge>
        ) : (
          <Badge tone="amber" dot>
            On loan
          </Badge>
        )}
      </div>

      <h3 className="mt-4 text-[15px] font-semibold text-zinc-950">{tool.name}</h3>
      <p className="mt-0.5 flex items-center gap-2 text-[13px] text-zinc-500">
        {tool.category}
        <span className="text-zinc-300">·</span>
        <Badge tone={CONDITION_TONE[tool.condition]}>
          <span className="capitalize">{tool.condition}</span>
        </Badge>
      </p>

      {tool.description && <p className="mt-3 line-clamp-2 text-sm text-zinc-600">{tool.description}</p>}

      {tool.booked.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tool.booked.map((b) => (
            <span
              key={`${b.startDate}-${b.endDate}`}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-950/[0.06]"
            >
              <CalendarIcon className="size-3 text-zinc-400" />
              Booked {formatRange(b.startDate, b.endDate)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-zinc-950/[0.06] pt-4">
          <p className="flex min-w-0 items-center gap-2 text-[13px]">
            <Avatar name={tool.owner.name} size="sm" />
            <span className="truncate font-medium text-zinc-800">{tool.isMine ? "You" : tool.owner.name}</span>
            {tool.owner.trustedLender && (
              <span title="Trusted lender" className="text-emerald-600">
                <ShieldCheckIcon className="size-4" />
                <span className="sr-only">Trusted lender</span>
              </span>
            )}
          </p>
          {tool.isMine ? (
            <span className="text-xs font-medium text-zinc-400">Your listing</span>
          ) : sent ? (
            <Link
              href="/requests"
              role="status"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 hover:text-emerald-800"
            >
              <CheckCircleIcon className="size-4" />
              Request sent
            </Link>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setRequesting(true)}>
              Request
              <ArrowRightIcon />
            </Button>
          )}
        </div>
        {!tool.isMine && !sent && tool.myPendingRequests > 0 && (
          <p className="mt-2 text-xs text-amber-700">You already have a pending request for this tool.</p>
        )}
      </div>

      <Modal
        open={requesting}
        onClose={() => setRequesting(false)}
        title={`Borrow ${tool.name}`}
        description={
          <>
            From {tool.owner.name}. They&apos;ll get an email and can approve or decline.
          </>
        }
        icon={<CategoryIcon category={tool.category} size="md" />}
      >
        {tool.booked.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 text-[13px] font-medium text-zinc-800">Already booked</p>
            <div className="flex flex-wrap gap-1.5">
              {tool.booked.map((b) => (
                <Badge key={`${b.startDate}-${b.endDate}`} tone="amber">
                  {formatRange(b.startDate, b.endDate)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <RequestForm
          toolId={tool.id}
          onCancel={() => setRequesting(false)}
          onDone={() => {
            setRequesting(false);
            setSent(true);
          }}
        />
      </Modal>
    </article>
  );
}
