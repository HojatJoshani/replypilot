// Centralized environment access with safe defaults and demo-mode detection.

export const env = {
  databaseUrl: process.env.DATABASE_URL!,
  nextauthSecret: process.env.NEXTAUTH_SECRET!,
  nextauthUrl: process.env.NEXTAUTH_URL || "http://localhost:3000",
  encryptionKey: process.env.ENCRYPTION_KEY || "",
  instagramAppId: process.env.INSTAGRAM_APP_ID || "",
  instagramAppSecret: process.env.INSTAGRAM_APP_SECRET || "",
  instagramVerifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || "replypilot_verify",
  instagramGraphVersion: process.env.INSTAGRAM_GRAPH_API_VERSION || "v21.0",
  aiEnabled: process.env.AI_ENABLED !== "false",
  demoMode:
    process.env.DEMO_MODE === "true" || !process.env.INSTAGRAM_APP_ID,
};

export const GRAPH_BASE = `https://graph.facebook.com/${env.instagramGraphVersion}`;

export function isInstagramConfigured() {
  return Boolean(env.instagramAppId && env.instagramAppSecret);
}
