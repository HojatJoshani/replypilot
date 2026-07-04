import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  triggerType: z.enum(["keyword", "any_dm", "any_comment", "story_reply"]).optional(),
  triggerKeywords: z.string().optional(),
  triggerMatchMode: z.enum(["any", "all"]).optional(),
  responseType: z.enum(["static_text", "static_media", "ai_generated"]).optional(),
  staticResponse: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  aiPromptOverride: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  // Ensure ownership
  const existing = await db.automationRule.findFirst({
    where: { id, tenantId: ctx.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rule = await db.automationRule.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ rule });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.automationRule.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  return NextResponse.json({ ok: true });
}
