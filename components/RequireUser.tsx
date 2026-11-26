"use client";

import { SignInButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { useCurrentUser } from "./CurrentUser";
import { AlertIcon, LockIcon } from "./icons";
import { LogoMark } from "./Logo";
import { Button, Skeleton } from "./ui";

/** Renders app pages only once the user is signed in and known to Convex. */
export function RequireUser({ children }: { children: ReactNode }) {
  const user = useCurrentUser();

  switch (user.status) {
    case "loading":
      return <PageSkeleton />;
    case "signed-out":
      return (
        <Gate
          icon={<LogoMark size="lg" />}
          title="Sign in to LendLoop"
          body="Borrow tools from people nearby, or lend out the ones gathering dust in your shed."
        >
          <SignInButton mode="modal">
            <Button size="lg" className="w-full">
              <LockIcon />
              Sign in to continue
            </Button>
          </SignInButton>
        </Gate>
      );
    case "token-rejected":
      return (
        <Gate
          icon={<IconBadge tone="amber" icon={<AlertIcon />} />}
          title="Signed in, but the backend rejected the session"
          body={
            <>
              Convex could not verify the Clerk token. Check that the Convex integration is active in the Clerk
              dashboard and that <code className="font-mono text-[13px]">CLERK_JWT_ISSUER_DOMAIN</code> on the
              Convex deployment matches your Clerk Frontend API URL. See &ldquo;Clerk setup&rdquo; in the README.
            </>
          }
        />
      );
    case "error":
      return (
        <Gate
          icon={<IconBadge tone="red" icon={<AlertIcon />} />}
          title="Something went wrong"
          body={<span role="alert">{user.message}</span>}
        />
      );
    case "ready":
      return <>{children}</>;
  }
}

function Gate({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lift ring-1 ring-zinc-950/[0.07]">
        <div className="mb-5 flex justify-center">{icon}</div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">{body}</p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}

function IconBadge({ tone, icon }: { tone: "amber" | "red"; icon: ReactNode }) {
  const styles = tone === "amber" ? "bg-amber-50 text-amber-600 ring-amber-600/20" : "bg-red-50 text-red-600 ring-red-600/20";
  return <span className={`grid size-11 place-items-center rounded-xl ring-1 ring-inset [&_svg]:size-5 ${styles}`}>{icon}</span>;
}

function PageSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-72 rounded-2xl" />
    </div>
  );
}
