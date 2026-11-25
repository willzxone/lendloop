"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { EmptyState, Loading } from "./ui";

/** Read-only list for visitors: available tools by name and category, nothing about owners. */
export function PublicToolList() {
  const tools = useQuery(api.tools.listPublic);

  if (tools === undefined) return <Loading label="Loading tools…" />;
  if (tools.length === 0) {
    return <EmptyState title="Nothing available right now">Sign in to list a tool of your own.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
      {tools.map((tool, index) => (
        // The public query returns no ids on purpose, so the index is the key.
        <li key={index} className="flex items-center justify-between gap-4 px-4 py-3">
          <p className="font-medium text-stone-900">{tool.name}</p>
          <p className="text-sm text-stone-500">{tool.category}</p>
        </li>
      ))}
    </ul>
  );
}
