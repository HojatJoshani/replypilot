import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { PLANS } from "@/lib/constants";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tid = ctx.tenantId;

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const start30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [accounts, activeRules, today, last30, ai30, escalatedOpen, leadsNew, aiUsedAllTime, sub] = await Promise.all([
    db.instagramAccount.count({ where: { tenantId: tid } }),
    db.automationRule.count({ where: { tenantId: tid, isActive: true } }),
    db.conversationLog.count({ where: { tenantId: tid, createdAt: { gte: startToday } } }),
    db.conversationLog.count({ where: { tenantId: tid, createdAt: { gte: start30 } } }),
    db.conversationLog.count({ where: { tenantId: tid, createdAt: { gte: start30 }, wasAiGenerated: true } }),
    db.conversationLog.count({ where: { tenantId: tid, escalated: true, status: "escalated" } }),
    db.lead.count({ where: { tenantId: tid, status: "new" } }),
    db.conversationLog.count({ where: { tenantId: tid, wasAiGenerated: true } }),
    db.subscription.findUnique({ where: { tenantId: tid } }),
  ]);

  const plan = sub?.plan || "free";
  const planDef = PLANS.find((p) => p.value === plan) || PLANS[0];

  const accountRows = await db.instagramAccount.findMany({
    where: { tenantId: tid },
    select: { id: true, igUsername: true, status: true, tokenExpiresAt: true },
    orderBy: { connectedAt: "desc" },
  });

  return NextResponse.json({
    accounts,
    activeRules,
    conversationsToday: today,
    conversations30d: last30,
    aiReplies30d: ai30,
    escalatedOpen,
    leadsNew,
    aiRepliesUsed: aiUsedAllTime,
    aiRepliesLimit: planDef.limits.aiReplies,
    accountHealth: accountRows.map((a) => ({
      id: a.id,
      username: a.igUsername,
      status: a.status,
      tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
    })),
  });
}
