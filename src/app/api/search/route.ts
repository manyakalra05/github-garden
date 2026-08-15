import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { octokit } from "@/lib/github";
import { withDbRetry } from "@/lib/dbRetry";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const planted = await withDbRetry(() =>
    prisma.gardenUser.findMany({
      where: { username: { contains: q.toLowerCase() } },
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        plotX: true,
        plotZ: true,
        treeHeight: true,
      },
      take: 8,
    })
  );

  if (planted.length >= 5) {
    return NextResponse.json({ results: planted, source: "garden" });
  }

  // Not enough local matches — ask GitHub directly so the search bar still
  // finds real users who simply haven't been planted yet. The camera-pan
  // flow will plant them on selection via /api/user/[username].
  try {
    const { data } = await octokit.rest.search.users({
      q,
      per_page: 8,
    });
    const remote = data.items.map((u) => ({
      username: u.login,
      displayName: null,
      avatarUrl: u.avatar_url,
      plotX: null,
      plotZ: null,
      treeHeight: null,
      unplanted: true,
    }));
    const merged = [
      ...planted,
      ...remote.filter(
        (r) => !planted.some((p: { username: string }) => p.username === r.username)
      ),
    ].slice(0, 8);
    return NextResponse.json({ results: merged, source: "mixed" });
  } catch {
    return NextResponse.json({ results: planted, source: "garden" });
  }
}
