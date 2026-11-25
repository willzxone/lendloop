"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { ToolCard } from "@/components/ToolCard";
import { EmptyState, Loading, PageHeader, inputClass } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { TOOL_CATEGORIES, type ToolCategory } from "@/convex/lib/constants";

export default function BrowsePage() {
  const [category, setCategory] = useState<ToolCategory | "">("");
  const tools = useQuery(api.tools.browse, category ? { category } : {});

  return (
    <>
      <PageHeader
        title="Browse tools"
        description="Pick a tool and ask to borrow it for a few days."
        action={
          <div className="flex items-center gap-2">
            <label htmlFor="category-filter" className="text-sm text-stone-600">
              Category
            </label>
            <select
              id="category-filter"
              className={`${inputClass} w-48`}
              value={category}
              onChange={(e) => setCategory(e.target.value as ToolCategory | "")}
            >
              <option value="">All categories</option>
              {TOOL_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        }
      />
      {tools === undefined ? (
        <Loading label="Loading tools…" />
      ) : tools.length === 0 ? (
        <EmptyState title={category ? `Nothing in ${category} yet` : "No tools listed yet"}>
          {category ? "Try another category." : "List one of yours under My listings."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </>
  );
}
