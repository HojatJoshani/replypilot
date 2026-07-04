import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  contactUsername: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
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
  const existing = await db.lead.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lead = await db.lead.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ lead: { ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() } });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await db.lead.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  return NextResponse.json({ ok: true });
}
