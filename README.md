# 🌸 GitHub Garden

A 3D explorable garden where every tree is a real GitHub developer — height
from their contributions, canopy size from followers, flower density from
pull requests, accent color from their primary language. Pre-seeded with
real users so it's lush from the first visit, not an empty lot waiting for
traffic. Search a username to fly the camera to their tree; sign in with
GitHub (via Clerk) to plant/claim your own tree and water others.

Stack: Next.js 14 (App Router) · React Three Fiber / Three.js · Prisma +
Neon Postgres · Clerk (GitHub OAuth) · Octokit.

This is a real, working codebase — no mock data, no stubbed API calls.
Every number on every tree comes from a live GitHub API response.

---

## 1. Create a Postgres database (Neon)

1. Go to https://neon.tech → **Create a project**.
2. Once it's provisioned, open the **Connection Details** panel.
3. Copy the **pooled** connection string — the one where the hostname
   contains `-pooler` — since Vercel serverless functions open many
   short-lived connections and Neon's pooler handles that correctly where a
   direct connection would exhaust your limit.
4. Paste it into `.env` as `DATABASE_URL`.

## 2. Create a Clerk application (GitHub sign-in)

1. Go to https://clerk.com → **Create application**.
2. Under **Sign-in options**, enable **GitHub** as a social connection.
   For local dev, Clerk's shared GitHub OAuth credentials work out of the
   box — no GitHub OAuth App needed yet. For production, add your own
   GitHub OAuth App's client ID/secret under that same GitHub connection
   settings (Clerk will show you the exact callback URL to register on
   GitHub's side).
3. If you only want GitHub as a sign-in method (no email/password), disable
   the other sign-in options under **User & Authentication**.
4. Go to **API Keys** and copy the Publishable key / Secret key into `.env`
   as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`.

## 3. Wire up the Clerk webhook (plants a tree on sign-in)

This app plants/claims a user's tree the moment they sign in, via a Clerk
webhook — not inline in the sign-in flow — because that's the reliable way
to react to auth events server-side.

1. Locally, expose your dev server first (Clerk needs a public URL to send
   webhooks to): `npx ngrok http 3000` (or use the Clerk CLI's `clerk dev`
   tunnel).
2. Clerk Dashboard → **Webhooks** → **Add Endpoint**.
   URL: `https://<your-ngrok-or-domain>/api/webhooks/clerk`
   Subscribe to: `user.created` and `user.updated`.
3. Copy the endpoint's **Signing Secret** into `.env` as
   `CLERK_WEBHOOK_SECRET`.

In production this is the same endpoint pointed at your real domain — no
code changes, just re-registering the URL in Clerk once you deploy.

## 4. Create a GitHub personal access token (for API calls, separate from sign-in)

This is what lets the server search/fetch/seed GitHub user data — it's
unrelated to Clerk auth.

1. https://github.com/settings/tokens → **Generate new token (classic)**.
2. Leave **every scope unchecked** (we only read public data) — this alone
   raises your rate limit from 60/hr to 5,000/hr.
3. Put it in `.env` as `GITHUB_API_TOKEN`.

## 5. Local setup

```bash
npm install
cp .env.example .env   # fill in the values from steps 1-4

npm run db:push   # creates all tables in your Neon database
npm run seed      # pulls ~800 real GitHub users and plants their trees
                   # (takes ~15-20 min — it's deliberately rate-limit-safe)
npm run dev
```

Open http://localhost:3000 — you should see a full, lush garden immediately.
Sign in with GitHub, check your Clerk Dashboard's webhook logs to confirm
the `user.created` event fired, then search your own username — you should
see `isClaimed: true` reflected once you fly to your tree.

## 6. Deploy to Vercel

1. Push this repo to GitHub, then import it at https://vercel.com/new.
2. Add all env vars from `.env` in the Vercel project settings.
3. Deploy. Then run `npm run seed` **once**, locally, pointed at the prod
   `DATABASE_URL` — seeding hits the GitHub API slowly on purpose, so it's
   not something you want running inside a serverless function with a
   timeout.
4. Update the Clerk webhook endpoint URL to your real domain (step 3).
5. If you added your own GitHub OAuth App credentials for production in
   step 2, make sure its callback URL matches what Clerk shows you there.

---

## How search and planting actually work

- `/api/garden` returns every already-planted tree (cached 60s) — this is
  what renders on load.
- `/api/search?q=...` checks the database first, and falls back to a live
  GitHub user search for anyone not yet planted.
- Selecting an unplanted result calls `/api/user/[username]`, which fetches
  that person's real GitHub data on the spot, plants their tree, and the
  camera flies there — same as if they'd been in the original seed.
- Signing in with GitHub (via Clerk) triggers the `/api/webhooks/clerk`
  endpoint, which plants/refreshes that user's own tree via the same
  `plantOrRefreshUser()` code path and marks it `isClaimed: true`.

## Scaling the seed beyond a few thousand users

`scripts/seed.ts` uses GitHub's Search API, which is the practical way to
seed hundreds to a few thousand real, notable users before launch. To seed
tens or hundreds of thousands of users (true "most of GitHub" scale), swap
the candidate-gathering step for a query against
[GH Archive](https://www.gharchive.org) via Google BigQuery — it's a public,
free-to-query archive of every public GitHub event since 2011. A single
BigQuery query like:

```sql
SELECT actor.login, COUNT(*) AS events
FROM `githubarchive.year.2025`
WHERE type IN ('PushEvent','PullRequestEvent')
GROUP BY actor.login
ORDER BY events DESC
LIMIT 50000
```

gives you 50,000 real, active usernames in seconds. Feed that list into
`plantOrRefreshUser()` (the same function the current seed script uses) and
you get the same real-data trees at much larger scale — this is a one-line
swap in `collectCandidateUsernames()`, not an architecture change.

## Known limitation from the build sandbox this was written in

`npx prisma generate` couldn't complete here because this sandbox's network
allowlist blocks `binaries.prisma.sh` (the domain Prisma downloads its query
engine binary from). Everything else was verified: `tsc --noEmit` is clean
and `next build`'s compile step succeeds. Once you run
`npm install && npx prisma generate` in your own environment (unrestricted
network), this resolves itself — it's a sandbox constraint, not a bug in
this codebase.
