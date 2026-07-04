import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyHubSignature } from "@/lib/crypto";
import { enqueueWebhookEvent } from "@/lib/queue";

// Webhook verification (GET). Meta sends hub.challenge on subscription.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === env.instagramVerifyToken) {
    return new NextResponse(challenge || "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Incoming webhook events (POST). Verify X-Hub-Signature-256, ack 200 immediately,
// then enqueue the raw payload for background processing.
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || "";

  // In demo mode (no app secret) we skip signature verification so simulated
  // events can be ingested; production always verifies.
  if (!env.demoMode) {
    if (!verifyHubSignature(raw, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resolve tenant/account from the payload for indexing.
  const entry = (payload as { entry?: { id?: string }[] })?.entry || [];
  const igAccountIds = entry.map((e) => e.id).filter(Boolean) as string[];
  let tenantId: string | null = null;
  if (igAccountIds.length) {
    const acc = await db.instagramAccount.findFirst({
      where: { OR: igAccountIds.map((id) => ({ igUserId: id })) },
      select: { tenantId: true },
    });
    tenantId = acc?.tenantId ?? null;
  }

  const event = await db.webhookEvent.create({
    data: {
      tenantId,
      igAccountId: igAccountIds[0] ?? null,
      eventType: (payload as { object?: string })?.object === "instagram" ? "messages" : "unknown",
      payload: raw,
      signature,
      status: "queued",
    },
  });

  enqueueWebhookEvent(event.id);

  // Acknowledge immediately — Instagram requires a fast 200.
  return NextResponse.json({ received: true, eventId: event.id }, { status: 200 });
}
