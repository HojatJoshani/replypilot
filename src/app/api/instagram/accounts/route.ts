import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";

// List this tenant's Instagram accounts (with token health).
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accounts = await db.instagramAccount.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { connectedAt: "desc" },
    include: { _count: { select: { automationRules: { where: { isActive: true } } } } },
  });
  const data = accounts.map((a) => ({
    id: a.id,
    igUserId: a.igUserId,
    igUsername: a.igUsername,
    igProfilePic: a.igProfilePic,
    status: a.status,
    followerCount: a.followerCount,
    connectedAt: a.connectedAt.toISOString(),
    tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
    lastEventAt: a.lastEventAt?.toISOString() ?? null,
    activeRules: a._count.automationRules,
  }));
  return NextResponse.json({ accounts: data });
}

// Disconnect an account.
export async function DELETE(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.instagramAccount.deleteMany({ where: { id, tenantId: ctx.tenantId } });
  return NextResponse.json({ ok: true });
}
