"use client";

import { SignInButton } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { useCurrentUser } from "./CurrentUser";
import { Button, Card, Loading } from "./ui";

/** Renders app pages only once the user is signed in and known to Convex. */
export function RequireUser({ children }: { children: ReactNode }) {
  const user = useCurrentUser();

  switch (user.status) {
    case "loading":
      return <Loading />;
    case "signed-out":
      return (
        <Card className="mx-auto max-w-md text-center">
          <p className="mb-3 text-stone-700">Sign in to lend or borrow tools.</p>
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
        </Card>
      );
    case "token-rejected":
      return (
        <Card className="mx-auto max-w-lg">
          <p className="font-medium text-stone-900">Signed in, but the backend rejected the session.</p>
          <p className="mt-2 text-sm text-stone-600">
            Convex could not verify the Clerk token. Check that the Convex integration is active in
            the Clerk dashboard and that CLERK_JWT_ISSUER_DOMAIN on the Convex deployment matches
            your Clerk Frontend API URL. See &ldquo;Clerk setup&rdquo; in the README.
          </p>
        </Card>
      );
    case "error":
      return (
        <Card className="mx-auto max-w-md">
          <p role="alert" className="text-red-700">
            {user.message}
          </p>
        </Card>
      );
    case "ready":
      return <>{children}</>;
  }
}
