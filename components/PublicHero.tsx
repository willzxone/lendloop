"use client";

import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { useCurrentUser } from "./CurrentUser";

export function PublicHero() {
  const user = useCurrentUser();
  return (
    <section className="py-6">
      <h1 className="text-4xl font-semibold tracking-tight text-stone-900">LendLoop</h1>
      <p className="mt-2 max-w-xl text-lg text-stone-600">
        Borrow tools from your neighbours. Lend yours out.
      </p>
      <div className="mt-6">
        {user.status === "signed-out" ? (
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Sign in to lend or borrow
            </button>
          </SignInButton>
        ) : user.status === "loading" ? null : (
          <Link
            href="/tools"
            className="inline-block rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
          >
            Browse and request tools
          </Link>
        )}
      </div>
    </section>
  );
}
