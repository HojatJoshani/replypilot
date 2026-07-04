# Task 4-c — InboxView, LeadsView, BillingView, SettingsView

## What was built

Four client-only view components for the ReplyPilot dashboard. Each reads `selectedAccountId` from `useAppStore()` and shows a connect-Instagram CTA when null. All API calls go through `@/lib/api-client` + `@/hooks/use-api`.

### Files written (overwriting stubs)
- `src/components/views/inbox-view.tsx` — `InboxView()` — two-pane messaging inbox (340px list | flex-1 detail) on desktop, stacked list + Sheet on mobile. Filters (q, channel, status, escalated-only) with debounce. Conversation list items show gradient-initials avatar, status dot, AI/Rule/Follow-up badges, timeAgo, message snippet. Detail pane shows contact header, channel/status/intent badges, postPermalink link, escalation banner with suggestedAction, scrollable thread of inbound (left, muted) + outbound (right, gradient) bubbles with timestamps + AI/Rule tags, composer textarea + Send / Resolve / Follow-up / Reopen actions. Cmd+Enter to send.
- `src/components/views/leads-view.tsx` — `LeadsView()` — CRM with status chips (counts clickable to filter), search, status select, Export CSV (window.open `/api/leads/export`), Add lead button. Desktop: shadcn Table with Contact/Status/Tags/Source/Notes/Added/Actions columns. Mobile: card list. Edit dialog (status, tags, notes), Add dialog (contactIgId required + username + status + source + tags + notes), Delete AlertDialog confirmation. Uses LEAD_STATUSES colors.
- `src/components/views/billing-view.tsx` — `BillingView()` — demo-mode info Alert, current-plan card (plan, status, seats, currentPeriodEnd, cancelAtPeriodEnd badge, AI replies progress bar from /api/dashboard/stats, upgrade suggestion when on free & ≥80% used). Plan comparison: 3 cards (Starter/Growth/Scale) with icon, price, tagline, features (Check icons), limits box, "Most popular" badge + ig-gradient-soft + ring on pro. Switch button → POST /api/billing. Cancel link at bottom → DELETE /api/billing.
- `src/components/views/settings-view.tsx` — `SettingsView()` — Tabs (Instagram / Business / Simulator / Account). Instagram tab: account rows with status badges, follower count, connected since, token expiry, active rules count, Connect + Disconnect buttons; required-permissions card listing the 4 Meta scopes; demo-mode info Alert. Business tab: tenant profile card (name, plan, status, created, seats, renews) + team members card. Simulator tab: channel select, from-username input, message input, example chips, Send button → POST /api/instagram/simulate then toast with "Open Inbox" action; plus stats summary card. Account tab: danger-zone card with signOut confirmation AlertDialog. If no accounts exist, onboarding CTA is shown instead of tabs.

## Conventions followed
- `"use client"` at top of every file; named export, no props.
- No `any` — DTOs from `@/types`; extended the conversation detail type locally to include optional `matchedRule`/`instagramAccount` joins (structurally compatible with `ConversationDto`).
- shadcn/ui components throughout; lucide-react icons; sonner toasts.
- Instagram rose/fuchsia theme: gradient avatars, `ig-gradient` buttons, `ig-gradient-soft` for hero panels.
- Mobile-first responsive: inbox stacks via Sheet, leads table → cards on mobile, billing grids collapse, settings tabs fit 4-up.
- Long lists: `overflow-y-auto scrollbar-thin` with constrained heights (`h-[calc(100vh-12rem)]` for inbox, `max-h` for others).
- `next-auth/react`'s `signOut` imported only in SettingsView (per the rule). No useSession in any of the 4 files.
- No footer added (shell owns it).
- ESLint: clean on all 4 files (verified with `bunx eslint <files>`). The remaining lint errors in the repo are in `ai-config-view.tsx`, `rules-view.tsx`, and `theme-toggle.tsx` — those belong to other agents.
