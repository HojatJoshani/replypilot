import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { PLANS } from "@/lib/constants";
import { z } from "zod";

// GET subscription + plan options.
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sub = await db.subscription.findUnique({ where: { tenantId: ctx.tenantId } });
  return NextResponse.json({
    subscription: sub
      ? {
          id: sub.id,
          plan: sub.plan,
          status: sub.status,
          seats: sub.seats,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    plans: PLANS,
  });
}

const changeSchema = z.object({
  plan: z.enum(["free", "pro", "business"]),
});

// Change plan (stubbed billing — swap for Stripe / Iranian gateway later).
export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = changeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  const plan = parsed.data.plan;
  const planDef = PLANS.find((p) => p.value === plan);
  if (!planDef) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  const sub = await db.subscription.upsert({
    where: { tenantId: ctx.tenantId },
    create: {
      tenantId: ctx.tenantId,
      plan,
      status: "active",
      seats: planDef.limits.accounts,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      plan,
      status: "active",
      seats: planDef.limits.accounts,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    },
  });
  await db.tenant.update({ where: { id: ctx.tenantId }, data: { plan } });
  return NextResponse.json({
    subscription: {
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      seats: sub.seats,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    },
  });
}

export async function DELETE() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.subscription.upsert({
    where: { tenantId: ctx.tenantId },
    create: { tenantId: ctx.tenantId, plan: "free", status: "active", seats: 1, cancelAtPeriodEnd: true },
    update: { cancelAtPeriodEnd: true },
  });
  return NextResponse.json({ ok: true });
}
