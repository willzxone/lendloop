"use client";

import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { TOOL_CATEGORIES } from "@/convex/lib/constants";
import { useCurrentUser } from "./CurrentUser";
import { ArrowRightIcon } from "./icons";
import { Button, Skeleton, buttonClass } from "./ui";

export function PublicHero() {
  const user = useCurrentUser();
  const tools = useQuery(api.tools.listPublic);

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="bg-dots absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden
        className="absolute -top-48 left-1/2 -z-10 h-[520px] w-[900px] max-w-[160vw] -translate-x-1/2 rounded-full bg-linear-to-tr from-emerald-200/70 via-teal-100/50 to-sky-100/60 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[13px] font-medium text-zinc-700 shadow-xs ring-1 ring-zinc-950/[0.08] backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Tool lending for your neighbourhood
        </p>

        <h1 className="mx-auto mt-7 max-w-3xl text-[44px] leading-[1.05] font-semibold tracking-tight text-zinc-950 sm:text-6xl sm:leading-[1.05]">
          Borrow the drill.{" "}
          <span className="bg-linear-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text pb-1 text-transparent sm:block">
            Skip the shop.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-600">
          Most tools spend the year in a shed. LendLoop lets neighbours lend them out: pick your dates, get a yes,
          and get a reminder before it&apos;s due back.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {user.status === "loading" ? (
            <Skeleton className="h-11 w-64 rounded-xl" />
          ) : user.status === "signed-out" ? (
            <>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                <Button size="lg" className="shadow-glow">
                  Start lending and borrowing
                  <ArrowRightIcon />
                </Button>
              </SignInButton>
              <a href="#available" className={buttonClass("secondary", "lg")}>
                See what&apos;s available
              </a>
            </>
          ) : (
            <>
              <Link href="/dashboard" className={buttonClass("primary", "lg", "shadow-glow")}>
                Open your dashboard
                <ArrowRightIcon />
              </Link>
              <Link href="/tools" className={buttonClass("secondary", "lg")}>
                Browse tools
              </Link>
            </>
          )}
        </div>

        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-3 divide-x divide-zinc-950/[0.08] rounded-2xl bg-white/70 py-5 shadow-card ring-1 ring-zinc-950/[0.06] backdrop-blur">
          <Stat label="Available right now" value={tools === undefined ? undefined : tools.length} />
          <Stat label="Tool categories" value={TOOL_CATEGORIES.length} />
          <Stat label="Cost to borrow" value="Free" />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="px-3">
      <dt className="text-xs text-zinc-500 sm:text-[13px]">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 tabular-nums sm:text-3xl">
        {value === undefined ? <Skeleton className="mx-auto h-8 w-10" /> : value}
      </dd>
    </div>
  );
}
