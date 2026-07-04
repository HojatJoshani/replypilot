import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";

// Aggregated analytics for the last 30 days.
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 30), 1), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const convos = await db.conversationLog.findMany({
    where: { tenantId: ctx.tenantId, createdAt: { gte: since } },
    select: {
      wasAiGenerated: true,
      escalated: true,
      status: true,
      channel: true,
      intent: true,
      matchedRuleId: true,
      createdAt: true,
    },
  });

  const total = convos.length;
  const aiReplies = convos.filter((c) => c.wasAiGenerated).length;
  const ruleReplies = total - aiReplies;
  const escalated = convos.filter((c) => c.escalated).length;
  const failed = convos.filter((c) => c.status === "failed").length;

  // Channel breakdown
  const channelMap = new Map<string, number>();
  for (const c of convos) channelMap.set(c.channel, (channelMap.get(c.channel) || 0) + 1);

  // Top intents
  const intentMap = new Map<string, number>();
  for (const c of convos) {
    const k = c.intent || "unknown";
    intentMap.set(k, (intentMap.get(k) || 0) + 1);
  }

  // Top keywords — derive from automation rules' triggerKeywords that matched.
  const rules = await db.automationRule.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, name: true, triggerKeywords: true },
  });
  const ruleNameById = new Map(rules.map((r) => [r.id, r.name]));
  const matchedRuleCounts = new Map<string, number>();
  for (const c of convos) {
    if (c.matchedRuleId) matchedRuleCounts.set(c.matchedRuleId, (matchedRuleCounts.get(c.matchedRuleId) || 0) + 1);
  }
  const topKeywords = [...matchedRuleCounts.entries()]
    .map(([id, count]) => ({ keyword: ruleNameById.get(id) || "rule", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Timeseries (per day)
  const dayMap = new Map<string, { total: number; ai: number; rule: number; escalated: number }>();
  for (const c of convos) {
    const day = c.createdAt.toISOString().slice(0, 10);
    const entry = dayMap.get(day) || { total: 0, ai: 0, rule: 0, escalated: 0 };
    entry.total += 1;
    if (c.wasAiGenerated) entry.ai += 1;
    else entry.rule += 1;
    if (c.escalated) entry.escalated += 1;
    dayMap.set(day, entry);
  }
  const timeseries = [...dayMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totalConversations: total,
    aiReplies,
    ruleReplies,
    escalated,
    failed,
    escalationRate: total ? Math.round((escalated / total) * 1000) / 10 : 0,
    topKeywords,
    topIntents: [...intentMap.entries()].map(([intent, count]) => ({ intent, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    channelBreakdown: [...channelMap.entries()].map(([channel, count]) => ({ channel, count })),
    timeseries,
    aiVsRule: { ai: aiReplies, rule: ruleReplies },
  });
}
