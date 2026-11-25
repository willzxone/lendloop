import type { AuthConfig } from "convex/server";

/**
 * Convex accepts Clerk-issued JWTs from the "convex" template.
 * CLERK_JWT_ISSUER_DOMAIN is the Clerk Frontend API URL, set on the Convex
 * deployment: npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
