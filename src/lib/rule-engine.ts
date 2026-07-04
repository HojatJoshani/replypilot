import type { AutomationRule } from "@prisma/client";

/**
 * Rule-matching engine — supports:
 *  - Triggers: keyword (any/all), any_dm, any_comment, story_reply
 *  - Conditions (optional, via conditionsJson): channel, time_window, contact_type,
 *    message_contains, message_length
 *
 * Rules are evaluated in priority-desc order. The first rule whose trigger AND
 * all conditions match is returned. Conditions are AND-ed together.
 */

export interface RuleMatchInput {
  message: string;
  channel: "dm" | "comment" | "story";
  contactIgId?: string;
  isFirstMessage?: boolean; // true if this contact has no prior conversations
}

export interface MatchedRule {
  rule: AutomationRule;
  matchedKeywords?: string[];
}

export interface Condition {
  type: string;
  operator: string;
  value: string;
}

export interface RuleAction {
  type: string; // reply_text | reply_media | ai_reply | tag_lead | escalate | resolve
  value: string;
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Parse "HH:MM-HH:MM" window. Returns [startMin, endMin] in minutes from midnight. */
function parseTimeWindow(value: string): [number, number] | null {
  const m = value.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  return [start, end];
}

function isTimeInWindow(value: string, date = new Date()): boolean {
  const win = parseTimeWindow(value);
  if (!win) return true;
  const [start, end] = win;
  const nowMin = date.getHours() * 60 + date.getMinutes();
  // Handle overnight windows (e.g. 20:00-10:00)
  if (start <= end) {
    return nowMin >= start && nowMin < end;
  }
  return nowMin >= start || nowMin < end;
}

/** Evaluate a single condition against the input. */
export function evaluateCondition(cond: Condition, input: RuleMatchInput): boolean {
  const msg = input.message.toLowerCase();
  switch (cond.type) {
    case "channel":
      if (cond.operator === "is") return input.channel === cond.value;
      if (cond.operator === "is_not") return input.channel !== cond.value;
      return true;
    case "time_window":
      if (cond.operator === "between") return isTimeInWindow(cond.value);
      return true;
    case "contact_type":
      if (cond.operator === "is") return cond.value === "new" ? !!input.isFirstMessage : !input.isFirstMessage;
      if (cond.operator === "is_not") return cond.value === "new" ? !input.isFirstMessage : !!input.isFirstMessage;
      return true;
    case "message_contains":
      if (cond.operator === "contains") return msg.includes(cond.value.toLowerCase());
      if (cond.operator === "not_contains") return !msg.includes(cond.value.toLowerCase());
      return true;
    case "message_length":
      const len = input.message.length;
      const n = Number(cond.value) || 0;
      if (cond.operator === "lt") return len < n;
      if (cond.operator === "gt") return len > n;
      return true;
    default:
      return true;
  }
}

function evaluateAllConditions(conditions: Condition[], input: RuleMatchInput): boolean {
  return conditions.every((c) => evaluateCondition(c, input));
}

export function matchRule(input: RuleMatchInput, rules: AutomationRule[]): MatchedRule | null {
  const msg = input.message.toLowerCase();
  for (const rule of rules) {
    if (!rule.isActive) continue;

    // 1. Evaluate trigger
    let triggered = false;
    let matchedKeywords: string[] | undefined;
    switch (rule.triggerType) {
      case "any_dm":
        if (input.channel === "dm") triggered = true;
        break;
      case "any_comment":
        if (input.channel === "comment") triggered = true;
        break;
      case "story_reply":
        if (input.channel === "story") triggered = true;
        break;
      case "keyword": {
        const kws = parseKeywords(rule.triggerKeywords);
        if (kws.length === 0) break;
        if (rule.triggerMatchMode === "all") {
          if (kws.every((k) => msg.includes(k))) {
            triggered = true;
            matchedKeywords = kws;
          }
        } else {
          const hit = kws.find((k) => msg.includes(k));
          if (hit) {
            triggered = true;
            matchedKeywords = [hit];
          }
        }
        break;
      }
    }
    if (!triggered) continue;

    // 2. Evaluate conditions (AND-ed)
    const conditions = parseJson<Condition[]>(rule.conditionsJson, []);
    if (conditions.length > 0 && !evaluateAllConditions(conditions, input)) continue;

    return { rule, matchedKeywords };
  }
  return null;
}

/** Quick predicate for tests/UI preview. */
export function wouldRuleMatch(input: RuleMatchInput, rule: AutomationRule): boolean {
  return matchRule(input, [rule]) !== null;
}

/** Parse actions from a rule's actionsJson (falls back to legacy single-response fields). */
export function getRuleActions(rule: AutomationRule): RuleAction[] {
  const actions = parseJson<RuleAction[]>(rule.actionsJson, []);
  if (actions.length > 0) return actions;
  // Backward compat: derive from legacy fields
  if (rule.responseType === "static_text" && rule.staticResponse) {
    return [{ type: "reply_text", value: rule.staticResponse }];
  }
  if (rule.responseType === "static_media" && rule.mediaUrl) {
    return [{ type: "reply_media", value: rule.mediaUrl }];
  }
  if (rule.responseType === "ai_generated") {
    return [{ type: "ai_reply", value: rule.aiPromptOverride || "" }];
  }
  return [];
}

/** Parse conditions from a rule's conditionsJson. */
export function getRuleConditions(rule: AutomationRule): Condition[] {
  return parseJson<Condition[]>(rule.conditionsJson, []);
}
