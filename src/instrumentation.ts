// Boot the background webhook worker when the Next.js server starts.
// Use a dynamic import so the Edge runtime build never bundles node:crypto.

// Fallback secrets for demo mode (when Vercel env vars are not configured)
const FALLBACK_ENCRYPTION_KEY = "0000000000000000000000000000000000000000000000000000000000000000";
const FALLBACK_NEXTAUTH_SECRET = "aria-demo-fallback-secret-not-for-production-use-9f3a7b2e";

function applyEnvFallbacks() {
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = FALLBACK_ENCRYPTION_KEY;
  }
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = FALLBACK_NEXTAUTH_SECRET;
  }
  if (!process.env.NEXTAUTH_URL) {
    // Vercel sets VERCEL_URL automatically (e.g. "myapp.vercel.app")
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      process.env.NEXTAUTH_URL = `https://${vercelUrl}`;
    }
  }
  // Only override DATABASE_URL in production (Vercel). In dev, use .env as-is.
  if (process.env.NODE_ENV === "production") {
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
      process.env.DATABASE_URL = `file:/tmp/custom.db`;
    }
  }
}

// Apply fallbacks at module load time (works in both edge and nodejs runtimes)
applyEnvFallbacks();

export async function register() {
  // Re-apply in register() to be safe (runs on cold start)
  applyEnvFallbacks();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Pre-warm the schema + seed data on cold start (non-blocking)
    try {
      const { ensureSeedData } = await import("./lib/db");
      ensureSeedData().catch(() => {});
    } catch {
      // ignore
    }
    // Start the background queue worker
    try {
      const { startQueue } = await import("./lib/queue");
      startQueue();
    } catch {
      // ignore
    }
  }
}
