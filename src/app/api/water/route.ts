import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { githubUsernameFromClerkUser } from "@/lib/clerk";
import { withDbRetry } from "@/lib/dbRetry";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in with GitHub to water a tree" },
      { status: 401 }
    );
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const waterer = githubUsernameFromClerkUser(clerkUser);
  if (!waterer) {
    return NextResponse.json(
      { error: "No GitHub account linked to this Clerk user" },
      { status: 400 }
    );
  }

  const { username } = await req.json();
  const gardenUser = await withDbRetry(() =>
    prisma.gardenUser.findUnique({ where: { username } })
  );
  if (!gardenUser) {
    return NextResponse.json({ error: "Tree not found" }, { status: 404 });
  }

  try {
    // withDbRetry only retries on connection-level error codes (see
    // dbRetry.ts) — a unique-constraint violation from watering twice
    // still surfaces immediately and falls into the catch below as before.
    await withDbRetry(() =>
      prisma.watering.create({
        data: { gardenUserId: gardenUser.id, waterer },
      })
    );
    const updated = await withDbRetry(() =>
      prisma.gardenUser.update({
        where: { id: gardenUser.id },
        data: { waterCount: { increment: 1 } },
      })
    );
    return NextResponse.json({ waterCount: updated.waterCount });
  } catch {
    return NextResponse.json(
      { error: "You've already watered this tree today" },
      { status: 409 }
    );
  }
}
