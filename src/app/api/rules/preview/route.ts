import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { matchRule } from "@/lib/rule-engine";
import { generateAiReply, aiConfigToContext } from "@/lib/ai";
import { z } from "zod";

// Preview what would happen for a given test message: which rule matches
// (if any), and — when the matched rule is AI-generated (or no match with
// fallback) — generate a live AI reply so users can test their config.
const schema = z.object({
  igAccountId: z.string().min(1),
  message: z.string().min(1).max(2000),
  channel: z.enum(["dm", "comment", "story"]).default("dm"),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  const { igAccountId, message, channel } = parsed.data;

  const acc = await db.instagramAccount.findFirst({
    where: { id: igAccountId, tenantId: ctx.tenantId },
    include: { aiConfig: true },
  });
  if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const rules = await db.automationRule.findMany({
    where: { igAccountId, isActive: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const matched = matchRule({ message, channel }, rules);

  let aiPreview: { reply: string; intent: string; escalate: boolean; suggestedAction: string } | null = null;
  const useAi = matched?.rule.responseType === "ai_generated" || (!matched && acc.aiConfig?.aiFallbackEnabled);
  if (useAi) {
    const ctxInput = acc.aiConfig
      ? aiConfigToContext(acc.aiConfig, channel)
      : { channel, tone: "friendly", businessName: acc.igUsername };
    if (matched?.rule.aiPromptOverride) ctxInput.aiPromptOverride = matched.rule.aiPromptOverride;
    const res = await generateAiReply(ctxInput, message);
    aiPreview = res.reply;
  }

  return NextResponse.json({
    matchedRule: matched
      ? { id: matched.rule.id, name: matched.rule.name, responseType: matched.rule.responseType, matchedKeywords: matched.matchedKeywords }
      : null,
    aiFallback: !matched && acc.aiConfig?.aiFallbackEnabled,
    aiPreview,
  });
}
