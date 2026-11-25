"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge, EmptyState, Loading } from "./ui";

/** Read-only list for visitors: name, category and availability, nothing about owners. */
export function PublicToolList() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) return <Loading label="Loading tools…" />;
  if (tools.length === 0) {
    return <EmptyState title="No tools listed yet">Sign in and be the first to lend one.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
      {tools.map((tool, index) => (
        // The public query returns no ids on purpose, so the index is the key.
        <li key={index} className="flex items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-medium text-stone-900">{tool.name}</p>
            <p className="text-sm text-stone-500">{tool.category}</p>
          </div>
          {tool.available ? <Badge tone="green">Available</Badge> : <Badge>On loan</Badge>}
        </li>
      ))}
    </ul>
  );
}
