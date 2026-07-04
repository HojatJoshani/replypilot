import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

// Reorder rules via drag-and-drop. Accepts an ordered list of rule ids
// (top = highest priority). We assign priority = (length - index) so the
// match engine (which sorts priority desc) picks them in the given order.
const schema = z.object({
  igAccountId: z.string().min(1),
  orderedIds: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  const { igAccountId, orderedIds } = parsed.data;

  // Verify all ids belong to this tenant + account.
  const owned = await db.automationRule.findMany({
    where: { id: { in: orderedIds }, tenantId: ctx.tenantId, igAccountId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((r) => r.id));

  const total = orderedIds.length;
  await db.$transaction(
    orderedIds
      .filter((id) => ownedSet.has(id))
      .map((id, index) =>
        db.automationRule.update({
          where: { id },
          data: { priority: total - index },
        }),
      ),
  );
  return NextResponse.json({ ok: true });
}
