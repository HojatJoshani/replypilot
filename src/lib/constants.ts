// Domain enums and labels shared across the app.

export const TRIGGER_TYPES = [
  { value: "keyword", label: "Keyword Match", description: "Fire when the message contains specific keywords" },
  { value: "any_dm", label: "Any DM", description: "Fire on every incoming direct message" },
  { value: "any_comment", label: "Any Comment", description: "Fire on every comment on your posts" },
  { value: "story_reply", label: "Story Reply", description: "Fire when someone replies to your story" },
] as const;

export const RESPONSE_TYPES = [
  { value: "static_text", label: "Static Text", description: "Send a fixed text reply" },
  { value: "static_media", label: "Static Media", description: "Send a fixed media reply (image URL)" },
  { value: "ai_generated", label: "AI Generated", description: "Let the AI assistant craft a dynamic reply" },
] as const;

export const TONES = [
  { value: "friendly", label: "Friendly & Warm" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual & Relaxed" },
  { value: "playful", label: "Playful & Fun" },
] as const;

export const CHANNELS = [
  { value: "dm", label: "Direct Message" },
  { value: "comment", label: "Comment" },
  { value: "story", label: "Story Reply" },
] as const;

export const PLANS = [
  {
    value: "free",
    label: "Starter",
    price: 0,
    tagline: "For trying things out",
    features: ["1 Instagram account", "50 AI replies / month", "Basic automation rules", "7-day conversation history"],
    limits: { accounts: 1, aiReplies: 50, rules: 10 },
  },
  {
    value: "pro",
    label: "Growth",
    price: 29,
    tagline: "For growing businesses",
    features: ["3 Instagram accounts", "2,000 AI replies / month", "Unlimited automation rules", "Lead capture & export", "Priority support"],
    limits: { accounts: 3, aiReplies: 2000, rules: 999 },
    popular: true,
  },
  {
    value: "business",
    label: "Scale",
    price: 79,
    tagline: "For agencies & teams",
    features: ["10 Instagram accounts", "Unlimited AI replies", "Team seats & roles", "Advanced analytics", "API access", "Dedicated manager"],
    limits: { accounts: 10, aiReplies: 999999, rules: 999 },
  },
] as const;

export const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-sky-100 text-sky-700" },
  { value: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-700" },
  { value: "qualified", label: "Qualified", color: "bg-violet-100 text-violet-700" },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-700" },
  { value: "lost", label: "Lost", color: "bg-rose-100 text-rose-700" },
] as const;

export const CONVERSATION_STATUSES = [
  { value: "auto", label: "Auto-replied", color: "bg-emerald-100 text-emerald-700" },
  { value: "manual", label: "Manual", color: "bg-sky-100 text-sky-700" },
  { value: "escalated", label: "Needs Follow-up", color: "bg-amber-100 text-amber-700" },
  { value: "resolved", label: "Resolved", color: "bg-muted text-muted-foreground" },
  { value: "failed", label: "Failed", color: "bg-rose-100 text-rose-700" },
] as const;

export const ACCOUNT_STATUSES = [
  { value: "active", label: "Connected", color: "bg-emerald-500" },
  { value: "disconnected", label: "Disconnected", color: "bg-muted-foreground" },
  { value: "expired", label: "Token Expired", color: "bg-amber-500" },
] as const;

export function labelFor(list: readonly { value: string; label: string }[], value: string) {
  return list.find((i) => i.value === value)?.label || value;
}
