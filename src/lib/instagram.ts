import { db } from "./db";
import { decrypt, encrypt } from "./crypto";
import { env, GRAPH_BASE, isInstagramConfigured } from "./env";

/**
 * Instagram Graph API client.
 * In demo mode (no Meta App credentials), token operations are simulated
 * and sending replies is logged but not actually delivered to Instagram.
 */

export interface IgSendResult {
  ok: boolean;
  recipientId?: string;
  messageId?: string;
  simulated?: boolean;
  error?: string;
}

/** Decrypt + return a tenant's access token for an Instagram account. */
export async function getAccessToken(igAccountId: string): Promise<string | null> {
  const account = await db.instagramAccount.findUnique({ where: { id: igAccountId } });
  if (!account) return null;
  try {
    return decrypt(account.accessTokenEncrypted);
  } catch {
    return null;
  }
}

export async function storeAccessToken(
  igAccountId: string,
  token: string,
  expiresAt?: Date | null,
) {
  return encrypt(token); // returned so caller persists; kept here for symmetry
}

/** Build the official Instagram OAuth authorize URL. */
export function getOAuthUrl(state: string): string {
  if (!isInstagramConfigured()) {
    // Demo mode: we never redirect to a real Meta screen.
    return `/api/instagram/oauth/callback?demo=1&state=${encodeURIComponent(state)}`;
  }
  const redirectUri = `${env.nextauthUrl}/api/instagram/oauth/callback`;
  const params = new URLSearchParams({
    client_id: env.instagramAppId,
    redirect_uri: redirectUri,
    scope:
      "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish",
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/${env.instagramGraphVersion}/dialog/oauth?${params.toString()}`;
}

/** Exchange an authorization code for a long-lived access token. */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  igUserId: string;
  expiresAt: Date | null;
}> {
  if (!isInstagramConfigured()) {
    throw new Error("Instagram is not configured (demo mode).");
  }
  const redirectUri = `${env.nextauthUrl}/api/instagram/oauth/callback`;
  const url = `${GRAPH_BASE}/oauth/access_token`;
  const body = new URLSearchParams({
    client_id: env.instagramAppId,
    client_secret: env.instagramAppSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Token exchange failed");
  // Exchange short-lived for long-lived (~60 days)
  const llUrl = `${GRAPH_BASE}/access_token?${new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_secret: env.instagramAppSecret,
    fb_exchange_token: data.access_token,
  })}`;
  const llRes = await fetch(llUrl);
  const ll = await llRes.json();
  if (ll.error) throw new Error(ll.error.message || "Long-lived exchange failed");
  const expiresIn = ll.expires_in as number | undefined;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
  return { accessToken: ll.access_token, igUserId: data.user_id, expiresAt };
}

/** Fetch the connected user's profile (username, followers, profile pic). */
export async function fetchProfile(accessToken: string, igUserId: string) {
  if (!isInstagramConfigured()) {
    return null; // demo: caller synthesizes a profile
  }
  const url = `${GRAPH_BASE}/${igUserId}?fields=username,followers_count,profile_picture_url&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data as { username: string; followers_count: number; profile_picture_url?: string };
}

/** Send a DM via the Send API. Respects the 24h messaging window by checking timestamp externally. */
export async function sendDirectMessage(
  igAccountId: string,
  recipientId: string,
  message: string,
): Promise<IgSendResult> {
  const token = await getAccessToken(igAccountId);
  if (!token || !isInstagramConfigured()) {
    return { ok: true, recipientId, simulated: true };
  }
  const url = `${GRAPH_BASE}/${igAccountId}/messages?access_token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });
  const data = await res.json();
  if (data.error) return { ok: false, error: data.error.message };
  return { ok: true, recipientId: data.recipient_id, messageId: data.message_id };
}

/** Reply to a public comment via the Comments API. */
export async function replyToComment(
  igAccountId: string,
  commentId: string,
  message: string,
): Promise<IgSendResult> {
  const token = await getAccessToken(igAccountId);
  if (!token || !isInstagramConfigured()) {
    return { ok: true, simulated: true };
  }
  const url = `${GRAPH_BASE}/${commentId}/replies?access_token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const data = await res.json();
  if (data.error) return { ok: false, error: data.error.message };
  return { ok: true, messageId: data.id };
}

/** Refresh a long-lived token before expiry (~60 day lifetime). */
export async function refreshLongLivedToken(accessToken: string) {
  if (!isInstagramConfigured()) return { accessToken, expiresAt: null };
  const url = `${GRAPH_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const expiresIn = data.expires_in as number;
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/** Scheduled token refresh for all accounts nearing expiry. */
export async function refreshExpiringTokens() {
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accounts = await db.instagramAccount.findMany({
    where: { tokenExpiresAt: { lte: soon }, status: "active" },
  });
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const acc of accounts) {
    try {
      const token = decrypt(acc.accessTokenEncrypted);
      const refreshed = await refreshLongLivedToken(token);
      await db.instagramAccount.update({
        where: { id: acc.id },
        data: {
          accessTokenEncrypted: encrypt(refreshed.accessToken),
          tokenExpiresAt: refreshed.expiresAt,
        },
      });
      results.push({ id: acc.id, ok: true });
    } catch (e) {
      results.push({ id: acc.id, ok: false, error: (e as Error).message });
    }
  }
  return results;
}
