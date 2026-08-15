import { clerkMiddleware } from "@clerk/nextjs/server";

// Everything in this app is public (anyone can view and search the garden
// without signing in) — Clerk is only used to identify who's signing in
// with GitHub so we can claim their tree and let them water others.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
