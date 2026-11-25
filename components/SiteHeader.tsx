"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "./CurrentUser";
import { Badge } from "./ui";

const NAV = [
  { href: "/tools", label: "Browse" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
];

export function SiteHeader() {
  const user = useCurrentUser();
  const pathname = usePathname();
  const links =
    user.status === "ready" && user.me.role === "admin" ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-emerald-800">
          LendLoop
        </Link>

        {user.status === "ready" && (
          <nav aria-label="Main" className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${
                    active ? "bg-stone-100 font-medium text-stone-900" : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {user.status === "ready" && user.me.trustedLender && <Badge tone="green">Trusted lender</Badge>}
          {user.status === "signed-out" ? (
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Sign in
              </button>
            </SignInButton>
          ) : (
            <UserButton />
          )}
        </div>
      </div>
    </header>
  );
}
