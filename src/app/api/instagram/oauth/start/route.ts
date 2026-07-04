import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/session";
import { getOAuthUrl } from "@/lib/instagram";
import { env } from "@/lib/env";

// Start the Instagram OAuth flow. In demo mode this redirects to the callback
// which simulates a successful connection.
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const state = `${ctx.tenantId}:${Date.now()}`;
  const url = getOAuthUrl(state);
  return NextResponse.json({ url, demoMode: env.demoMode });
}
