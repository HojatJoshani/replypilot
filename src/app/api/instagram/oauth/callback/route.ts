import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { encrypt } from "@/lib/crypto";
import { exchangeCodeForToken, fetchProfile } from "@/lib/instagram";
import { env } from "@/lib/env";

// OAuth callback. Handles both real Meta redirects and demo-mode simulation.
export async function GET(req: Request) {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) {
    return NextResponse.redirect(new URL("/?auth=error", env.nextauthUrl));
  }
  const url = new URL(req.url);
  const demo = url.searchParams.get("demo") === "1" || env.demoMode;

  let igUserId: string;
  let accessToken: string;
  let expiresAt: Date | null;
  let username: string;
  let followers = 0;
  let profilePic: string | null = null;

  if (demo) {
    // Simulate a successful connection with a fake business account.
    igUserId = "1784140" + Math.floor(Math.random() * 1e10).toString().padStart(10, "0");
    accessToken = "IGQVJ_DEMO_" + Math.random().toString(36).slice(2);
    expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
    username = "demo_business_" + Math.floor(Math.random() * 9999);
    followers = Math.floor(1000 + Math.random() * 50000);
    profilePic = "https://z-cdn.chatglm.cn/z-ai/static/logo.svg";
  } else {
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.redirect(new URL("/?auth=error", env.nextauthUrl));
    try {
      const token = await exchangeCodeForToken(code);
      accessToken = token.accessToken;
      igUserId = token.igUserId;
      expiresAt = token.expiresAt;
      const profile = await fetchProfile(accessToken, igUserId);
      username = profile?.username || "instagram_account";
      followers = profile?.followers_count || 0;
      profilePic = profile?.profile_picture_url || null;
    } catch (e) {
      console.error("[oauth] callback failed", e);
      return NextResponse.redirect(new URL("/?auth=error", env.nextauthUrl));
    }
  }

  // Upsert account for this tenant (one row per IG user id within tenant).
  const existing = await db.instagramAccount.findFirst({
    where: { tenantId: ctx.tenantId, igUserId },
  });
  const account = existing
    ? await db.instagramAccount.update({
        where: { id: existing.id },
        data: {
          igUsername: username,
          igProfilePic: profilePic,
          accessTokenEncrypted: encrypt(accessToken),
          tokenExpiresAt: expiresAt,
          status: "active",
          followerCount: followers,
          connectedAt: new Date(),
        },
      })
    : await db.instagramAccount.create({
        data: {
          tenantId: ctx.tenantId,
          igUserId,
          igUsername: username,
          igProfilePic: profilePic,
          accessTokenEncrypted: encrypt(accessToken),
          tokenExpiresAt: expiresAt,
          status: "active",
          followerCount: followers,
        },
      });

  // Ensure an AiConfig row exists for the account.
  await db.aiConfig.upsert({
    where: { igAccountId: account.id },
    create: { igAccountId: account.id, tenantId: ctx.tenantId },
    update: {},
  });

  return NextResponse.redirect(new URL("/?auth=success", env.nextauthUrl));
}
