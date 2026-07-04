---
Task ID: 1
Agent: main (orchestrator)
Task: Build foundation — Prisma schema, env, core lib (crypto, instagram, ai, queue, worker, auth, session), shared types, seed data

Work Log:
- Authored prisma/schema.prisma (Tenant, User, InstagramAccount, AiConfig, AutomationRule, ConversationLog, Lead, Subscription, WebhookEvent) adapted for SQLite (lists as strings/JSON)
- Generated secrets (ENCRYPTION_KEY, NEXTAUTH_SECRET, IG verify token) and wrote .env
- Ran `bun run db:push` + `bun run db:generate` (DB in sync)
- Created src/lib/env.ts, crypto.ts (AES-256-GCM encrypt/decrypt, scrypt password hashing, HMAC hub-signature verify), constants.ts (enums/labels/plans), instagram.ts (OAuth URL, token exchange, profile, send DM, reply comment, token refresh), ai.ts (CORE prompt + business-context serialization + robust JSON extraction + fallback + z-ai-web-dev-sdk integration), rule-engine.ts (keyword/any_dm/any_comment/story_reply matching with any/all modes), worker.ts (webhook payload parsing + per-event processing + lead capture + simulateInbound for demo), queue.ts (in-memory queue replacing BullMQ+Redis with crash recovery), auth.ts (NextAuth credentials + JWT), session.ts (tenant context helper), api-client.ts, format.ts
- Created src/types/index.ts (DTOs) and src/types/next-auth.d.ts (session augmentation)
- Created scripts/seed.ts and ran it: demo tenant "Glow Skin Studio" (pro plan), user demo@replypilot.app/demo1234, 1 IG account, AI config with full business context, 6 automation rules with priorities, 22 conversation logs across 30 days, 10 leads

Stage Summary:
- Product name: ReplyPilot
- Theme: Instagram-inspired rose/fuchsia palette (no blue/indigo)
- Demo mode auto-enabled when INSTAGRAM_APP_ID is empty; OAuth callback simulates connection, DM/comment sends are no-ops, but full real Meta code paths exist for production
- Auth: NextAuth credentials + JWT, demo bypass button, single demo tenant seeded
- All subsequent API routes will scope by tenantId from session
- AI uses z-ai-web-dev-sdk (server-side only); system prompt = fixed CORE block + tenant Business Context form (never raw prompt editing)

---
Task ID: 3
Agent: main (orchestrator)
Task: Frontend shell — providers, theme, sidebar, topbar, login, view router, root page

Work Log:
- Customized globals.css with Instagram-inspired rose/fuchsia oklch palette (light + dark), added ig-gradient / ig-gradient-text / ig-gradient-soft / scrollbar-thin utilities
- Created src/components/providers.tsx (SessionProvider + next-themes ThemeProvider + react-query QueryClientProvider + sonner Toaster)
- Created src/lib/store.ts (zustand: view, selectedAccountId, sidebarOpen)
- Created src/hooks/use-api.ts (useApi GET helper + useApiMutation wrapping react-query, invalidates keys)
- Created src/components/theme-toggle.tsx, src/components/login-screen.tsx (split-screen brand panel + auth form with login/register toggle + one-click demo login)
- Created src/components/app-sidebar.tsx (responsive sidebar w/ Sheet overlay on mobile, nav groups, upgrade card) and src/components/app-topbar.tsx (account selector dropdown, theme toggle, user menu w/ sign out, "New rule" button)
- Created src/components/app-shell.tsx (session gate: loading → spinner, unauthenticated → LoginScreen, authenticated → sidebar+topbar+active view; sticky footer; auto-selects first IG account) and src/app/page.tsx (Suspense-wrapped AppShell)
- Fixed instrumentation.ts to dynamically import startQueue inside the nodejs guard so the Edge runtime no longer bundles node:crypto (eliminated "Ecmascript file had an error" warnings)
- Quieted Prisma query logging (error+warn only)
- Verified: dev server boots, queue poller starts, GET / returns 200, no edge warnings

