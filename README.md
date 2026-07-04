# ReplyPilot — Instagram Automation SaaS

ReplyPilot is a full-stack, **multi-tenant SaaS platform for Instagram automation**. Each customer ("tenant") connects their own Instagram Business/Creator account, then configures automation rules through a dashboard. The backend receives Instagram webhooks (DMs, comments, story replies) and responds via keyword-matching rules **or** an optional AI-powered response layer trained on the tenant's business context.

Built for small-to-medium businesses — online shops, service providers, educators, and influencers — who want to automate replies to Instagram DMs, comments, and story replies.

---

## ✨ Features

- **Multi-tenant** — every query is scoped by `tenantId`; full data isolation.
- **Instagram OAuth** — connect a Business/Creator account via official Meta OAuth (simulated in demo mode; real code path ready for production).
- **Webhook ingestion** — `GET` verification (hub.challenge) + `POST` events with `X-Hub-Signature-256` verification, acked within seconds, processed asynchronously.
- **Background worker** — in-memory queue (BullMQ/Redis replaced for this environment) drains webhook events with bounded concurrency and crash recovery.
- **Automation Rule Builder** — trigger types (`keyword`, `any_dm`, `any_comment`, `story_reply`), response types (`static_text`, `static_media`, `ai_generated`), **drag-to-reorder priority**, and a live rule tester.
- **AI Assistant** — a structured "Business Context" form (name, tone, products, services, FAQs, pricing, working hours, special rules) that is injected into a fixed Core system prompt. **Tenants never edit the raw prompt** — by design, for safety and consistency. The AI returns structured JSON `{ reply, intent, escalate, suggestedAction }`; malformed JSON falls back gracefully and never fails silently.
- **Conversation Inbox** — live view of recent DMs/comments/story replies with thread history, AI/rule badges, escalation flags, suggested actions, manual reply, and resolve/follow-up controls.
- **Leads CRM** — captured leads (from escalations + pricing/order intents) with tags, statuses, notes, CSV export.
- **Analytics** — response volume over time, AI-vs-rule split, channel breakdown, top intents, top trigger rules, escalation rate.
- **Billing** — plan management (Starter/Growth/Scale) stubbed for MVP; swap in Stripe or a local gateway.
- **Encrypted tokens** — Instagram access tokens are AES-256-GCM encrypted at rest; never stored in plaintext.
- **Token refresh** — a scheduled job refreshes long-lived tokens (~60-day lifetime) before expiry.
- **Dark mode** + fully responsive design.

---

## 🧱 Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) + TypeScript | Single deployable |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) | Instagram-inspired rose/fuchsia theme |
| Database | Prisma ORM + **SQLite** | PostgreSQL in production (schema is portable — change the `datasource` provider + `DATABASE_URL`) |
| Queue | **In-memory job queue** | Replaces BullMQ+Redis for this environment; crash-recovery via `WebhookEvent` rows. Swap in BullMQ+Redis for horizontal scale. |
| Auth | NextAuth.js v4 (credentials + JWT) | Email/password + one-click demo. Add Google via NextAuth's GoogleProvider. |
| AI | `z-ai-web-dev-sdk` (GLM, OpenAI-compatible) | Backend-only; configurable via env to point to other providers |
| Charts | Recharts | |
| Drag-reorder | @dnd-kit | For rule priority |

### Adaptations from the original spec
- **PostgreSQL → SQLite**: the Prisma schema uses no PG-specific features (lists are comma/JSON strings), so switching to Postgres is a one-line `provider` change + `DATABASE_URL`.
- **BullMQ+Redis → in-memory queue**: same semantics (enqueue, bounded concurrency, ack-then-process, crash recovery). The `WebhookEvent` table persists unprocessed events so nothing is lost on restart.
- **Single route**: the dashboard is a single-page app with client-side view switching (zustand), per the environment constraint. All API routes live under `/api/*`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ / Bun
- A Meta Developer account (for real Instagram integration — optional; the app runs in **demo mode** without one)

### Install & run
```bash
bun install
cp .env.example .env   # then fill in secrets (see below)
bun run db:push        # create SQLite schema
bun run db:generate
bun scripts/seed.ts    # seed demo tenant + data
bun run dev            # http://localhost:3000
```

### Demo login
- **Email:** `demo@replypilot.app`
- **Password:** `demo1234`
- Or click **"Explore the live demo"** on the login screen.

