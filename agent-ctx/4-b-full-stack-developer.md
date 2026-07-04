# Task 4-b — full-stack-developer

## Task
Build RulesView (drag-reorder automation rules) and AiConfigView (Business Context form) for ReplyPilot.

## Work Log
- Read worklog.md (Tasks 1 + 3) and inspected existing libs: `@/types` (DTOs), `@/hooks/use-api` (useApi + useApiMutation), `@/lib/constants` (TRIGGER_TYPES, RESPONSE_TYPES, TONES, CHANNELS, labelFor), `@/lib/format` (splitTags), `@/lib/store` (useAppStore → selectedAccountId), `@/lib/api-client` (api + ApiError), `@/lib/utils` (cn).
- Verified `@dnd-kit/core@6.3.1` + `@dnd-kit/sortable@10.0.0` exports (DndContext, PointerSensor, KeyboardSensor, useSensor/useSensors, closestCenter, SortableContext, useSortable, arrayMove, verticalListSortingStrategy, sortableKeyboardCoordinates, CSS.Transform).
- Confirmed API contract by reading `app/api/rules/route.ts`, `app/api/rules/[id]/route.ts`, `app/api/rules/reorder/route.ts`, `app/api/rules/preview/route.ts`, `app/api/ai-config/[igAccountId]/route.ts`.

## rules-view.tsx
- `export function RulesView()` — client component; reads `selectedAccountId` from `useAppStore`. If null → `ConnectAccountEmptyState` (button GETs `/api/instagram/oauth/start`, `window.location.href = url`). Otherwise renders `RulesViewContent` keyed by `igAccountId`.
- Header "Automation Rules" + subtitle "Drag to reorder priority. Higher rules win." + "New rule" button (ig-gradient).
- **Drag-reorderable list**: `DndContext` + `SortableContext` (verticalListSortingStrategy) + `useSortable` per card. Drag handle = GripVertical with `listeners`/`attributes` + `touch-none` + cursor-grab. Optimistic reorder via `queryClient.setQueryData` on the `["rules", igAccountId]` cache; on drag end POSTs `/api/rules/reorder` with `orderedIds` (top→bottom); toasts "Priority updated" on success, refetch on error.
- **SortableRuleCard**: drag handle | priority badge (1 = ig-gradient, others secondary) | name + Paused badge + trigger description | trigger chip (labelFor) + keyword Badges (splitTags) + match-mode hint + ResponseChip | Switch (optimistic toggle via setQueryData → PUT isActive, rollback on error) | Edit (pencil) + Delete (trash, AlertDialog confirm). Inactive cards dimmed `opacity-60`. Dragging card lifts with ring-2.
- **ResponseChip**: static_text (gray, MessageSquare), static_media (violet, Image), ai_generated (ig-gradient, Sparkles).
- **New/Edit dialog**: controlled Dialog; form state lives in `RuleFormBody` child keyed by `editing?.id ?? "new"` so it remounts with fresh initial state on each open (no effect needed). Fields: name (required), triggerType Select (with description helper), conditional keyword Input + matchMode RadioGroup (Match ANY / ALL), responseType Select with conditional fields (static_text→Textarea, static_media→URL Input, ai_generated→optional override Textarea), isActive Switch. Inline validation. Save → POST (new) or PUT (edit), toasts success, invalidates rules query.
- **Rule tester**: Collapsible Card (default open). Input + channel Select + Test button → POST `/api/rules/preview`. Sample chips. Result shows matched rule (name + matched keyword badges + response chip) OR "No rule matched — AI fallback", plus AI reply in a chat bubble (customer right / AI left, ig-gradient) with intent + escalate/auto-reply badges + suggestedAction.
- Loading: `RulesSkeleton`. Error: destructive Alert with retry. Empty: `EmptyRules` CTA.

## ai-config-view.tsx
- `export function AiConfigView()` — client component; same connect-account empty-state pattern.
- Header "AI Assistant" + subtitle + prominent info Alert (Info icon) explaining ReplyPilot builds the system prompt from the form; raw prompt not editable by design.
- `AiConfigViewContent` loads config via `useApi(["ai-config", igAccountId], "/api/ai-config/" + id)`. Renders `AiConfigWorkspace` keyed by `config?.updatedAt ?? "empty"` so the form reseeds cleanly whenever the server record changes (no effect / no ref).
- **AiConfigWorkspace** holds `{ form, snapshot }` in a single useState (both seeded from config at mount). `isDirty = serializeForm(form) !== snapshot`. Grid layout `lg:grid-cols-[1fr_380px]`, sticky preview on desktop. Cards (each with icon header):
  - **Basics**: businessName + tone (2-col) + description Textarea.
  - **Products & Services**: products + services Textareas (2-col), one-per-line with "Name (price)" hint.
  - **FAQs**: dynamic list parsed from `faqs` JSON string → `[{q,a}]`; each row = two Inputs + remove button; "Add FAQ" button; stringified back on save. Long list scrolls (`max-h-72 scrollbar-thin`).
  - **Pricing & Checkout**: pricingVisible Switch (gates pricingNote Input) + purchaseLink.
  - **Availability**: workingHours Input.
  - **Special rules**: specialRules Textarea + aiFallbackEnabled Switch.
- **Save bar**: floating pill (fixed bottom-center on mobile, bottom-right on desktop) appears only when `isDirty`. Discard (revert to snapshot) + Save changes (PUT, marks snapshot clean instantly + toasts "AI assistant updated").
- **Live preview** (right column): Card with 3 sample chips + Input + Send button → POST `/api/rules/preview` (channel dm). Renders customer bubble (right) + AI reply bubble (left, ig-gradient) with intent + escalate/auto-reply + suggestedAction badges. Reads live `aiFallbackEnabled` from form.
- Loading: `AiConfigSkeleton`. Error: destructive Alert with retry.

## Lint
- Initial lint surfaced: `AlertDialogTrigger` missing import (fixed), `react-hooks/set-state-in-effect` (sync setState in effect — refactored to key-remount pattern for dialog form + ai-config workspace), `react-hooks/refs` (ref.current during render — replaced ref-based snapshot with state).
- Final `bun run lint`: only remaining error is pre-existing in `src/components/theme-toggle.tsx` (Task 3 file, out of scope). Both view files are clean.

## Stage Summary
- `src/components/views/rules-view.tsx` — full RulesView: drag-reorder (dnd-kit + optimistic setQueryData), create/edit dialog (keyed remount, validated form), active toggle, delete with confirm, rule tester with chat-bubble AI preview.
- `src/components/views/ai-config-view.tsx` — full AiConfigView: business-context form (Basics / Products & Services / FAQs dynamic / Pricing / Availability / Special rules), dirty-tracked sticky save bar, live chat preview with sample chips, info alert explaining no-raw-prompt design.
- Both are client components taking no props, read `selectedAccountId` from `useAppStore`, show connect-Instagram CTA when null, wrap content in `p-4 md:p-6 space-y-6`, no footer, no `any` types, fully responsive, Instagram rose/fuchsia theme via ig-gradient utilities.
