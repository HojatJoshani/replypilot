import { db } from "./db";
import { matchRule, getRuleActions } from "./rule-engine";
import { aiConfigToContext, generateAiReply } from "./ai";
import { sendDirectMessage, replyToComment } from "./instagram";
import { env } from "./env";

/**
 * Background worker for Instagram webhook events.
 *
 * Webhook handler enqueues a WebhookEvent row (and a job in the in-memory queue).
 * This worker processes each event:
 *  1. Resolve the tenant + Instagram account.
 *  2. Extract the inbound message + channel.
 *  3. Run the rule engine over active rules (priority desc).
 *  4. If a static rule matches → send the static reply.
 *     If an AI rule matches, or no rule matches and AI fallback is on → call the AI layer.
 *  5. Send the reply back to Instagram (or simulate in demo mode).
 *  6. Persist a ConversationLog (with escalate flag if AI asked for human follow-up).
 *  7. Optionally create/update a Lead when escalated.
 */

export interface ParsedEvent {
  tenantId?: string;
  igAccountId?: string;
  channel: "dm" | "comment" | "story";
  contactIgId: string;
  contactUsername?: string;
  message: string;
  postPermalink?: string;
  parentCommentId?: string; // for comment replies
}

/** Parse a raw Instagram webhook payload into a normalized event. */
export function parseWebhookPayload(payload: unknown): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const body = payload as Record<string, unknown>;
  const entry = body.entry as
    | { id?: string; messaging?: unknown[]; changes?: unknown[] }[]
    | undefined;
  if (!Array.isArray(entry)) return events;

  for (const e of entry) {
    // DMs (messaging)
    if (Array.isArray(e.messaging)) {
      for (const m of e.messaging as Record<string, unknown>[]) {
        const sender = m.sender as { id?: string; username?: string } | undefined;
        const recipient = (m.recipient as { id?: string })?.id;
        const msg = (m.message as { text?: string })?.text;
        if (!sender?.id || !msg) continue;
        events.push({
          igAccountId: recipient,
          contactIgId: sender.id,
          contactUsername: sender.username,
          channel: "dm",
          message: msg,
        });
      }
    }
    // Comments & mentions (changes)
    if (Array.isArray(e.changes)) {
      for (const c of e.changes as Record<string, unknown>[]) {
        const field = c.field as string | undefined;
        const value = c.value as Record<string, unknown> | undefined;
        if (!value) continue;
        if (field === "comments") {
          const id = value.id as string;
          const text = value.text as string;
          const from = value.from as { id?: string; username?: string };
          const media = value.media as { permalink?: string };
          if (from?.id && text) {
            events.push({
              igAccountId: e.id,
              contactIgId: from.id,
              contactUsername: from.username,
              channel: "comment",
              message: text,
              postPermalink: media?.permalink,
              parentCommentId: id,
            });
          }
        } else if (field === "mentions" || field === "story_insights") {
          const text = (value.text as string) || (value.comment_id as string) || "story reply";
          const from = value.from as { id?: string; username?: string } | undefined;
          const commenterId = from?.id || (value.commenter_id as string) || "unknown";
          events.push({
            igAccountId: e.id,
            contactIgId: commenterId,
            contactUsername: from?.username || (value.username as string),
            channel: "story",
            message: text,
            postPermalink: value.permalink as string | undefined,
          });
        }
      }
    }
  }
  return events;
}

async function resolveAccount(igUserId: string | undefined) {
  if (!igUserId) return null;
  return db.instagramAccount.findFirst({
    where: { OR: [{ id: igUserId }, { igUserId: igUserId }] },
    include: { aiConfig: true, tenant: true },
  });
}

export async function processWebhookEvent(eventId: string): Promise<void> {
  const wh = await db.webhookEvent.findUnique({ where: { id: eventId } });
  if (!wh) return;
  await db.webhookEvent.update({
    where: { id: eventId },
    data: { status: "processing", attempts: { increment: 1 } },
  });
  try {
    const payload = JSON.parse(wh.payload);
    const parsed = parseWebhookPayload(payload);
    if (parsed.length === 0) {
      await db.webhookEvent.update({ where: { id: eventId }, data: { status: "done", processedAt: new Date() } });
      return;
    }
    for (const evt of parsed) {
      await handleParsedEvent(evt, wh.id);
    }
    await db.webhookEvent.update({ where: { id: eventId }, data: { status: "done", processedAt: new Date() } });
  } catch (e) {
    const msg = (e as Error).message;
    await db.webhookEvent.update({
      where: { id: eventId },
      data: { status: "failed", error: msg },
    });
    console.error("[worker] event failed", eventId, msg);
  }
}

