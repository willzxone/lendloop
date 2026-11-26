"use client";

import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "./CurrentUser";
import {
  ArrowRightIcon,
  CompassIcon,
  DashboardIcon,
  InboxIcon,
  PackageIcon,
  SendIcon,
  ShieldCheckIcon,
  ShieldIcon,
} from "./icons";
import { Logo } from "./Logo";
import { Button, Skeleton, buttonClass } from "./ui";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  count?: number;
  countTone?: "green" | "red";
};
type NavSection = { label?: string; items: NavItem[] };

/** Marketing chrome on the home page, sidebar app chrome everywhere else. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useCurrentUser();
  // Visitors on an app page only see the sign-in gate, so they get the public chrome, not an empty sidebar.
  if (pathname === "/" || user.status === "signed-out") return <PublicShell>{children}</PublicShell>;
  return <DashboardShell pathname={pathname}>{children}</DashboardShell>;
}

/* ------------------------------------------------------------------ Public */

function PublicShell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-zinc-950/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {user.status === "loading" ? (
              <Skeleton className="h-9 w-36" />
            ) : user.status === "signed-out" ? (
              <>
                <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <Button variant="ghost">Sign in</Button>
                </SignInButton>
                <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                  <Button variant="dark">Get started</Button>
                </SignUpButton>
              </>
            ) : (
              <>
                <Link href="/dashboard" className={buttonClass("dark")}>
                  Open dashboard
                  <ArrowRightIcon />
                </Link>
                <span className="ml-1 grid">
                  <UserButton />
                </span>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-950/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-[13px] text-zinc-500 sm:px-6">
          <span className="flex items-center gap-2">
            <span className="font-medium text-zinc-700">LendLoop</span>A neighbourhood tool-lending board
          </span>
          <span>Notifications and reminders run on n8n</span>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------------------------------------- Dashboard */

function useNavSections(): NavSection[] {
  const user = useCurrentUser();
  const ready = user.status === "ready";
  const isAdmin = ready && user.me.role === "admin";
  const incoming = useQuery(api.loans.incoming, ready ? {} : "skip");
  const failures = useQuery(api.admin.listAutomationFailures, isAdmin ? {} : "skip");

  if (!ready) return [];

  const waiting = incoming?.filter((loan) => loan.status === "requested").length ?? 0;
  const overdue = incoming?.filter((loan) => loan.overdue).length ?? 0;
  const sections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Overview", icon: <DashboardIcon /> },
        { href: "/tools", label: "Browse tools", icon: <CompassIcon /> },
      ],
    },
    {
      label: "Lending",
      items: [
        { href: "/listings", label: "My listings", icon: <PackageIcon /> },
        {
          href: "/incoming",
          label: "Incoming",
          icon: <InboxIcon />,
          count: overdue > 0 ? overdue : waiting,
          countTone: overdue > 0 ? "red" : "green",
        },
      ],
    },
    {
      label: "Borrowing",
      items: [{ href: "/requests", label: "My requests", icon: <SendIcon /> }],
    },
  ];
  if (isAdmin) {
    sections.push({
      label: "Workspace",
      items: [
        {
          href: "/admin",
          label: "Admin",
          icon: <ShieldIcon />,
          count: failures?.length ?? 0,
          countTone: "red",
        },
      ],
    });
  }
  return sections;
}

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function DashboardShell({ pathname, children }: { pathname: string; children: ReactNode }) {
  const sections = useNavSections();
  const items = sections.flatMap((section) => section.items);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col px-3 pt-4 pb-3 lg:flex">
        <Link
          href="/"
          className="mx-1 rounded-lg px-1.5 py-1 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className="mt-7 flex-1 space-y-6 overflow-y-auto">
          {sections.map((section, index) => (
            <div key={section.label ?? index}>
              {section.label && (
                <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <SidebarLink item={item} active={isActive(pathname, item.href)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <UserBlock />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-950/[0.06] bg-white/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <MobileUser />
        </div>
        {items.length > 0 && (
          <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-2.5">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition [&_svg]:size-3.5 ${
                    active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {!!item.count && (
                    <span
                      className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                        item.countTone === "red" ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Content panel */}
      <div className="lg:pl-64">
        <div className="min-h-screen bg-white lg:my-2 lg:mr-2 lg:min-h-[calc(100vh-1rem)] lg:rounded-2xl lg:shadow-xs lg:ring-1 lg:ring-zinc-950/[0.06]">
          <main className="mx-auto w-full max-w-6xl animate-fade-up px-4 py-8 sm:px-6 lg:px-10 lg:py-10" key={pathname}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition [&_svg]:size-[18px] focus-visible:outline-2 focus-visible:outline-emerald-600 ${
        active
          ? "bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-950/[0.07]"
          : "text-zinc-600 hover:bg-zinc-950/[0.04] hover:text-zinc-950"
      }`}
    >
      <span className={active ? "text-emerald-600" : "text-zinc-400 transition group-hover:text-zinc-600"}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {!!item.count && (
        <span
          className={`min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold tabular-nums ${
            item.countTone === "red" ? "bg-red-500 text-white" : "bg-emerald-600 text-white"
          }`}
        >
          {item.count}
        </span>
      )}
    </Link>
  );
}

function UserBlock() {
  const user = useCurrentUser();
  if (user.status === "loading") {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <Skeleton className="size-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }
  if (user.status === "signed-out") {
    return (
      <SignInButton mode="modal">
        <Button className="w-full">Sign in</Button>
      </SignInButton>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl px-2.5 py-2">
      <span className="grid">
        <UserButton />
      </span>
      {user.status === "ready" ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{user.me.name}</p>
          <p className="flex items-center gap-1 text-xs text-zinc-500">
            {user.me.trustedLender && <ShieldCheckIcon className="size-3.5 text-emerald-600" />}
            {user.me.role === "admin" ? "Admin" : "Member"}
            {user.me.trustedLender && " · Trusted lender"}
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">Account</p>
      )}
    </div>
  );
}

function MobileUser() {
  const user = useCurrentUser();
  if (user.status === "loading") return <Skeleton className="size-7 rounded-full" />;
  if (user.status === "signed-out") {
    return (
      <SignInButton mode="modal">
        <Button size="sm">Sign in</Button>
      </SignInButton>
    );
  }
  return (
    <span className="grid">
      <UserButton />
    </span>
  );
}
