// Boot the background webhook worker when the Next.js server starts.
// Use a dynamic import so the Edge runtime build never bundles node:crypto.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startQueue } = await import("./lib/queue");
    startQueue();
  }
}
