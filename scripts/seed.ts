/**
 * Bulk-seeds the garden with real GitHub users BEFORE launch, so the first
 * visitor sees a full, lush field — not an empty lot waiting for traffic.
 *
 * Strategy: GitHub's Search API lets us query users by followers/repos and
 * page through results (rate-limited but generous with a token: 30 req/min
 * for search, 5000 req/hr for everything else). We pull the most-followed,
 * most-active developers across a spread of the languages/ecosystems your
 * garden should represent, so the very first render already has real
 * diversity in tree height, canopy size, and flower color.
 *
 * For true "all of GitHub" scale (100k+ users) later, swap this script's
 * candidate list for a GH Archive / BigQuery export — see README.md,
 * "Scaling the seed beyond a few thousand users".
 *
 * Usage: npm run seed  (or: npm run seed -- --count=2000)
 */
import "dotenv/config";
import { octokit } from "../src/lib/github";
import { plantOrRefreshUser } from "../src/lib/plant";

const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Go",
  "Rust",
  "Java",
  "C++",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
];

const TARGET_COUNT = Number(
  process.argv.find((a) => a.startsWith("--count="))?.split("=")[1] ?? 800
);

async function collectCandidateUsernames(): Promise<string[]> {
  const usernames = new Set<string>();
  const perLanguage = Math.ceil(TARGET_COUNT / LANGUAGES.length);

  for (const lang of LANGUAGES) {
    let page = 1;
    while (usernames.size < TARGET_COUNT && page <= Math.ceil(perLanguage / 30)) {
      try {
        const { data } = await octokit.rest.search.users({
          q: `language:${lang} followers:>100`,
          sort: "followers",
          order: "desc",
          per_page: 30,
          page,
        });
        if (data.items.length === 0) break;
        for (const u of data.items) usernames.add(u.login);
        page++;
        // Search API: 30 requests/min authenticated. Stay comfortably under.
        await sleep(2100);
      } catch (err) {
        console.error(`Search failed for ${lang} page ${page}`, err);
        break;
      }
    }
    console.log(`Collected ${usernames.size}/${TARGET_COUNT} candidates so far...`);
  }

  return Array.from(usernames).slice(0, TARGET_COUNT);
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function main() {
  console.log(`Seeding garden with up to ${TARGET_COUNT} real GitHub users...`);
  const candidates = await collectCandidateUsernames();
  console.log(`Planting ${candidates.length} trees. This calls the GitHub API per user, so it's slow — that's expected.`);

  let planted = 0;
  for (const username of candidates) {
    try {
      const result = await plantOrRefreshUser(username);
      if (result) {
        planted++;
        if (planted % 25 === 0) console.log(`Planted ${planted}/${candidates.length}`);
      }
      // Stay well under the 5000/hr core rate limit.
      await sleep(750);
    } catch (err) {
      console.error(`Failed to plant ${username}`, err);
    }
  }

  console.log(`Done. ${planted} trees planted.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
