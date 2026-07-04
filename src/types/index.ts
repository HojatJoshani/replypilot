import type { AutomationRule, ConversationLog, Lead, AiConfig, InstagramAccount, Tenant, Subscription } from "@prisma/client";

// Frontend-facing DTOs (decoupled from Prisma internals where helpful).

export type Plan = "free" | "pro" | "business";

export interface TenantDto {
  id: string;
  name: string;
  plan: Plan;
  status: string;
  createdAt: string;
}

export interface InstagramAccountDto {
  id: string;
  igUserId: string;
  igUsername: string;
  igProfilePic: string | null;
  status: string;
  followerCount: number;
  connectedAt: string;
  tokenExpiresAt: string | null;
  lastEventAt: string | null;
}

export interface AutomationRuleDto {
  id: string;
  igAccountId: string;
  name: string;
  triggerType: string;
  triggerKeywords: string;
  triggerMatchMode: string;
  responseType: string;
  staticResponse: string | null;
  mediaUrl: string | null;
  aiPromptOverride: string | null;
  conditionsJson: string | null;
  actionsJson: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDto {
  id: string;
  igAccountId: string;
  contactIgId: string;
  contactUsername: string | null;
  channel: string;
  inboundMessage: string;
  outboundMessage: string | null;
  matchedRuleId: string | null;
  wasAiGenerated: boolean;
  escalated: boolean;
  intent: string | null;
  suggestedAction: string | null;
  status: string;
  postPermalink: string | null;
  aiModel: string | null;
  createdAt: string;
  igUsername?: string;
  matchedRuleName?: string | null;
}

export interface LeadDto {
  id: string;
  igAccountId: string | null;
  contactIgId: string;
  contactUsername: string | null;
  tags: string;
  notes: string | null;
  status: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  igUsername?: string;
}

export interface AiConfigDto {
  id: string;
  igAccountId: string;
  businessName: string | null;
  tone: string;
  description: string | null;
  products: string | null;
  services: string | null;
  faqs: string | null;
  pricingVisible: boolean;
  pricingNote: string | null;
  purchaseLink: string | null;
  workingHours: string | null;
  specialRules: string | null;
  aiFallbackEnabled: boolean;
  updatedAt: string;
}

export interface SubscriptionDto {
  id: string;
  plan: Plan;
  status: string;
  seats: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface AnalyticsDto {
  totalConversations: number;
  aiReplies: number;
  ruleReplies: number;
  escalated: number;
  failed: number;
  escalationRate: number;
  topKeywords: { keyword: string; count: number }[];
  topIntents: { intent: string; count: number }[];
  channelBreakdown: { channel: string; count: number }[];
  timeseries: { date: string; total: number; ai: number; rule: number; escalated: number }[];
  aiVsRule: { ai: number; rule: number };
}

export interface DashboardStatsDto {
  accounts: number;
  activeRules: number;
  conversationsToday: number;
  conversations30d: number;
  aiReplies30d: number;
  escalatedOpen: number;
  leadsNew: number;
  aiRepliesUsed: number;
  aiRepliesLimit: number;
  accountHealth: { id: string; username: string; status: string; tokenExpiresAt: string | null }[];
}

export type AccountWithAiConfig = InstagramAccount & { aiConfig: AiConfig | null };
export type AccountWithTenant = InstagramAccount & { tenant: Tenant };

export type ConversationWithRule = ConversationLog & { matchedRule: AutomationRule | null };
export type LeadWithAccount = Lead & { instagramAccount: InstagramAccount | null };
