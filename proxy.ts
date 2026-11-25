import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Lets Clerk keep the session cookie fresh and makes `auth()` available.
 *
 * It does not guard routes. The app pages hold no data of their own: they
 * render a sign-in prompt for signed-out visitors (components/RequireUser.tsx),
 * and every Convex function checks the caller's identity and role itself, so
 * there is nothing to protect at the routing layer.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
