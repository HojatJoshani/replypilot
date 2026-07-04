import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";

// List conversations with filters + pagination. Joins account + matched rule.
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const igAccountId = url.searchParams.get("igAccountId");
  const channel = url.searchParams.get("channel");
  const status = url.searchParams.get("status");
  const escalated = url.searchParams.get("escalated");
  const search = url.searchParams.get("q");
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);

  const where: {
    tenantId: string;
    igAccountId?: string;
    channel?: string;
    status?: string;
    escalated?: boolean;
    OR?: { inboundMessage?: { contains: string }; contactUsername?: { contains: string } }[];
  } = { tenantId: ctx.tenantId };
  if (igAccountId) where.igAccountId = igAccountId;
  if (channel) where.channel = channel;
  if (status) where.status = status;
  if (escalated === "true") where.escalated = true;
  if (search) {
    where.OR = [
      { inboundMessage: { contains: search } },
      { contactUsername: { contains: search } },
    ];
  }

  const [rows, total] = await Promise.all([
    db.conversationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        instagramAccount: { select: { igUsername: true } },
        matchedRule: { select: { name: true } },
      },
    }),
    db.conversationLog.count({ where }),
  ]);

  return NextResponse.json({
    conversations: rows.map((r) => ({
      id: r.id,
      igAccountId: r.igAccountId,
      contactIgId: r.contactIgId,
      contactUsername: r.contactUsername,
      channel: r.channel,
      inboundMessage: r.inboundMessage,
      outboundMessage: r.outboundMessage,
      matchedRuleId: r.matchedRuleId,
      wasAiGenerated: r.wasAiGenerated,
      escalated: r.escalated,
      intent: r.intent,
      suggestedAction: r.suggestedAction,
      status: r.status,
      postPermalink: r.postPermalink,
      aiModel: r.aiModel,
      createdAt: r.createdAt.toISOString(),
      igUsername: r.instagramAccount?.igUsername,
      matchedRuleName: r.matchedRule?.name ?? null,
    })),
    total,
  });
}
