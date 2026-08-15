import { prisma } from "./prisma";
import { fetchGithubProfile, deriveVisualParams } from "./github";
import { plotForIndex, seedFromString } from "./layout";
import { withDbRetry } from "./dbRetry";

/**
 * Ensures a real GitHub user has a tree in the garden, fetching fresh data
 * from the GitHub API if they're new or stale (>24h old). This is the one
 * function that ever writes a GardenUser row — seed script, search API, and
 * the Clerk sign-in webhook all funnel through here so the data and the
 * visual mapping are always consistent.
 *
 * Every direct database call is wrapped in withDbRetry() because Neon's free
 * tier suspends its compute after idle periods — the first query after a
 * suspend can time out even though the database is healthy a moment later.
 */
export async function plantOrRefreshUser(username: string) {
  const existing = await withDbRetry(() =>
    prisma.gardenUser.findUnique({
      where: { username: username.toLowerCase() },
    })
  );

  const isStale =
    !existing ||
    Date.now() - existing.updatedAt.getTime() > 1000 * 60 * 60 * 24;

  if (existing && !isStale) return existing;

  const profile = await fetchGithubProfile(username);
  if (!profile) return existing ?? null;

  const visuals = deriveVisualParams(profile);

  if (existing) {
    return withDbRetry(() =>
      prisma.gardenUser.update({
        where: { id: existing.id },
        data: {
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
          publicRepos: profile.publicRepos,
          followers: profile.followers,
          following: profile.following,
          totalStars: profile.totalStars,
          contributions: profile.contributions,
          pullRequests: profile.pullRequests,
          lastActiveAt: profile.lastActiveAt
            ? new Date(profile.lastActiveAt)
            : null,
          languages: profile.languages,
          primaryLanguage: visuals.primaryLanguage,
          accountAgeDays: visuals.accountAgeDays,
          treeHeight: visuals.treeHeight,
          canopySpread: visuals.canopySpread,
          flowerDensity: visuals.flowerDensity,
          glowIntensity: visuals.glowIntensity,
          accentColor: visuals.accentColor,
        },
      })
    );
  }

  // New plant: assign it the next open plot in the phyllotaxis spiral.
  const plantedCount = await withDbRetry(() => prisma.gardenUser.count());
  const plot = plotForIndex(plantedCount);

  return withDbRetry(() =>
    prisma.gardenUser.create({
      data: {
        githubId: profile.githubId,
        username: profile.username.toLowerCase(),
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        publicRepos: profile.publicRepos,
        followers: profile.followers,
        following: profile.following,
        totalStars: profile.totalStars,
        contributions: profile.contributions,
        pullRequests: profile.pullRequests,
        lastActiveAt: profile.lastActiveAt
          ? new Date(profile.lastActiveAt)
          : null,
        createdAtGithub: new Date(profile.createdAtGithub),
        languages: profile.languages,
        primaryLanguage: visuals.primaryLanguage,
        accountAgeDays: visuals.accountAgeDays,
        treeHeight: visuals.treeHeight,
        canopySpread: visuals.canopySpread,
        flowerDensity: visuals.flowerDensity,
        glowIntensity: visuals.glowIntensity,
        accentColor: visuals.accentColor,
        plotX: plot.x,
        plotZ: plot.z,
        plotSeed: seedFromString(profile.username),
      },
    })
  );
}
