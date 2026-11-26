"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { CategoryGlyph } from "@/components/category";
import { CompassIcon, SearchIcon } from "@/components/icons";
import { NewToolButton } from "@/components/NewToolButton";
import { ToolCard } from "@/components/ToolCard";
import { Button, EmptyState, PageHeader, Skeleton, Switch, inputClass } from "@/components/ui";
import { api } from "@/convex/_generated/api";
import { TOOL_CATEGORIES, type ToolCategory } from "@/convex/lib/constants";

export default function BrowsePage() {
  const [category, setCategory] = useState<ToolCategory | "">("");
  const [search, setSearch] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const result = useQuery(api.tools.browse, category ? { category } : {});

  // Keep showing the previous results while a new category loads, instead of flashing a skeleton.
  const [lastResult, setLastResult] = useState(result);
  if (result !== undefined && result !== lastResult) setLastResult(result);
  const tools = result ?? lastResult;
  const stale = result === undefined && lastResult !== undefined;

  const query = search.trim().toLowerCase();
  const visible = (tools ?? []).filter(
    (tool) =>
      (!availableOnly || tool.available) &&
      (!query ||
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.owner.name.toLowerCase().includes(query)),
  );
  const availableCount = (tools ?? []).filter((tool) => tool.available).length;
  const filtered = query !== "" || availableOnly;

  return (
    <>
      <PageHeader
        eyebrow="Browse"
        title="Find something to borrow"
        description="Everything your neighbours are happy to lend. Pick dates and send a request."
        action={
          <div className="relative w-full sm:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
            <label htmlFor="tool-search" className="sr-only">
              Search tools
            </label>
            <input
              id="tool-search"
              type="search"
              className={`${inputClass} h-10 pl-9`}
              placeholder="Search drills, ladders, people…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        }
      />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="group" aria-label="Filter by category" className="flex w-max gap-2 pb-1">
          <CategoryChip active={category === ""} onClick={() => setCategory("")} label="All tools" />
          {TOOL_CATEGORIES.map((c) => (
            <CategoryChip key={c} active={category === c} onClick={() => setCategory(c)} label={c} category={c} />
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-zinc-500" aria-live="polite">
          {tools === undefined ? (
            "Loading tools…"
          ) : (
            <>
              <span className="font-semibold text-zinc-900 tabular-nums">{visible.length}</span>{" "}
              {visible.length === 1 ? "tool" : "tools"}
              {!availableOnly && (
                <>
                  {" "}
                  · <span className="tabular-nums">{availableCount}</span> available now
                </>
              )}
            </>
          )}
        </p>
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-zinc-700">
          <Switch checked={availableOnly} onChange={setAvailableOnly} label="Available only" />
          <span aria-hidden>Available only</span>
        </label>
      </div>

      {tools === undefined ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Loading tools…</span>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-zinc-950/[0.07]">
              <div className="flex justify-between">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-4 h-10 w-full" />
              <Skeleton className="mt-5 h-8 w-full" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={filtered ? <SearchIcon /> : <CompassIcon />}
          title={filtered ? "No tools match" : category ? `Nothing in ${category} yet` : "No tools listed yet"}
          action={
            filtered ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setAvailableOnly(false);
                }}
              >
                Clear filters
              </Button>
            ) : (
              <NewToolButton variant="secondary" label="List one of yours" />
            )
          }
        >
          {filtered
            ? "Try a different search, or include tools that are out on loan."
            : category
              ? "Try another category, or be the first to list one."
              : "Be the first. List a tool you're happy to lend."}
        </EmptyState>
      ) : (
        <div
          className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${stale ? "opacity-60" : ""}`}
          aria-busy={stale}
        >
          {visible.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  category,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  category?: ToolCategory;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
        active
          ? "bg-zinc-900 text-white shadow-sm"
          : "bg-white text-zinc-600 ring-1 ring-inset ring-zinc-950/10 hover:text-zinc-900 hover:ring-zinc-950/20"
      }`}
    >
      {category && (
        <CategoryGlyph category={category} className={`size-3.5 ${active ? "text-emerald-300" : "text-zinc-400"}`} />
      )}
      {label}
    </button>
  );
}
