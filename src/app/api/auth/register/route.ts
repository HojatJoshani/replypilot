import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  businessName: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }
  const { name, email, password, businessName } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const tenant = await db.tenant.create({
    data: {
      name: businessName,
      plan: "free",
      status: "active",
      subscription: { create: { plan: "free", status: "active", seats: 1, currentPeriodEnd: null } },
      users: {
        create: {
          email,
          name,
          role: "admin",
          passwordHash: hashPassword(password),
        },
      },
    },
    include: { users: true },
  });

  return NextResponse.json({ ok: true, tenantId: tenant.id });
}
