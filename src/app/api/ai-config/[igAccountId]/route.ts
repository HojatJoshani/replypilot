import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

const configSchema = z.object({
  businessName: z.string().nullable().optional(),
  tone: z.enum(["friendly", "professional", "casual", "playful"]).optional(),
  description: z.string().nullable().optional(),
  products: z.string().nullable().optional(),
  services: z.string().nullable().optional(),
  faqs: z.string().nullable().optional(),
  pricingVisible: z.boolean().optional(),
  pricingNote: z.string().nullable().optional(),
  purchaseLink: z.string().nullable().optional(),
  workingHours: z.string().nullable().optional(),
  specialRules: z.string().nullable().optional(),
  aiFallbackEnabled: z.boolean().optional(),
});

type Params = { params: Promise<{ igAccountId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { igAccountId } = await params;
  const acc = await db.instagramAccount.findFirst({
    where: { id: igAccountId, tenantId: ctx.tenantId },
  });
  if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const config = await db.aiConfig.upsert({
    where: { igAccountId },
    create: { igAccountId, tenantId: ctx.tenantId },
    update: {},
  });
  return NextResponse.json({ config: { ...config, updatedAt: config.updatedAt.toISOString() } });
}

export async function PUT(req: Request, { params }: Params) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { igAccountId } = await params;
  const acc = await db.instagramAccount.findFirst({
    where: { id: igAccountId, tenantId: ctx.tenantId },
  });
  if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }

  const config = await db.aiConfig.upsert({
    where: { igAccountId },
    create: { igAccountId, tenantId: ctx.tenantId, ...parsed.data },
    update: parsed.data,
  });
  return NextResponse.json({ config: { ...config, updatedAt: config.updatedAt.toISOString() } });
}
