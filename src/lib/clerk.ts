import type { User } from "@clerk/nextjs/server";

/**
 * Clerk stores every linked social account under externalAccounts. When
 * GitHub is enabled as a social connection (see README), the GitHub login
 * itself is exposed as `.username` on that account — that's the identifier
 * we use everywhere else in the app (GardenUser.username, search, planting).
 */
export function githubUsernameFromClerkUser(user: User): string | null {
  const githubAccount = user.externalAccounts.find(
    (acc) => acc.provider === "oauth_github" || acc.provider === "github"
  );
  return githubAccount?.username ?? null;
}