Stage Summary:
- The dashboard shell is live and client-routes between 8 views via zustand `view` state
- 8 stub view files exist at src/components/views/*-view.tsx (named exports XxxView, no props) — to be replaced with real implementations by Task 4 subagents
- selectedAccountId is shared via useAppStore; views must read it and only fetch when set
- API contract is fully implemented under /api/* (see Task 2); all routes are tenant-scoped via session

---
Task ID: 4-a
Agent: full-stack-developer
Task: Build DashboardView and AnalyticsView

Work Log:
- Read /home/z/my-project/worklog.md to understand foundation (Task 1) + frontend shell (Task 3); inspected store, types, use-api, format, constants, api-client, app-shell, app-topbar, app-sidebar, globals.css, and the dashboard/analytics/simulate/conversations API routes to confirm contracts.
- Authored src/components/views/dashboard-view.tsx ("use client", no props):
  * NoAccountEmptyState — friendly card with ig-gradient header, value-prop checklist, "Connect Instagram" button that GETs /api/instagram/oauth/start and redirects window.location.href.
  * KPI grid (2 cols mobile → 4 cols lg): Accounts, Active rules, Convos today, Convos 30d, AI replies 30d, Needs follow-up, New leads, AI usage — each with lucide icon, accent color bar, compactNumber formatting, plan-name hint.
  * AiUsageCard — Progress bar (healthy gradient / amber when near limit), used/limit with ∞ for unlimited plans.
  * AccountHealthCard — per-account rows with status dot (emerald/amber/gray), @username, "expires in Nd" / "expired" / "no expiry", "Renewing soon" badge when ≤7 days.
  * RecentConversationsCard — top-5 list from /api/conversations?limit=5 with avatar/initials, channel icon (MessageCircle/MessageSquare/Sparkles), inbound snippet, AI-vs-rule badge, escalated flag, timeAgo; "View all" → setView("inbox").
  * SimulateInboundCard (wow-factor) — ig-gradient header "Try it live 🎬", channel Select (dm/comment/story), message Input with 5 example chips (incl. Persian FAQ), "Send & watch" button. POSTs /api/instagram/simulate, then polls /api/conversations?limit=1 after 1.5s to render an inline inbound→outbound ConversationBubble with AI/rule badge. Toast on success/error; Enter to submit; cleanup of timer on unmount.
  * QuickActions — 4 navigation buttons (New rule, Configure AI, View leads, Analytics).
  * Skeletons while loading; aria-labels on sections; fully responsive grid layouts.
- Authored src/components/views/analytics-view.tsx ("use client", no props):
  * NoAccountEmptyState (same connect-account flow).
  * Date-range Tabs (7 / 30 / 90 days) — drives /api/analytics?days=N via useApi key+url.
  * KPI row (5 cards): Total conversations, AI replies, Rule-based replies, Escalation rate (%), Failed.
  * VolumeAreaChart — recharts AreaChart, total area with brand chart-1 gradient fill + AI overlay line, X axis "MMM d" via date-fns, formatted tooltip, ~300px ResponsiveContainer.
  * AiVsRuleDonut — recharts PieChart donut with center total label, chart-1 (AI) + chart-3 (rule) colors, legend below.
  * ChannelBreakdown — proportional bars per CHANNELS constant with % of total.
  * TopIntents BarList — horizontal bars with capitalized intent labels, scrollable.
  * Top trigger rules BarList — topKeywords (matched rule names) with counts.
  * EscalationRate highlight card — big % number, colored amber (>20%) / emerald (<10%) / primary, context-aware copy + badge.
  * Empty state when totalConversations === 0 ("No conversations in this period yet"). Retry card on error.
- Verified: `npx eslint` on both files → 0 errors. Full `bun run lint` shows only 4 pre-existing errors in rules-view.tsx (another agent's file, not in scope). Dev server compiles successfully (GET / → 200, no errors in dev.log).
- Both views read selectedAccountId from useAppStore and only fetch when set; all hooks called unconditionally before the early-return empty state (no conditional hook calls).

Stage Summary:
- src/components/views/dashboard-view.tsx — production-ready dashboard (KPIs, AI usage, account health, recent convos, live simulate widget, quick actions).
- src/components/views/analytics-view.tsx — production-ready analytics (KPI row, area + donut charts, channel breakdown, top intents, top rules, escalation highlight) with 7/30/90-day range selector.
- Both are client components, no props, fully responsive, accessible, use the rose/fuchsia IG palette via ig-gradient utilities and recharts for charts. No new dependencies required. No footer added (shell handles it). No NextAuth/useSession imported.

---
Task ID: 4-c
Agent: full-stack-developer
Task: Build InboxView, LeadsView, BillingView, SettingsView

Work Log:
- Read worklog to understand foundation (Task 1) + shell (Task 3): zustand view store, useAppStore, useApi/useApiMutation hooks, API contract under /api/*, DTOs in @/types, Instagram rose/fuchsia theme utilities (ig-gradient, ig-gradient-soft, scrollbar-thin).
- Inspected API routes (conversations list+detail+PATCH, leads CRUD+export, billing GET/POST/DELETE, tenant, instagram accounts/simulate/oauth-start, dashboard stats) to lock down request/response shapes.
- Wrote src/components/views/inbox-view.tsx: two-pane messaging inbox — list (filters: q/channel/status/escalated toggle, gradient-avatars, AI/Rule/Follow-up badges, status dots, timeAgo) + detail (channel/status/intent badges, escalation banner with suggestedAction, scrollable thread of inbound-left + outbound-right gradient bubbles, AI/Rule tags, composer + Send/Resolve/Follow-up/Reopen actions). Desktop: side-by-side; mobile: list + Sheet for detail. Cmd+Enter to send.
- Wrote src/components/views/leads-view.tsx: status-chip summary (clickable filters), search + status select + Export CSV + Add lead. Desktop shadcn Table (Contact/Status/Tags/Source/Notes/Added/Actions). Mobile card list. Add dialog (contactIgId required) + Edit dialog (status/tags/notes) + delete AlertDialog. Uses LEAD_STATUSES colors.
- Wrote src/components/views/billing-view.tsx: demo-mode info Alert, current-plan card with AI usage Progress bar (from /api/dashboard/stats), 3-card plan comparison with Growth highlighted (ig-gradient-soft + ring + "Most popular" badge), Switch button → POST /api/billing, cancel link → DELETE /api/billing.
- Wrote src/components/views/settings-view.tsx: 4 Tabs (Instagram / Business / Simulator / Account). IG tab: account rows + required-scopes card + demo Alert + Connect/Disconnect. Business tab: tenant profile + team members. Simulator tab: channel/from/message inputs + example chips + send button → toast with "Open Inbox" action that setView("inbox"). Account tab: danger-zone AlertDialog → signOut + reload. No-account onboarding CTA replaces tabs.
- All four files pass `bunx eslint` with zero errors. Remaining repo lint errors (ai-config-view, rules-view, theme-toggle) belong to other agents — left untouched.
- Dev server log shows healthy compiles; home page returns 200.

Stage Summary:
- Four production-ready client views shipped, fully responsive, accessible (aria-labels on icon buttons, semantic structure), Instagram-themed (gradient avatars/buttons/panels, rose/fuchsia palette, no blue/indigo).
- Inbox is the highlight — feels like a real messaging app with two-pane desktop layout, mobile Sheet, status dots, AI/Rule badges, escalation banner with suggested action, composer with Cmd+Enter, Resolve/Follow-up/Reopen quick actions, and a thread that auto-scrolls to bottom.
- All views share the connect-Instagram CTA pattern when selectedAccountId is null and use the typed api-client + react-query hooks for fetching/mutation/invalidation.
- Files: src/components/views/{inbox,leads,billing,settings}-view.tsx (≈720 / 540 / 330 / 580 lines respectively).

---
Task ID: 4-b
Agent: full-stack-developer
Task: Build RulesView (drag-reorder automation rules) and AiConfigView (Business Context form)

Work Log:
- Read worklog.md (Tasks 1 + 3) and inspected shared libs/types: AutomationRuleDto/AiConfigDto, useApi/useApiMutation, constants (TRIGGER_TYPES, RESPONSE_TYPES, TONES, CHANNELS, labelFor), splitTags, useAppStore, api client, cn.
- Verified @dnd-kit/core@6.3.1 + @dnd-kit/sortable@10.0.0 exports (DndContext, PointerSensor, KeyboardSensor, SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates, CSS.Transform).
- Confirmed API contract by reading /api/rules, /api/rules/[id], /api/rules/reorder, /api/rules/preview, /api/ai-config/[igAccountId] routes.

RulesView (src/components/views/rules-view.tsx):
- "use client"; reads selectedAccountId from useAppStore; shows connect-Instagram empty CTA (GET /api/instagram/oauth/start → window.location.href) when null; wraps content in p-4 md:p-6 space-y-6; no footer.
- Header "Automation Rules" + subtitle + ig-gradient "New rule" button.
- Drag-reorderable list via DndContext + SortableContext (verticalListSortingStrategy) + useSortable. SortableRuleCard: GripVertical drag handle (cursor-grab, touch-none, listeners on handle only), priority badge (1 = ig-gradient), name + Paused badge + trigger description, trigger chip + keyword Badges (splitTags) + match-mode hint + ResponseChip, active Switch (optimistic via queryClient.setQueryData + PUT isActive, rollback on error), Edit + Delete (AlertDialog confirm). Inactive cards opacity-60; dragging lifts with ring-2.
- ResponseChip variants: static_text (gray, MessageSquare), static_media (violet, Image), ai_generated (ig-gradient, Sparkles).
- On drag end: optimistic arrayMove via setQueryData, POST /api/rules/reorder with orderedIds top→bottom, toast "Priority updated"; rollback via invalidate on error.
- New/Edit Dialog: form state in RuleFormBody child keyed by editing?.id ?? "new" (remounts fresh each open — no effect). Fields: name (required), triggerType Select (with description), conditional keyword Input + match-mode RadioGroup (ANY/ALL), responseType Select with conditional staticResponse/mediaUrl/aiPromptOverride fields, isActive Switch. Inline validation. Save → POST/PUT, toast, invalidate rules query.
- Rule tester: Collapsible Card. Input + channel Select + Test button → POST /api/rules/preview. Sample chips. Result: matched rule (name + keyword badges + response chip) OR AI-fallback notice; AI reply in chat bubbles (customer right / AI left ig-gradient) with intent + escalate/auto-reply + suggestedAction badges.
- Loading: RulesSkeleton. Error: destructive Alert + retry. Empty: friendly CTA.

AiConfigView (src/components/views/ai-config-view.tsx):
- "use client"; same connect-account empty-state pattern.
- Header "AI Assistant" + subtitle + info Alert explaining ReplyPilot builds the safe system prompt from this form; raw prompt not editable by design.
- AiConfigViewContent loads config via useApi(["ai-config", id], "/api/ai-config/" + id); renders AiConfigWorkspace keyed by config?.updatedAt ?? "empty" (remounts when server record changes — no effect, no ref).
- AiConfigWorkspace holds {form, snapshot} in one useState (both seeded from config at mount); isDirty = serialize(form) !== snapshot. Grid lg:grid-cols-[1fr_380px] with sticky preview. Cards (icon headers):
  - Basics: businessName + tone (2-col) + description Textarea.
  - Products & Services: products + services Textareas (one-per-line, "Name (price)" hint).
  - FAQs: dynamic list parsed from faqs JSON → [{q,a}]; q/a Inputs + remove; Add FAQ; stringified on save; long list scrolls max-h-72 scrollbar-thin.
  - Pricing & Checkout: pricingVisible Switch (gates pricingNote) + purchaseLink.
  - Availability: workingHours Input.
  - Special rules: specialRules Textarea + aiFallbackEnabled Switch.
- Save bar: floating pill (fixed bottom-center mobile / bottom-right desktop) appears only when isDirty; Discard (revert to snapshot) + Save changes (PUT, marks snapshot clean instantly, toasts "AI assistant updated").
- Live preview (right column): Card with 3 sample chips + Input + Send → POST /api/rules/preview (channel dm); customer bubble (right) + AI bubble (left ig-gradient) + intent/escalate/suggestedAction badges; reads live aiFallbackEnabled.
- Loading: AiConfigSkeleton. Error: destructive Alert + retry.

Quality: fully responsive (mobile-first), accessible (labels, aria-labels on icon buttons, sr-only labels, keyboard sensors for dnd, focus rings via shadcn), consistent spacing (cards p-4/p-6 via CardHeader/CardContent, gap-4/gap-6), long lists max-h with scrollbar-thin, no `any` (DTOs from @/types), no footer, no useSession. Replaced lint-flagged patterns (setState-in-effect, ref-during-render) with key-remount + derived-state patterns.

Stage Summary:
- src/components/views/rules-view.tsx — production RulesView: drag-reorder (dnd-kit + optimistic cache writes), create/edit dialog (keyed remount, validated), active toggle, delete w/ confirm, rule tester with chat-bubble AI preview.
- src/components/views/ai-config-view.tsx — production AiConfigView: business-context form (6 grouped cards incl. dynamic FAQs), dirty-tracked floating save bar, live chat preview with sample chips, no-raw-prompt info alert.
- Both are client components, no props, read selectedAccountId from useAppStore, connect-Instagram CTA when null, Instagram rose/fuchsia theme via ig-gradient utilities.
- `bun run lint`: only remaining error is pre-existing in src/components/theme-toggle.tsx (Task 3, out of scope). Both new view files are lint-clean.

---
Task ID: 5
Agent: main (orchestrator)
Task: Integrate, lint, verify end-to-end with Agent Browser, write README

Work Log:
- Ran full `bun run lint` — fixed the one remaining error (theme-toggle setState-in-effect) by switching to a CSS-only icon swap (`dark:hidden` / `hidden dark:block`) using next-themes setTheme(fn) updater. Lint now passes with 0 errors/warnings.
- Restarted dev server cleanly (no edge-runtime warnings, queue poller boots via instrumentation dynamic import).
- End-to-end verification with Agent Browser:
  - Login screen renders (brand panel + auth form + demo button) → clicked "Explore the live demo" → authenticated as demo tenant (Glow Skin Studio), toast confirmed.
  - Dashboard: 8 KPI cards, AI usage progress, account health, recent conversations, quick actions, and the "Try it live 🎬" simulate widget.
  - WOW-FACTOR TEST: sent a simulated inbound DM "سلام، قیمت سرم ویتامین سی چنده؟" (Persian: "how much is the vitamin C serum?") → worker processed it → matched the "Pricing question → AI" keyword rule → AI replied in PERSIAN: "سلام! سرم ویتامین سی ما 950 هزار تومان هست. برای اطلاعات بیشتر یا خرید میتونید به لینک خرید در بیو مراجعه کنید." — pulling the exact price (950K Toman) and purchase-link guidance from the seeded Business Context. Full pipeline (webhook queue → rule engine → AI → conversation log) verified end-to-end. dev.log: "[worker] processed webhook → convo (ai=true, escalated=false)".
  - Inbox: two-pane messaging UI, filters (search/channel/status/needs-follow-up), conversation list with AI/Follow-up badges, detail pane with thread bubbles, intent, escalation banner + suggested action, manual reply composer, Resolve/Follow-up/Reopen actions.
  - Automation Rules: drag-reorderable cards (dnd-kit) with priority badges, keyword chips, response-type chips, active toggles, edit/delete, and a rule tester that previews matched rule + AI reply.
  - AI Assistant: structured Business Context form (business name, tone, description, products, services, dynamic FAQs, pricing/checkout, working hours, special rules, AI fallback) with the "you cannot edit the raw prompt, by design" safety note + live AI preview.
  - Leads: status chips with counts (New 4 / Contacted 2 / Qualified 3 / Won 1 / Lost 1), search, Export CSV, Add lead, table with edit/delete.
  - Analytics: 7/30/90-day tabs, KPI summary, response-volume area chart (recharts), AI-vs-rule donut, channel breakdown, top intents, top trigger rules, escalation-rate highlight.
  - Billing: current plan (Growth $29/mo) with AI-usage progress, 3-card plan comparison (Growth highlighted), demo-mode payment note, switch/cancel.
  - Settings: Instagram connection tab (account rows + Connect/Disconnect + required-scopes info + demo alert), Business tab (tenant + team), Simulator tab (test inbound + open Inbox), Account tab (sign-out danger zone).
  - Dark mode: toggled ON (html class → "dark"), toggled back to light. Mobile viewport (390x844): hamburger menu present, responsive layouts hold.
  - Sticky footer: present, pushed down naturally on long pages (body 1277px > viewport 844px), sticks on short pages.
- Checked dev.log: zero runtime errors (no ⨯/TypeError/unhandled). Browser console: zero errors.
- Wrote README.md with: product overview, tech stack + adaptations (SQLite/in-memory queue), getting started, env vars, full Meta App setup (create app, add Instagram product, OAuth redirect URIs, required permissions, webhook config + verify token, App Review process, messaging windows), AI layer explanation, project structure, testing notes.

Stage Summary:
- ALL 8 dashboard views verified interactive in the browser with real backend data.
- The AI automation pipeline works end-to-end in demo mode (simulated inbound → rule match → contextual AI reply in the customer's language using the tenant's business context → conversation log + lead capture).
- Lint: 0 errors. Dev server: HTTP 200, no errors. Responsive + dark mode + sticky footer all verified.
- Deliverable complete: project scaffold + Prisma schema + webhook route with signature verification + background worker + OAuth flow + all dashboard pages + README with Meta App setup.
