import { Octokit } from "octokit";

// Unauthenticated requests are capped at 60/hr by GitHub. A token (even a
// read-only classic PAT with no scopes) raises that to 5,000/hr, which is
// what makes bulk seeding and live on-demand planting feasible.
export const octokit = new Octokit({
  auth: process.env.GITHUB_API_TOKEN || undefined,
});

export interface RawGithubProfile {
  githubId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAtGithub: string;
  languages: Record<string, number>;
  totalStars: number;
  contributions: number;
  pullRequests: number;
  lastActiveAt: string | null;
}

/**
 * Fetches everything we need about one GitHub user with a small, bounded
 * number of API calls (safe to run on-demand when someone searches a
 * username we haven't planted yet).
 */
export async function fetchGithubProfile(
  username: string
): Promise<RawGithubProfile | null> {
  try {
    const { data: user } = await octokit.rest.users.getByUsername({
      username,
    });

    // Top repos by stars, used both for total stars and language breakdown.
    const { data: repos } = await octokit.rest.repos.listForUser({
      username,
      per_page: 100,
      sort: "updated",
    });

    const totalStars = repos.reduce(
      (sum, r) => sum + (r.stargazers_count || 0),
      0
    );

    const languages: Record<string, number> = {};
    for (const r of repos) {
      if (r.language) {
        languages[r.language] = (languages[r.language] || 0) + 1;
      }
    }

    // Contribution count isn't exposed by REST directly; the public GraphQL
    // contributionsCollection field is the accurate source. We fall back to
    // an activity-based estimate if the GraphQL call fails (e.g. no token).
    let contributions = 0;
    let pullRequests = 0;
    try {
      const query = `
        query($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionCalendar { totalContributions }
              totalPullRequestContributions
            }
          }
        }
      `;
      const gqlResult: any = await octokit.graphql(query, { login: username });
      contributions =
        gqlResult.user.contributionsCollection.contributionCalendar
          .totalContributions;
      pullRequests =
        gqlResult.user.contributionsCollection.totalPullRequestContributions;
    } catch {
      // Fallback estimate from public events (only last ~90 days available)
      const { data: events } = await octokit.rest.activity
        .listPublicEventsForUser({ username, per_page: 100 })
        .catch(() => ({ data: [] as any[] }));
      contributions = events.length * 4; // rough scale-up
      pullRequests = events.filter(
        (e: any) => e.type === "PullRequestEvent"
      ).length;
    }

    const lastEvent = await octokit.rest.activity
      .listPublicEventsForUser({ username, per_page: 1 })
      .catch(() => null);

    return {
      githubId: user.id,
      username: user.login,
      displayName: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      createdAtGithub: user.created_at,
      languages,
      totalStars,
      contributions,
      pullRequests,
      lastActiveAt: lastEvent?.data?.[0]?.created_at ?? null,
    };
  } catch (err) {
    console.error(`Failed to fetch GitHub profile for ${username}`, err);
    return null;
  }
}

// Palette pulled from the reference mood board: soft violets, lilac, orchid,
// pale rose. Each language gets a fixed accent so the same language always
// reads as the same flower color across the whole garden.
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#e9d5ff",
  TypeScript: "#c4b5fd",
  Python: "#a78bfa",
  Go: "#8b5cf6",
  Rust: "#7c3aed",
  Java: "#d8b4fe",
  "C++": "#9f7aea",
  C: "#b794f6",
  Ruby: "#f0abfc",
  PHP: "#ddd6fe",
  Swift: "#f5d0fe",
  Kotlin: "#e0c3fc",
  HTML: "#fbcfe8",
  CSS: "#f3e8ff",
  Shell: "#ede9fe",
};
const DEFAULT_ACCENT = "#c4b5fd";

/**
 * Maps raw GitHub metrics onto the plant's visual parameters. This is the
 * single source of truth used by both the seed script and the on-demand
 * planting API route, so a tree looks the same regardless of how it entered
 * the garden.
 */
export function deriveVisualParams(profile: RawGithubProfile) {
  const topLanguage =
    Object.entries(profile.languages).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;

  const accountAgeDays = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(profile.createdAtGithub).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Log-scaled so a handful of mega-users (10k+ contributions) don't dwarf
  // everyone else into invisibility — the garden should stay readable.
  const treeHeight = clamp(
    1.2 + Math.log10(profile.contributions + 1) * 1.1,
    1.2,
    6.5
  );
  const canopySpread = clamp(
    1 + Math.log10(profile.followers + 1) * 0.6,
    1,
    4.5
  );
  const flowerDensity = clamp(
    0.15 + Math.log10(profile.pullRequests + 1) * 0.22,
    0.15,
    1
  );
  const glowIntensity = clamp(
    profile.lastActiveAt &&
      Date.now() - new Date(profile.lastActiveAt).getTime() <
        1000 * 60 * 60 * 24 * 14
      ? 0.9
      : clamp(0.2 + Math.log10(accountAgeDays) * 0.05, 0.2, 0.6),
    0.2,
    1
  );

  return {
    primaryLanguage: topLanguage,
    accentColor: (topLanguage && LANGUAGE_COLORS[topLanguage]) || DEFAULT_ACCENT,
    accountAgeDays,
    treeHeight,
    canopySpread,
    flowerDensity,
    glowIntensity,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
