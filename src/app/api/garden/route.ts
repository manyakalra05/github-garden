import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withDbRetry } from "@/lib/dbRetry";

export const revalidate = 60; // cache the garden payload for 60s at the edge

export async function GET() {
  const trees = await withDbRetry(() =>
    prisma.gardenUser.findMany({
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        primaryLanguage: true,
        accentColor: true,
        treeHeight: true,
        canopySpread: true,
        flowerDensity: true,
        glowIntensity: true,
        plotX: true,
        plotZ: true,
        plotSeed: true,
        isClaimed: true,
        waterCount: true,
        contributions: true,
        followers: true,
      },
      orderBy: { createdAt: "asc" },
      take: 20000,
    })
  );

  return NextResponse.json({ count: trees.length, trees });
}
