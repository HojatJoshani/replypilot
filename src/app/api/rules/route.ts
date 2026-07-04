import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

const createSchema = z.object({
  igAccountId: z.string().min(1),
  name: z.string().min(1).max(80),
  triggerType: z.enum(["keyword", "any_dm", "any_comment", "story_reply"]),
  triggerKeywords: z.string().default(""),
  triggerMatchMode: z.enum(["any", "all"]).default("any"),
  responseType: z.enum(["static_text", "static_media", "ai_generated"]),
  staticResponse: z.string().nullable().default(null),
  mediaUrl: z.string().nullable().default(null),
  aiPromptOverride: z.string().nullable().default(null),
  isActive: z.boolean().default(true),
});

export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const igAccountId = url.searchParams.get("igAccountId");

  const where: { tenantId: string; igAccountId?: string } = { tenantId: ctx.tenantId };
  if (igAccountId) where.igAccountId = igAccountId;

  const rules = await db.automationRule.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  const d = parsed.data;

  // Verify account ownership
  const acc = await db.instagramAccount.findFirst({
    where: { id: d.igAccountId, tenantId: ctx.tenantId },
  });
  if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // New rules get a priority just above the lowest existing (so they appear at bottom by default).
  const lowest = await db.automationRule.findFirst({
    where: { igAccountId: d.igAccountId },
    orderBy: { priority: "asc" },
    select: { priority: true },
  });
  const priority = lowest ? Math.max(0, lowest.priority - 1) : 10;

  const rule = await db.automationRule.create({
    data: {
      tenantId: ctx.tenantId,
      igAccountId: d.igAccountId,
      name: d.name,
      triggerType: d.triggerType,
      triggerKeywords: d.triggerKeywords,
      triggerMatchMode: d.triggerMatchMode,
      responseType: d.responseType,
      staticResponse: d.staticResponse,
      mediaUrl: d.mediaUrl,
      aiPromptOverride: d.aiPromptOverride,
      isActive: d.isActive,
      priority,
    },
  });
  return NextResponse.json({ rule });
}
