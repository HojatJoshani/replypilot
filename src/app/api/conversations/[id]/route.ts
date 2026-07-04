import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { sendDirectMessage } from "@/lib/instagram";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["auto", "manual", "escalated", "resolved", "failed"]).optional(),
  escalated: z.boolean().optional(),
  manualReply: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const convo = await db.conversationLog.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      instagramAccount: { select: { igUsername: true, id: true } },
      matchedRule: { select: { name: true } },
    },
  });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch recent thread with the same contact for context.
  const thread = await db.conversationLog.findMany({
    where: { tenantId: ctx.tenantId, igAccountId: convo.igAccountId, contactIgId: convo.contactIgId },
    orderBy: { createdAt: "asc" },
    take: 30,
  });

  return NextResponse.json({
    conversation: {
      ...convo,
      createdAt: convo.createdAt.toISOString(),
    },
    thread: thread.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  const convo = await db.conversationLog.findFirst({
    where: { id, tenantId: ctx.tenantId },
  });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { status?: string; escalated?: boolean; outboundMessage?: string; wasAiGenerated?: boolean } = {};
  if (parsed.data.status) data.status = parsed.data.status;
  if (typeof parsed.data.escalated === "boolean") data.escalated = parsed.data.escalated;

  // Manual override reply: send to Instagram and replace outboundMessage.
  if (parsed.data.manualReply && parsed.data.manualReply.trim()) {
    const reply = parsed.data.manualReply.trim();
    try {
      if (convo.channel === "comment") {
        // We don't have parent comment id stored separately; fall back to DM.
        await sendDirectMessage(convo.igAccountId, convo.contactIgId, reply);
      } else {
        await sendDirectMessage(convo.igAccountId, convo.contactIgId, reply);
      }
      data.outboundMessage = reply;
      data.wasAiGenerated = false;
      data.status = "manual";
    } catch (e) {
      return NextResponse.json({ error: "Failed to send: " + (e as Error).message }, { status: 500 });
    }
  }

  const updated = await db.conversationLog.update({ where: { id }, data });
  return NextResponse.json({ conversation: { ...updated, createdAt: updated.createdAt.toISOString() } });
}
