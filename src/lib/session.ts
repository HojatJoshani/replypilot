import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";
import type { Tenant, User } from "@prisma/client";

/** Get the authenticated session + tenant for a server-side API route. */
export async function getTenantContext() {
  const session = await getServerSession(authOptions);
  const tenantId = (session?.user as { tenantId?: string } | undefined)?.tenantId;
  if (!session || !tenantId) return { session: null, tenant: null, tenantId: null };
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  return { session, tenant, tenantId };
}

export async function requireTenant() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId || !ctx.tenant) {
    throw new Error("Unauthorized");
  }
  return ctx as { session: Awaited<ReturnType<typeof getServerSession>>; tenant: Tenant; tenantId: string };
}

export type { User };