async function handleParsedEvent(evt: ParsedEvent, webhookEventId: string) {
  const account = await resolveAccount(evt.igAccountId);
  if (!account) {
    console.warn("[worker] no account for igUserId", evt.igAccountId);
    return;
  }
  const tenantId = account.tenantId;

  // Check if this is the first message from this contact (for contact_type condition)
  const priorCount = await db.conversationLog.count({
    where: { igAccountId: account.id, contactIgId: evt.contactIgId },
  });
  const isFirstMessage = priorCount === 0;

  // Load active rules ordered by priority desc, then createdAt asc.
  const rules = await db.automationRule.findMany({
    where: { igAccountId: account.id, isActive: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const matched = matchRule(
    { message: evt.message, channel: evt.channel, contactIgId: evt.contactIgId, isFirstMessage },
    rules,
  );

  let outbound: string | null = null;
  let wasAi = false;
  let escalated = false;
  let resolved = false;
  let intent: string | null = null;
  let suggestedAction: string | null = null;
  let matchedRuleId: string | null = matched?.rule.id ?? null;
  let aiModel: string | null = null;
  let leadTags: string[] = [];

  // Execute actions from the matched rule (multi-action support)
  if (matched) {
    const actions = getRuleActions(matched.rule);
    for (const action of actions) {
      switch (action.type) {
        case "reply_text":
          outbound = action.value;
          break;
        case "reply_media":
          outbound = action.value ? `[media] ${action.value}` : outbound;
          break;
        case "ai_reply": {
          wasAi = true;
          aiModel = "z-ai-glm";
          const ctx = account.aiConfig
            ? aiConfigToContext(account.aiConfig, evt.channel, evt.contactUsername)
            : { channel: evt.channel, contactUsername: evt.contactUsername, tone: "friendly", businessName: account.igUsername };
          if (action.value) ctx.aiPromptOverride = action.value;
          else if (matched.rule.aiPromptOverride) ctx.aiPromptOverride = matched.rule.aiPromptOverride;
          const res = await generateAiReply(ctx, evt.message);
          outbound = res.reply.reply;
          intent = res.reply.intent;
          if (res.reply.escalate) escalated = true;
          suggestedAction = res.reply.suggestedAction;
          break;
        }
        case "tag_lead":
          leadTags.push(action.value || "auto");
          break;
        case "escalate":
          escalated = true;
          if (action.value && !suggestedAction) suggestedAction = action.value;
          break;
        case "resolve":
          resolved = true;
          break;
      }
    }
    // Backward compat: if no actions but legacy fields exist, use them
    if (actions.length === 0) {
      if (matched.rule.responseType === "static_text") {
        outbound = matched.rule.staticResponse || "";
      } else if (matched.rule.responseType === "static_media") {
        outbound = matched.rule.mediaUrl ? `[media] ${matched.rule.mediaUrl}` : "";
      } else if (matched.rule.responseType === "ai_generated") {
        wasAi = true;
        aiModel = "z-ai-glm";
        const ctx = account.aiConfig
          ? aiConfigToContext(account.aiConfig, evt.channel, evt.contactUsername)
          : { channel: evt.channel, contactUsername: evt.contactUsername, tone: "friendly", businessName: account.igUsername };
        if (matched.rule.aiPromptOverride) ctx.aiPromptOverride = matched.rule.aiPromptOverride;
        const res = await generateAiReply(ctx, evt.message);
        outbound = res.reply.reply;
        intent = res.reply.intent;
        if (res.reply.escalate) escalated = true;
        suggestedAction = res.reply.suggestedAction;
      }
    }
  } else if (!matched && account.aiConfig?.aiFallbackEnabled) {
    wasAi = true;
    aiModel = "z-ai-glm";
    const ctx = aiConfigToContext(account.aiConfig, evt.channel, evt.contactUsername);
    const res = await generateAiReply(ctx, evt.message);
    outbound = res.reply.reply;
    intent = res.reply.intent;
    if (res.reply.escalate) escalated = true;
    suggestedAction = res.reply.suggestedAction;
  } else {
    escalated = true;
    outbound = null;
  }

  // Send the reply
  let sendError: string | null = null;
  if (outbound) {
    try {
      if (evt.channel === "dm") {
        await sendDirectMessage(account.id, evt.contactIgId, outbound);
      } else if (evt.channel === "comment" && evt.parentCommentId) {
        await replyToComment(account.id, evt.parentCommentId, outbound);
      } else if (evt.channel === "story" && evt.parentCommentId) {
        await replyToComment(account.id, evt.parentCommentId, outbound);
      } else {
        await sendDirectMessage(account.id, evt.contactIgId, outbound);
      }
    } catch (e) {
      sendError = (e as Error).message;
      escalated = true;
    }
  }

  const status = sendError ? "failed" : resolved ? "resolved" : escalated ? "escalated" : "auto";
  const convo = await db.conversationLog.create({
    data: {
      tenantId,
      igAccountId: account.id,
      contactIgId: evt.contactIgId,
      contactUsername: evt.contactUsername,
      channel: evt.channel,
      inboundMessage: evt.message,
      outboundMessage: outbound,
      matchedRuleId,
      wasAiGenerated: wasAi,
      escalated,
      intent,
      suggestedAction,
      status,
      postPermalink: evt.postPermalink,
      aiModel,
    },
  });

  await db.instagramAccount.update({
    where: { id: account.id },
    data: { lastEventAt: new Date() },
  });

  // Lead capture on escalation, pricing/order intents, or explicit tag_lead actions.
  if (leadTags.length > 0 || escalated || intent === "pricing" || intent === "order_status") {
    await upsertLead(tenantId, account.id, evt, convo.id, intent, leadTags);
  }

  console.log(
    `[worker] processed webhook ${webhookEventId} → convo ${convo.id} (ai=${wasAi}, escalated=${escalated})`,
  );
}

async function upsertLead(
  tenantId: string,
  igAccountId: string | undefined,
  evt: ParsedEvent,
  convoId: string,
  intent: string | null,
  extraTags: string[] = [],
) {
  const existing = await db.lead.findFirst({
    where: { tenantId, contactIgId: evt.contactIgId },
  });
  const tags = [intent, evt.channel, ...extraTags].filter(Boolean).join(",");
  if (existing) {
    await db.lead.update({
      where: { id: existing.id },
      data: {
        igAccountId: igAccountId ?? existing.igAccountId,
        contactUsername: evt.contactUsername ?? existing.contactUsername,
        tags: existing.tags ? `${existing.tags},${tags}` : tags,
        source: evt.channel,
      },
    });
  } else {
    await db.lead.create({
      data: {
        tenantId,
        igAccountId,
        contactIgId: evt.contactIgId,
        contactUsername: evt.contactUsername,
        tags,
        source: evt.channel,
        notes: `Auto-captured from conversation ${convoId}`,
        status: "new",
      },
    });
  }
}

/** In demo mode, inject a simulated inbound event for a given account. */
export async function simulateInbound(accountId: string, channel: "dm" | "comment" | "story", message: string, from?: { id: string; username?: string }) {
  const username = from?.username || "مشتری_دمو";
  const senderId = from?.id || "sim_user_" + Math.random().toString(36).slice(2, 8);
  const payload = {
    object: "instagram",
    entry: channel === "dm"
      ? [{
          id: accountId,
          messaging: [{
            sender: { id: senderId, username },
            recipient: { id: accountId },
            message: { text: message },
          }],
        }]
      : [{
          id: accountId,
          changes: [{
            field: channel === "comment" ? "comments" : "mentions",
            value: {
              id: channel === "comment" ? "sim_c_" + Date.now() : undefined,
              text: message,
              from: { id: senderId, username },
              media: { permalink: "https://instagram.com/p/sim" },
              permalink: "https://instagram.com/p/sim",
            },
          }],
        }],
  };
  const wh = await db.webhookEvent.create({
    data: {
      igAccountId: accountId,
      eventType: channel === "dm" ? "messages" : channel === "comment" ? "comments" : "mentions",
      payload: JSON.stringify(payload),
      status: "queued",
    },
  });
  // Process immediately in demo (the queue worker also picks it up).
  void processWebhookEvent(wh.id);
  return wh.id;
}
