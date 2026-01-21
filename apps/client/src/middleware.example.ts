/**
 * Example Next.js Middleware for role-based protection
 *
 * Uncomment and customize if you want to protect routes at middleware level
 */

import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes
const isAuthorRoute = createRouteMatcher([
  "/create-hotel(.*)",
  "/my-hotels(.*)",
  "/edit-hotel(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Public routes
  if (!isAuthorRoute(req) && !isAdminRoute(req)) {
    return NextResponse.next();
  }

  // Require authentication
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Get user with metadata
  const user = await auth().then(async ({ userId }) => {
    if (!userId) return null;

    const client = await clerkClient();
    return await client.users.getUser(userId);
  });

  const role = user?.publicMetadata?.role as string;

  // Check author routes
  if (isAuthorRoute(req)) {
    if (role !== "AUTHOR" && role !== "ADMIN") {
      return NextResponse.redirect(
        new URL("/profile?error=require_author", req.url),
      );
    }
  }

  // Check admin routes
  if (isAdminRoute(req)) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
