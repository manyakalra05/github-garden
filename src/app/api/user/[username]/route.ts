import { NextResponse } from "next/server";
import { plantOrRefreshUser } from "@/lib/plant";

export async function GET(
  _req: Request,
  { params }: { params: { username: string } }
) {
  const username = params.username.trim().toLowerCase();
  if (!/^[a-z0-9-]{1,39}$/i.test(username)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const gardenUser = await plantOrRefreshUser(username);

  if (!gardenUser) {
    return NextResponse.json(
      { error: `No GitHub user found for "${username}"` },
      { status: 404 }
    );
  }

  // gardenUser.githubId is a Postgres BIGINT (JS bigint at runtime) because
  // GitHub's real user IDs can exceed 32-bit INT4 — bigint can't be
  // JSON-serialized directly, so convert it (safely: GitHub IDs are nowhere
  // near Number.MAX_SAFE_INTEGER) before returning.
  return NextResponse.json({
    ...gardenUser,
    githubId: Number(gardenUser.githubId),
  });
}
