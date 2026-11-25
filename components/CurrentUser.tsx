"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";

type Me = NonNullable<FunctionReturnType<typeof api.users.me>>;

export type CurrentUserState =
  | { status: "loading" }
  | { status: "signed-out" }
  /** Signed in with Clerk, but Convex did not accept the token (see README, Clerk setup). */
  | { status: "token-rejected" }
  | { status: "error"; message: string }
  | { status: "ready"; me: Me };

const CurrentUserContext = createContext<CurrentUserState>({ status: "loading" });

/**
 * Tracks the signed-in user and makes sure they have a row in Convex.
 * Role and trusted-lender flags come from Convex, never from Clerk metadata
 * or the browser.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    storeUser().catch((error: unknown) => setStoreError(errorMessage(error)));
  }, [isAuthenticated, storeUser]);

  let state: CurrentUserState;
  if (!isLoaded || isLoading) state = { status: "loading" };
  else if (!isSignedIn) state = { status: "signed-out" };
  else if (!isAuthenticated) state = { status: "token-rejected" };
  else if (storeError) state = { status: "error", message: storeError };
  else if (!me) state = { status: "loading" }; // users.store is still running
  else state = { status: "ready", me };

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
