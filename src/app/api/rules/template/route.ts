import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { SCENARIO_TEMPLATES } from "@/lib/constants";
import { z } from "zod";

const schema = z.object({
  igAccountId: z.string().min(1),
  templateId: z.string().min(1),
});

// Apply a scenario template: create a rule from the template definition.
export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  const { igAccountId, templateId } = parsed.data;

  // Verify account ownership
  const acc = await db.instagramAccount.findFirst({
    where: { id: igAccountId, tenantId: ctx.tenantId },
  });
  if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const tpl = SCENARIO_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  // New rules get a priority just above the lowest existing.
  const lowest = await db.automationRule.findFirst({
    where: { igAccountId },
    orderBy: { priority: "asc" },
    select: { priority: true },
  });
  const priority = lowest ? Math.max(0, lowest.priority - 1) : 10;

  const rule = await db.automationRule.create({
    data: {
      tenantId: ctx.tenantId,
      igAccountId,
      name: tpl.rule.name,
      triggerType: tpl.rule.triggerType,
      triggerKeywords: tpl.rule.triggerKeywords,
      triggerMatchMode: tpl.rule.triggerMatchMode,
      responseType: tpl.rule.responseType,
      staticResponse: tpl.rule.staticResponse ?? null,
      mediaUrl: null,
      aiPromptOverride: null,
      conditionsJson: tpl.rule.conditionsJson ?? null,
      actionsJson: tpl.rule.actionsJson ?? null,
      isActive: true,
      priority,
    },
  });

  return NextResponse.json({ ok: true, rule });
}
