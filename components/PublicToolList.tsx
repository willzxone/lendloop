"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CategoryIcon } from "./category";
import { CompassIcon } from "./icons";
import { EmptyState, Skeleton } from "./ui";

/** Read-only list for visitors: available tools by name and category, nothing about owners. */
export function PublicToolList() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) {
    return (
      <div role="status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <span className="sr-only">Loading tools…</span>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    );
  }
  if (tools.length === 0) {
    return (
      <EmptyState icon={<CompassIcon />} title="Nothing available right now">
        Sign in to list a tool of your own.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool, index) => (
        // The public query returns no ids on purpose, so the index is the key.
        <li
          key={index}
          className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-zinc-950/[0.07] transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <CategoryIcon category={tool.category} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900">{tool.name}</p>
            <p className="text-[13px] text-zinc-500">{tool.category}</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        </li>
      ))}
    </ul>
  );
}
