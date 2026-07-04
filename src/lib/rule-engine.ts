import type { AutomationRule } from "@prisma/client";

/**
 * Rule-matching engine — the most failure-prone part of the system.
 * Given a message and the active rules for an account (ordered by priority desc),
 * returns the first matching rule (or null for AI fallback).
 *
 * Matching semantics:
 *  - keyword: split triggerKeywords by comma, lowercase, trim. Empty keywords → no match.
 *    matchMode "any" → match if ANY keyword is a substring of the message (case-insensitive).
 *    matchMode "all" → match only if ALL keywords are present.
 *  - any_dm: matches any message on the dm channel.
 *  - any_comment: matches any message on the comment channel.
 *  - story_reply: matches any message on the story channel.
 */

export interface RuleMatchInput {
  message: string;
  channel: "dm" | "comment" | "story";
}

export interface MatchedRule {
  rule: AutomationRule;
  matchedKeywords?: string[];
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

export function matchRule(input: RuleMatchInput, rules: AutomationRule[]): MatchedRule | null {
  const msg = input.message.toLowerCase();
  // Rules should already be sorted by priority desc; we iterate in order.
  for (const rule of rules) {
    if (!rule.isActive) continue;
    switch (rule.triggerType) {
      case "any_dm":
        if (input.channel === "dm") return { rule };
        break;
      case "any_comment":
        if (input.channel === "comment") return { rule };
        break;
      case "story_reply":
        if (input.channel === "story") return { rule };
        break;
      case "keyword": {
        const kws = parseKeywords(rule.triggerKeywords);
        if (kws.length === 0) break;
        if (rule.triggerMatchMode === "all") {
          if (kws.every((k) => msg.includes(k))) return { rule, matchedKeywords: kws };
        } else {
          const hit = kws.find((k) => msg.includes(k));
          if (hit) return { rule, matchedKeywords: [hit] };
        }
        break;
      }
    }
  }
  return null;
}

/** Quick predicate for tests/UI preview. */
export function wouldRuleMatch(input: RuleMatchInput, rule: AutomationRule): boolean {
  return matchRule(input, [rule]) !== null;
}
