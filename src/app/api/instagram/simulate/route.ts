import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { simulateInbound } from "@/lib/worker";
import { z } from "zod";

const schema = z.object({
  accountId: z.string().min(1),
  channel: z.enum(["dm", "comment", "story"]),
  message: z.string().min(1).max(2000),
  fromUsername: z.string().optional(),
});

// Demo helper: inject a simulated inbound Instagram event so the whole
// pipeline (webhook queue → rule engine → AI → send → conversation log)
// can be exercised without a real Meta App.
export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }

  const acc = await db.instagramAccount.findFirst({
    where: { id: parsed.data.accountId, tenantId: ctx.tenantId },
  });
  if (!acc) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const id = await simulateInbound(
    parsed.data.accountId,
    parsed.data.channel,
    parsed.data.message,
    { id: "sim_" + Date.now(), username: parsed.data.fromUsername || "مشتری_دمو" },
  );
  return NextResponse.json({ ok: true, eventId: id });
}
