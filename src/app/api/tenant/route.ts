import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenant = await db.tenant.findUnique({
    where: { id: ctx.tenantId },
    include: { subscription: true, users: { select: { id: true, email: true, name: true, role: true } } },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      createdAt: tenant.createdAt.toISOString(),
      subscription: tenant.subscription
        ? {
            plan: tenant.subscription.plan,
            status: tenant.subscription.status,
            seats: tenant.subscription.seats,
            currentPeriodEnd: tenant.subscription.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: tenant.subscription.cancelAtPeriodEnd,
          }
        : null,
      users: tenant.users,
    },
  });
}
