import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

const createSchema = z.object({
  contactIgId: z.string().min(1),
  contactUsername: z.string().optional(),
  igAccountId: z.string().nullable().optional(),
  tags: z.string().default(""),
  notes: z.string().nullable().optional(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).default("new"),
  source: z.enum(["dm", "comment", "story"]).default("dm"),
});

export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("q");

  const where: { tenantId: string; status?: string; OR?: { contactUsername?: { contains: string }; tags?: { contains: string } }[] } = { tenantId: ctx.tenantId };
  if (status) where.status = status;
  if (search) {
    where.OR = [{ contactUsername: { contains: search } }, { tags: { contains: search } }];
  }

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { instagramAccount: { select: { igUsername: true } } },
  });
  return NextResponse.json({
    leads: leads.map((l) => ({
      id: l.id,
      igAccountId: l.igAccountId,
      contactIgId: l.contactIgId,
      contactUsername: l.contactUsername,
      tags: l.tags,
      notes: l.notes,
      status: l.status,
      source: l.source,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
      igUsername: l.instagramAccount?.igUsername,
    })),
  });
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
  if (d.igAccountId) {
    const acc = await db.instagramAccount.findFirst({ where: { id: d.igAccountId, tenantId: ctx.tenantId } });
    if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  const lead = await db.lead.create({
    data: {
      tenantId: ctx.tenantId,
      igAccountId: d.igAccountId ?? null,
      contactIgId: d.contactIgId,
      contactUsername: d.contactUsername,
      tags: d.tags,
      notes: d.notes ?? null,
      status: d.status,
      source: d.source,
    },
  });
  return NextResponse.json({ lead: { ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() } });
}
