// Boot the background webhook worker when the Next.js server starts.
// Use a dynamic import so the Edge runtime build never bundles node:crypto.

// Ensure required env vars have fallbacks for Vercel deployments where
// the user may not have configured them in the Vercel dashboard yet.
const FALLBACK_ENCRYPTION_KEY = "0000000000000000000000000000000000000000000000000000000000000000";
const FALLBACK_NEXTAUTH_SECRET = "aria-demo-fallback-secret-not-for-production-use";

if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = FALLBACK_ENCRYPTION_KEY;
}
if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = FALLBACK_NEXTAUTH_SECRET;
}
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL || "localhost:3000"}`;
}
// Only override DATABASE_URL in production (Vercel). In dev, use .env as-is.
if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
    process.env.DATABASE_URL = `file:/tmp/custom.db`;
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Pre-warm the schema + seed data on cold start (non-blocking)
    import("./lib/db")
      .then(({ ensureSeedData }) => ensureSeedData().catch(() => {}))
      .catch(() => {});
    // Start the background queue worker
    import("./lib/queue")
      .then(({ startQueue }) => startQueue())
      .catch(() => {});
  }
}
