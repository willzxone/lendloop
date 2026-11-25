import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Sends signed-out visitors on app pages to sign-in. This is a convenience
 * only: every Convex function checks the caller itself, so a request that
 * skips this proxy still gets nothing it is not allowed to see.
 */
const isAppRoute = createRouteMatcher([
  "/tools(.*)",
  "/listings(.*)",
  "/requests(.*)",
  "/incoming(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isAppRoute(request)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
