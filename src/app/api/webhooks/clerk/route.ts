import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { plantOrRefreshUser } from "@/lib/plant";

/**
 * Configure this URL as a Clerk webhook endpoint (Clerk Dashboard →
 * Webhooks → Add Endpoint → https://your-domain/api/webhooks/clerk),
 * subscribed to the "user.created" and "user.updated" events. Clerk signs
 * every payload; we verify it with svix before trusting anything in it —
 * never skip this, since this route ends up writing to the database.
 */
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: any;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Clerk webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const clerkUserId: string = event.data.id;
    const externalAccounts: any[] = event.data.external_accounts ?? [];
    const githubAccount = externalAccounts.find(
      (a) => a.provider === "oauth_github" || a.provider === "github"
    );
    const username: string | undefined = githubAccount?.username;

    if (username) {
      const gardenUser = await plantOrRefreshUser(username);
      if (gardenUser) {
        await prisma.gardenUser.update({
          where: { id: gardenUser.id },
          data: { isClaimed: true, clerkUserId },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
