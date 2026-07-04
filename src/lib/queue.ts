import { db } from "./db";
import { processWebhookEvent } from "./worker";

/**
 * Lightweight in-memory job queue (replaces BullMQ+Redis for this environment).
 *
 * - enqueue(): persists a WebhookEvent row and pushes the id to the in-memory list.
 * - A single setInterval poller drains the queue with bounded concurrency.
 * - Crash-safety: unprocessed rows with status "queued"/"processing" are
 *   recovered on startup.
 */

const MAX_CONCURRENCY = 4;
const POLL_MS = 1500;

let running = false;
const pending: string[] = [];
const inFlight = new Set<string>();

export function enqueueWebhookEvent(eventId: string) {
  pending.push(eventId);
  void drain();
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (pending.length || inFlight.size) {
      while (inFlight.size < MAX_CONCURRENCY && pending.length) {
        const id = pending.shift()!;
        inFlight.add(id);
        void processWebhookEvent(id)
          .catch((e) => console.error("[queue] job failed", id, e))
          .finally(() => inFlight.delete(id));
      }
      if (inFlight.size) await new Promise((r) => setTimeout(r, 120));
    }
  } finally {
    running = false;
  }
}

/** Recover stale jobs that were mid-flight when the process died. */
async function recoverStale() {
  const stale = await db.webhookEvent.findMany({
    where: { status: { in: ["queued", "processing"] } },
    take: 50,
    orderBy: { createdAt: "asc" },
  });
  for (const s of stale) {
    await db.webhookEvent.update({ where: { id: s.id }, data: { status: "queued" } });
    enqueueWebhookEvent(s.id);
  }
  if (stale.length) console.log(`[queue] recovered ${stale.length} stale events`);
}

let poller: NodeJS.Timeout | null = null;
let booted = false;

export function startQueue() {
  if (booted) return;
  booted = true;
  void recoverStale();
  poller = setInterval(async () => {
    const next = await db.webhookEvent.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await db.webhookEvent.update({ where: { id: next.id }, data: { status: "processing" } });
      enqueueWebhookEvent(next.id);
    }
  }, POLL_MS);
  poller.unref?.();
  console.log("[queue] background poller started");
}

export function stopQueue() {
  if (poller) clearInterval(poller);
  poller = null;
  booted = false;
}