The seed creates a demo tenant ("Glow Skin Studio", a skincare business) with 1 Instagram account, a full AI business-context config, 6 automation rules, 22 conversations across 30 days, and 10 leads.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Prisma datasource URL (SQLite: `file:./db/custom.db`) |
| `NEXTAUTH_SECRET` | yes | NextAuth JWT secret (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | yes | App base URL (`http://localhost:3000`) |
| `ENCRYPTION_KEY` | yes | 32-byte hex key for AES-256 token encryption (`openssl rand -hex 32`) |
| `INSTAGRAM_APP_ID` | demo optional | Meta App ID. **When empty, the app runs in demo mode.** |
| `INSTAGRAM_APP_SECRET` | demo optional | Meta App secret (for webhook signature verification) |
| `INSTAGRAM_VERIFY_TOKEN` | demo optional | Arbitrary string you set in the Meta webhook config |
| `INSTAGRAM_GRAPH_API_VERSION` | optional | Defaults to `v21.0` |
| `AI_ENABLED` | optional | `true`/`false`. Defaults to `true`. |
| `DEMO_MODE` | optional | Force demo mode. Auto-enabled when `INSTAGRAM_APP_ID` is empty. |

---

## 📸 Meta App Setup (going live with real Instagram)

> The app works end-to-end in **demo mode** without any of this. Follow these steps to connect real Instagram accounts.

### 1. Create a Meta App
1. Go to <https://developers.facebook.com/apps> → **Create App**.
2. Choose **Business** as the app type.
3. Give it a name (e.g. "ReplyPilot") and contact email.

### 2. Add the Instagram product
1. In your App Dashboard → **Add Product** → find **Instagram** → **Set Up**.
2. This enables the Instagram Graph API for your app.

### 3. Configure Instagram Business Login (OAuth)
1. **App Dashboard → Instagram → Basic Display** (or **Instagram Login with Facebook Login** for Business).
2. Add the **Instagram Business Login** product/permission set.
3. Required permissions (these must be requested and may require App Review for public use):
   - `instagram_business_basic`
   - `instagram_business_manage_messages`
   - `instagram_business_manage_comments`
   - `instagram_business_content_publish` *(only if you later publish story/post replies)*
4. Set the **Valid OAuth Redirect URIs** to:
   ```
   https://YOUR_DOMAIN/api/instagram/oauth/callback
   ```
   (In dev: `http://localhost:3000/api/instagram/oauth/callback`.)

### 4. Configure the webhook
1. **App Dashboard → Instagram → Webhooks**.
2. **Subscribe to objects**: `messages`, `comments`, `mentions` (and `story_insights` if you handle story replies).
3. **Callback URL**: `https://YOUR_DOMAIN/api/instagram/webhook`
4. **Verify Token**: the exact value of your `INSTAGRAM_VERIFY_TOKEN` env var.
5. Click **Verify and Save** — Meta sends a `GET` with `hub.challenge`; ReplyPilot verifies the token and echoes it back.
6. Subscribe the connected Instagram account to the webhook fields.

### 5. Get your App credentials
- **App ID** → `INSTAGRAM_APP_ID`
- **App Secret** → `INSTAGRAM_APP_SECRET`
- Put both in `.env` and restart. The app now runs in **production mode** (signature verification enforced, real OAuth, real DM/comment sends).

### 6. App Review (for public/production use)
- While your app is in **Development mode**, only accounts listed as App Roles (testers/admins) can be connected and receive webhooks.
- To let **any** Instagram Business/Creator account connect, submit the app for **App Review** with the permissions above. Provide:
  - A screencast showing the OAuth flow and how each permission is used.
  - A privacy policy URL.
  - Data deletion callback (for compliance).
- Review typically takes a few business days. See <https://developers.facebook.com/docs/app-review>.

### 7. Messaging windows & policies
- **DMs**: Instagram enforces a **24-hour standard messaging window**. ReplyPilot replies immediately on receipt, which is within the window. For exceptions (e.g. `HUMAN_AGENT` tag, up to 7 days), consult the [current Meta docs](https://developers.facebook.com/docs/messenger-platform/instagram/features/send-message) before enabling — policies change.
- **Comments**: replies use the Comments API; no messaging window applies.

---

## 🤖 The AI Response Layer

When a rule's `responseType` is `ai_generated` — or no rule matches and AI fallback is enabled — the background worker:

1. **Builds the system prompt** from two parts:
   - **(a) A fixed Core block** (tone rules, escalation rules, output format, safety constraints) — written once, reused across all tenants, never edited by tenants.
   - **(b) The tenant's Business Context form** serialized into the prompt (business name, tone, products, services, FAQs, pricing visibility, purchase link, working hours, special rules).
2. **Calls the LLM** (z-ai-web-dev-sdk / GLM) with the incoming message as user input, requesting strict JSON:
   ```json
   { "reply": "...", "intent": "...", "escalate": false, "suggestedAction": "..." }
   ```
3. **Parses robustly** — strips markdown code fences, extracts the first JSON object, validates shape, and falls back to a generic holding reply on malformed output.
4. **Escalation** — if `escalate: true`, the AI's reply (or a holding message) is still sent, **and** the conversation is flagged in the dashboard for human follow-up. Never fails silently.
5. **Sends the reply** back to Instagram via the Send API (DMs) or Comments API (comment replies).

> **Safety by design:** tenants configure a *structured* Business Context form — they never touch the raw system prompt. This keeps behavior consistent, on-brand, and prevents prompt injection / leakage.

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── api/                      # API routes (all tenant-scoped via session)
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── auth/register/        # Sign up (creates tenant + admin user)
│   │   ├── instagram/
│   │   │   ├── oauth/{start,callback}/  # OAuth flow (real + demo)
│   │   │   ├── webhook/          # GET verify + POST signature-checked ingest
│   │   │   ├── accounts/         # List/disconnect accounts
│   │   │   └── simulate/         # Demo: inject a simulated inbound
│   │   ├── dashboard/stats/      # Overview KPIs
│   │   ├── rules/                # CRUD + reorder + preview/tester
│   │   ├── conversations/        # List + detail + manual reply
│   │   ├── leads/                # CRUD + CSV export
│   │   ├── ai-config/[igAccountId]/
│   │   ├── analytics/
│   │   ├── billing/
│   │   └── tenant/
│   ├── layout.tsx                # Providers (Session, Theme, QueryClient)
│   ├── page.tsx                  # Root: session gate → AppShell | Login
│   └── globals.css               # Rose/fuchsia theme + utilities
├── components/
│   ├── ui/                       # shadcn/ui (pre-installed)
│   ├── app-shell.tsx             # Session gate + view router + sticky footer
│   ├── app-sidebar.tsx           # Responsive nav
│   ├── app-topbar.tsx            # Account selector + theme + user menu
│   ├── login-screen.tsx          # Split-screen auth + demo login
│   ├── providers.tsx
│   ├── theme-toggle.tsx
│   └── views/                    # The 8 dashboard views
│       ├── dashboard-view.tsx
│       ├── inbox-view.tsx
│       ├── rules-view.tsx
│       ├── ai-config-view.tsx
│       ├── leads-view.tsx
│       ├── analytics-view.tsx
│       ├── billing-view.tsx
│       └── settings-view.tsx
├── lib/
│   ├── db.ts                     # Prisma client
│   ├── env.ts                    # Centralized env + demo-mode detection
│   ├── crypto.ts                 # AES-256-GCM encrypt/decrypt, scrypt hashing, HMAC verify
│   ├── instagram.ts              # OAuth, token exchange, send DM/reply, token refresh
│   ├── ai.ts                     # CORE prompt + business-context serialization + LLM call
│   ├── rule-engine.ts            # Keyword/any_dm/any_comment/story_reply matching
│   ├── worker.ts                 # Webhook payload parsing + per-event processing + leads
│   ├── queue.ts                  # In-memory queue (BullMQ replacement) + crash recovery
│   ├── auth.ts                   # NextAuth config (credentials + JWT)
│   ├── session.ts                # getTenantContext / requireTenant helpers
│   ├── constants.ts              # Enums, labels, plans
│   ├── format.ts                 # Date/number/tag helpers
│   ├── api-client.ts             # Frontend fetch wrapper
│   └── store.ts                  # zustand (active view + selected account)
├── hooks/use-api.ts              # react-query hooks
├── types/                        # Shared DTOs + NextAuth augmentation
└── instrumentation.ts            # Boots the queue worker on server start

prisma/schema.prisma              # Tenant, User, InstagramAccount, AiConfig,
                                 # AutomationRule, ConversationLog, Lead,
                                 # Subscription, WebhookEvent
scripts/seed.ts                   # Demo data
```

---

## 🧪 Testing notes
The most failure-prone parts — **webhook signature verification** (`src/lib/crypto.ts → verifyHubSignature`) and **rule matching** (`src/lib/rule-engine.ts → matchRule`) — are isolated as pure functions so they can be unit-tested directly. In demo mode, signature verification is skipped so simulated events can exercise the full pipeline end-to-end (use the **"Try it live"** widget on the dashboard or the **Simulator** tab in Settings).

---

## 📄 License
MIT — build on top of it, swap in your own billing/AI provider, ship it.
