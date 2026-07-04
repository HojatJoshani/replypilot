"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, GripVertical, Pencil, Trash2, Bot, Image as ImageIcon, MessageSquare,
  Sparkles, Send, AlertCircle, Zap, Wand2, ChevronDown, Inbox, X, Filter,
  PlayCircle, CheckCircle2, AlertTriangle, UserPlus, Clock, Type, Hand,
  DollarSign, Calendar, Package, Moon, LayoutGrid, ArrowLeft, Tag,
  MessageCircle, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { useAppStore } from "@/lib/store";
import {
  TRIGGER_TYPES, CONDITION_TYPES, CONDITION_OPERATORS,
  ACTION_TYPES, CHANNELS, CONTACT_TYPES, SCENARIO_TEMPLATES,
  TEMPLATE_CATEGORIES, labelFor,
} from "@/lib/constants";
import type { Condition, RuleAction } from "@/lib/rule-engine";
import { splitTags } from "@/lib/format";
import { t, toFa } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AutomationRuleDto } from "@/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTENT_LABELS: Record<string, string> = t.intents;
const intentLabel = (i: string) => INTENT_LABELS[i] ?? i;

/** AutomationRuleDto augmented with the new JSON fields (kept nullable for legacy rows). */
type RuleDto = AutomationRuleDto & { conditionsJson?: string | null; actionsJson?: string | null };

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseConditions(rule: RuleDto): Condition[] {
  return parseJsonArray<Condition>(rule.conditionsJson, []);
}

function parseActions(rule: RuleDto): RuleAction[] {
  const fromJson = parseJsonArray<RuleAction>(rule.actionsJson, []);
  if (fromJson.length > 0) return fromJson;
  // Backward compat: derive actions from legacy single-response fields.
  if (rule.responseType === "static_text" && rule.staticResponse)
    return [{ type: "reply_text", value: rule.staticResponse }];
  if (rule.responseType === "static_media" && rule.mediaUrl)
    return [{ type: "reply_media", value: rule.mediaUrl }];
  if (rule.responseType === "ai_generated")
    return [{ type: "ai_reply", value: rule.aiPromptOverride || "" }];
  return [];
}

const CONDITION_ICON: Record<string, LucideIcon> = {
  channel: MessageCircle, time_window: Clock, contact_type: UserPlus,
  message_contains: Type, message_length: Type,
};
const ACTION_ICON: Record<string, LucideIcon> = {
  reply_text: MessageSquare, reply_media: ImageIcon, ai_reply: Bot,
  tag_lead: Tag, escalate: AlertTriangle, resolve: CheckCircle2,
};
const TRIGGER_ICON: Record<string, LucideIcon> = {
  keyword: Type, any_dm: MessageCircle, any_comment: MessageSquare, story_reply: Sparkles,
};
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  Hand, DollarSign, Clock, Calendar, Package, AlertTriangle, Moon, Bot,
};
const ACTION_TONE: Record<string, string> = {
  reply_text: "bg-secondary text-secondary-foreground",
  reply_media: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-transparent",
  ai_reply: "ig-gradient text-white border-transparent",
  tag_lead: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-transparent",
  escalate: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent",
  resolve: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent",
};

/** Human-readable Persian summary of a condition. */
function conditionSummary(c: Condition): string {
  switch (c.type) {
    case "channel": return `${labelFor(CONDITION_TYPES, c.type)}: ${labelFor(CHANNELS, c.value)}`;
    case "time_window": return `ساعات ${toFa(c.value)}`;
    case "contact_type": return `${labelFor(CONDITION_TYPES, c.type)}: ${labelFor(CONTACT_TYPES, c.value)}`;
    case "message_contains": return `شامل «${c.value}»`;
    case "message_length":
      return `طول پیام ${c.operator === "lt" ? "کمتر از" : "بیشتر از"} ${toFa(c.value)}`;
    default: return `${c.type} ${c.operator} ${c.value}`;
  }
}

/** Shared amber-toned badges for a condition list (used in rule card + tester). */
function ConditionBadges({ items }: { items: Condition[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
        <Filter className="h-3 w-3" /> {t.rules.conditions}:
      </span>
      {items.map((c, i) => {
        const Ic = CONDITION_ICON[c.type] ?? Filter;
        return (
          <Badge key={i} variant="outline"
            className="gap-1 border-amber-300/60 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 text-[10px]">
            <Ic className="h-3 w-3" /> {conditionSummary(c)}
          </Badge>
        );
      })}
    </div>
  );
}

interface ActionBadgeProps {
  items: RuleAction[] | { type: string; value: string }[];
  showValueHint?: boolean;
  label?: string;
}

/** Shared badges for an action list (used in rule card + tester). */
function ActionBadges({ items, showValueHint, label }: ActionBadgeProps) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        <PlayCircle className="h-3 w-3" /> {label ?? t.rules.actions}:
      </span>
      {items.map((a, i) => {
        const Ic = ACTION_ICON[a.type] ?? PlayCircle;
        const hint = showValueHint
          ? a.type === "reply_text" && a.value
            ? ` «${a.value.length > 32 ? a.value.slice(0, 32) + "…" : a.value}»`
            : a.type === "tag_lead" && a.value ? ` #${a.value}`
            : a.type === "escalate" && a.value ? ` ${a.value}` : ""
          : "";
        return (
          <Badge key={i} variant="secondary" className={cn("gap-1 text-[10px]", ACTION_TONE[a.type])}>
            <Ic className="h-3 w-3" /> {labelFor(ACTION_TYPES, a.type)}
            {hint && <span className="opacity-70">{hint}</span>}
          </Badge>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TriggerType = "keyword" | "any_dm" | "any_comment" | "story_reply";
type ResponseType = "static_text" | "static_media" | "ai_generated";
type MatchMode = "any" | "all";

interface RuleFormState {
  name: string;
  triggerType: TriggerType;
  triggerKeywords: string;
  triggerMatchMode: MatchMode;
  responseType: ResponseType;
  staticResponse: string;
  mediaUrl: string;
  aiPromptOverride: string;
  isActive: boolean;
  conditions: Condition[];
  actions: RuleAction[];
}

interface CreateRuleBody {
  igAccountId: string;
  name: string;
  triggerType: TriggerType;
  triggerKeywords: string;
  triggerMatchMode: MatchMode;
  responseType: ResponseType;
  staticResponse: string | null;
  mediaUrl: string | null;
  aiPromptOverride: string | null;
  conditionsJson: string | null;
  actionsJson: string | null;
  isActive: boolean;
}
interface UpdateRuleBody extends Partial<CreateRuleBody> { id: string }
interface ReorderBody { igAccountId: string; orderedIds: string[] }
interface TemplateBody { igAccountId: string; templateId: string }

interface PreviewResult {
  matchedRule: {
    id: string; name: string; responseType: string;
    matchedKeywords?: string[];
    conditions: { type: string; operator: string; value: string }[];
    actions: { type: string; value: string }[];
  } | null;
  aiFallback: boolean;
  aiPreview: { reply: string; intent: string; escalate: boolean; suggestedAction: string } | null;
}

interface RulesPayload { rules: RuleDto[] }

function emptyForm(): RuleFormState {
  return {
    name: "", triggerType: "keyword", triggerKeywords: "", triggerMatchMode: "any",
    responseType: "static_text", staticResponse: "", mediaUrl: "",
    aiPromptOverride: "", isActive: true, conditions: [],
    actions: [{ type: "reply_text", value: "" }],
  };
}

function formFromRule(r: RuleDto): RuleFormState {
  const actions = parseActions(r);
  return {
    name: r.name,
    triggerType: r.triggerType as TriggerType,
    triggerKeywords: r.triggerKeywords || "",
    triggerMatchMode: (r.triggerMatchMode as MatchMode) || "any",
    responseType: r.responseType as ResponseType,
    staticResponse: r.staticResponse || "",
    mediaUrl: r.mediaUrl || "",
    aiPromptOverride: r.aiPromptOverride || "",
    isActive: r.isActive,
    conditions: parseConditions(r),
    actions: actions.length > 0 ? actions : [{ type: "reply_text", value: "" }],
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function RulesView() {
  const { selectedAccountId } = useAppStore();
  if (!selectedAccountId) return <ConnectAccountEmptyState />;
  return <RulesViewContent key={selectedAccountId} igAccountId={selectedAccountId} />;
}

function ConnectAccountEmptyState() {
  const [connecting, setConnecting] = useState(false);
  async function connect() {
    setConnecting(true);
    try {
      const { url } = await api.get<{ url: string }>("/api/instagram/oauth/start");
      window.location.href = url;
    } catch {
      setConnecting(false);
      toast.error("اتصال به اینستاگرام ممکن نشد");
    }
  }
  return (
    <div className="p-4 md:p-6">
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl ig-gradient text-white shadow-lg">
          <Inbox className="h-9 w-9" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">برای ساخت قوانین، اینستاگرام را متصل کنید</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          قوانین روی دایرکت‌ها، کامنت‌ها و ریپلای‌های استوری ورودی فعال می‌شوند. برای شروع، یک حساب اینستاگرام متصل کنید.
        </p>
        <Button className="mt-6 ig-gradient text-white hover:opacity-90" onClick={connect} disabled={connecting}>
          {connecting ? "در حال هدایت…" : (
            <><Plus className="h-4 w-4" /> {t.dashboard.connectInstagram}</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

function RulesViewContent({ igAccountId }: { igAccountId: string }) {
  const qc = useQueryClient();
  const rulesKey = useMemo(() => ["rules", igAccountId] as const, [igAccountId]);
  const { data, isLoading, isError, error, refetch } = useApi<RulesPayload>(
    [...rulesKey], `/api/rules?igAccountId=${igAccountId}`,
  );
  const rules = data?.rules ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RuleDto | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [testerOpen, setTesterOpen] = useState(true);

  const createMut = useApiMutation<CreateRuleBody, { rule: RuleDto }>("POST", () => "/api/rules", [[...rulesKey]]);
  const updateMut = useApiMutation<UpdateRuleBody, { rule: RuleDto }>("PUT", (b) => `/api/rules/${b.id}`, [[...rulesKey]]);
  const deleteMut = useApiMutation<{ id: string }, { ok: boolean }>("DELETE", (b) => `/api/rules/${b.id}`, [[...rulesKey]]);
  const reorderMut = useApiMutation<ReorderBody, { ok: boolean }>("POST", () => "/api/rules/reorder", [[...rulesKey]]);
  const templateMut = useApiMutation<TemplateBody, { ok: boolean; rule: RuleDto }>("POST", () => "/api/rules/template", [[...rulesKey]]);

  function setRulesCache(updater: (rs: RuleDto[]) => RuleDto[]) {
    qc.setQueryData<RulesPayload>([...rulesKey], (old) =>
      old ? { ...old, rules: updater(old.rules) } : old);
  }
  const rollback = () => qc.invalidateQueries({ queryKey: [...rulesKey] });

  function openNew() { setEditing(null); setDialogOpen(true); }
  function openEdit(rule: RuleDto) { setEditing(rule); setDialogOpen(true); }

  async function handleSave(form: RuleFormState) {
    const isKeyword = form.triggerType === "keyword";
    // Derive legacy response fields from the first reply action so the
    // rule-engine's backward-compat path keeps working everywhere.
    const firstReply = form.actions.find((a) =>
      ["reply_text", "reply_media", "ai_reply"].includes(a.type));
    let responseType: ResponseType = form.responseType;
    let staticResponse: string | null = null;
    let mediaUrl: string | null = null;
    let aiPromptOverride: string | null = null;
    if (firstReply?.type === "reply_text") {
      responseType = "static_text"; staticResponse = firstReply.value.trim() || null;
    } else if (firstReply?.type === "reply_media") {
      responseType = "static_media"; mediaUrl = firstReply.value.trim() || null;
    } else if (firstReply?.type === "ai_reply") {
      responseType = "ai_generated"; aiPromptOverride = firstReply.value.trim() || null;
    }

    const payload: CreateRuleBody = {
      igAccountId, name: form.name.trim(),
      triggerType: form.triggerType,
      triggerKeywords: isKeyword ? form.triggerKeywords.trim() : "",
      triggerMatchMode: form.triggerMatchMode,
      responseType, staticResponse, mediaUrl, aiPromptOverride,
      conditionsJson: form.conditions.length > 0 ? JSON.stringify(form.conditions) : null,
      actionsJson: form.actions.length > 0 ? JSON.stringify(form.actions) : null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success(t.rules.updated);
      } else {
        await createMut.mutateAsync(payload);
        toast.success(t.rules.saved);
      }
      setDialogOpen(false); setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره قانون ممکن نشد");
    }
  }

  function handleToggleActive(rule: RuleDto, next: boolean) {
    setRulesCache((rs) => rs.map((r) => (r.id === rule.id ? { ...r, isActive: next } : r)));
    updateMut.mutate({ id: rule.id, isActive: next }, {
      onError: (e) => { rollback(); toast.error(e instanceof Error ? e.message : "به‌روزرسانی قانون ممکن نشد"); },
    });
  }

  async function handleDelete(rule: RuleDto) {
    setRulesCache((rs) => rs.filter((r) => r.id !== rule.id));
    try {
      await deleteMut.mutateAsync({ id: rule.id });
      toast.success(t.rules.deleted);
    } catch (e) {
      rollback();
      toast.error(e instanceof Error ? e.message : "حذف قانون ممکن نشد");
    }
  }

  async function handleApplyTemplate(templateId: string) {
    try {
      await templateMut.mutateAsync({ igAccountId, templateId });
      toast.success(t.rules.templateAdded);
      setGalleryOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "افزودن قالب ممکن نشد");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rules.findIndex((r) => r.id === active.id);
    const newIndex = rules.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(rules, oldIndex, newIndex);
    setRulesCache(() => reordered);
    reorderMut.mutate(
      { igAccountId, orderedIds: reordered.map((r) => r.id) },
      {
        onError: (e) => { rollback(); toast.error(e instanceof Error ? e.message : "ذخیره ترتیب ممکن نشد"); },
        onSuccess: () => toast.success(t.rules.priorityUpdated),
      },
    );
  }

  const sortedIds = rules.map((r) => r.id);
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.rules.title}</h1>
          <p className="text-sm text-muted-foreground">{t.rules.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setGalleryOpen(true)}>
            <LayoutGrid className="h-4 w-4" /> {t.rules.fromTemplate}
          </Button>
          <Button onClick={openNew} className="ig-gradient text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> {t.rules.newRule}
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <RulesSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>بارگذاری قوانین ناموفق بود</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "خطایی رخ داد."}{" "}
            <button className="underline underline-offset-2 font-medium" onClick={() => refetch()}>
              تلاش دوباره
            </button>
          </AlertDescription>
        </Alert>
      ) : rules.length === 0 ? (
        <EmptyRules onNew={openNew} onOpenGallery={() => setGalleryOpen(true)} />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin ps-1 pb-1">
              {rules.map((rule, idx) => (
                <SortableRuleCard
                  key={rule.id} rule={rule} rank={idx + 1}
                  onToggle={(next) => handleToggleActive(rule, next)}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => handleDelete(rule)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <RuleTester igAccountId={igAccountId} open={testerOpen} onOpenChange={setTesterOpen} hasRules={rules.length > 0} />

      <RuleDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}
        editing={editing} saving={saving} onSave={handleSave}
      />

      <TemplateGalleryDialog
        open={galleryOpen} onOpenChange={setGalleryOpen}
        applying={templateMut.isPending} onApply={handleApplyTemplate}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable rule card
// ---------------------------------------------------------------------------

function SortableRuleCard({
  rule, rank, onToggle, onEdit, onDelete,
}: {
  rule: RuleDto; rank: number;
  onToggle: (next: boolean) => void; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const triggerLabel = labelFor(TRIGGER_TYPES, rule.triggerType);
  const keywords = rule.triggerType === "keyword" ? splitTags(rule.triggerKeywords) : [];
  const conditions = parseConditions(rule);
  const actions = parseActions(rule);
  const TriggerIc = TRIGGER_ICON[rule.triggerType] ?? Zap;

  return (
    <div ref={setNodeRef} style={style}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/40",
        !rule.isActive && "opacity-60",
      )}>
      <button type="button"
        className="mt-0.5 flex h-8 w-6 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`برای تغییر ترتیب، ${rule.name} را بکشید`}
        {...attributes} {...listeners}>
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex flex-col items-center pt-0.5">
        <span className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
          rank === 1 ? "ig-gradient text-white" : "bg-secondary text-secondary-foreground",
        )} title={`اولویت ${toFa(rank)}`}>
          {toFa(rank)}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-semibold leading-tight truncate">{rule.name}</h3>
          {!rule.isActive && <Badge variant="secondary" className="text-[10px]">{t.common.inactive}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {TRIGGER_TYPES.find((tt) => tt.value === rule.triggerType)?.description}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1">
            <TriggerIc className="h-3 w-3" /> {triggerLabel}
          </Badge>
          {keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="font-mono text-[10px]">{kw}</Badge>
          ))}
          {keywords.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {rule.triggerMatchMode === "all" ? t.rules.matchAll : t.rules.matchAny}
            </span>
          )}
          <ResponseChip type={rule.responseType} />
        </div>

        <ConditionBadges items={conditions} />
        <ActionBadges items={actions} showValueHint />

        {rule.responseType === "static_text" && rule.staticResponse && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">«{rule.staticResponse}»</p>
        )}
        {rule.responseType === "static_media" && rule.mediaUrl && (
          <p className="text-xs text-muted-foreground truncate" dir="ltr">📎 {rule.mediaUrl}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-2 ps-1">
          <Label htmlFor={`active-${rule.id}`} className="sr-only">
            {rule.isActive ? t.common.inactive : t.common.active}
          </Label>
          <Switch id={`active-${rule.id}`} checked={rule.isActive} onCheckedChange={onToggle} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}
              aria-label={`${t.common.edit} ${rule.name}`}>
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t.common.edit}</TooltipContent>
        </Tooltip>
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  aria-label={`${t.common.delete} ${rule.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>{t.common.delete}</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.rules.deleteConfirm}</AlertDialogTitle>
              <AlertDialogDescription>
                قانون «{rule.name}» برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={onDelete}>
                {t.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function ResponseChip({ type }: { type: string }) {
  if (type === "static_text") {
    return (
      <Badge variant="secondary" className="gap-1">
        <MessageSquare className="h-3 w-3" /> {t.rules.staticText}
      </Badge>
    );
  }
  if (type === "static_media") {
    return (
      <Badge className="gap-1 bg-violet-500/15 text-violet-700 dark:text-violet-300 border-transparent">
        <ImageIcon className="h-3 w-3" /> {t.rules.staticMedia}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 ig-gradient text-white border-transparent">
      <Sparkles className="h-3 w-3" /> {t.rules.aiGenerated}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// New / Edit dialog (WHEN / IF / THEN visual builder)
// ---------------------------------------------------------------------------

function RuleDialog({
  open, onOpenChange, editing, saving, onSave,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  editing: RuleDto | null; saving: boolean;
  onSave: (form: RuleFormState) => void;
}) {
  const initial = editing ? formFromRule(editing) : emptyForm();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{editing ? t.rules.editRule : t.rules.newRule}</DialogTitle>
          <DialogDescription>
            با سازنده بصری «وقتی / اگر / آنگاه»، یک قانون قدرتمند در چند ثانیه بسازید.
          </DialogDescription>
        </DialogHeader>
        <RuleFormBody
          key={editing?.id ?? "new"}
          initial={initial} saving={saving} isEdit={!!editing}
          onCancel={() => onOpenChange(false)} onSubmit={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({
  badge, badgeClass, icon: Icon, title, desc,
}: {
  badge: string; badgeClass: string; icon: LucideIcon; title: string; desc?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b bg-muted/40 px-4 py-2.5">
      <span className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white font-bold text-xs",
        badgeClass,
      )}>{badge}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold leading-tight">{title}</h3>
        {desc && <p className="text-[11px] text-muted-foreground leading-tight">{desc}</p>}
      </div>
    </div>
  );
}

function RuleFormBody({
  initial, saving, isEdit, onCancel, onSubmit,
}: {
  initial: RuleFormState; saving: boolean; isEdit: boolean;
  onCancel: () => void; onSubmit: (form: RuleFormState) => void;
}) {
  const [form, setForm] = useState<RuleFormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addCondition = () =>
    setForm((f) => ({ ...f, conditions: [...f.conditions, { type: "channel", operator: "is", value: "dm" }] }));
  const updateCondition = (i: number, patch: Partial<Condition>) =>
    setForm((f) => ({ ...f, conditions: f.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  const removeCondition = (i: number) =>
    setForm((f) => ({ ...f, conditions: f.conditions.filter((_, idx) => idx !== i) }));

  const addAction = () =>
    setForm((f) => ({ ...f, actions: [...f.actions, { type: "reply_text", value: "" }] }));
  const updateAction = (i: number, patch: Partial<RuleAction>) =>
    setForm((f) => ({ ...f, actions: f.actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  const removeAction = (i: number) =>
    setForm((f) => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }));

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "نام قانون الزامی است";
    if (form.triggerType === "keyword" && !form.triggerKeywords.trim())
      e.triggerKeywords = "حداقل یک کلمه کلیدی وارد کنید";
    form.conditions.forEach((c, i) => {
      if (c.type === "time_window" && !/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/.test(c.value.trim())) {
        e[`cond-${i}`] = "فرمت باید HH:MM-HH:MM باشد";
      } else if (!c.value.trim() && c.type !== "channel" && c.type !== "contact_type") {
        e[`cond-${i}`] = "مقدار شرط الزامی است";
      }
    });
    form.actions.forEach((a, i) => {
      if (a.type === "reply_text" && !a.value.trim()) e[`act-${i}`] = "متن پاسخ الزامی است";
      if (a.type === "reply_media" && !a.value.trim()) e[`act-${i}`] = "آدرس رسانه الزامی است";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  const triggerMeta = TRIGGER_TYPES.find((tt) => tt.value === form.triggerType);
  const isKeyword = form.triggerType === "keyword";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="rule-name">{t.rules.name}</Label>
        <Input id="rule-name" value={form.name} onChange={(e) => set("name", e.target.value)}
          placeholder={t.rules.namePlaceholder} autoFocus aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* ============ WHEN ============ */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <SectionHeader badge="۱" badgeClass="ig-gradient" icon={Zap} title={t.rules.when} desc={t.rules.whenDesc} />
        <div className="space-y-3 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-trigger">{t.rules.triggerType}</Label>
            <Select value={form.triggerType} onValueChange={(v) => set("triggerType", v as TriggerType)}>
              <SelectTrigger id="rule-trigger" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((tt) => {
                  const Ic = TRIGGER_ICON[tt.value] ?? Zap;
                  return (
                    <SelectItem key={tt.value} value={tt.value}>
                      <span className="flex items-center gap-2"><Ic className="h-3.5 w-3.5" /> {tt.label}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {triggerMeta && <p className="text-xs text-muted-foreground">{triggerMeta.description}</p>}
          </div>

          {isKeyword && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="rule-keywords">{t.rules.triggerKeywords}</Label>
                <Input id="rule-keywords" value={form.triggerKeywords}
                  onChange={(e) => set("triggerKeywords", e.target.value)}
                  placeholder="price, cost, چند, قیمت" aria-invalid={!!errors.triggerKeywords} />
                <p className="text-xs text-muted-foreground">{t.rules.triggerKeywordsHelp}</p>
                {errors.triggerKeywords && <p className="text-xs text-destructive">{errors.triggerKeywords}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>{t.rules.matchMode}</Label>
                <RadioGroup value={form.triggerMatchMode}
                  onValueChange={(v) => set("triggerMatchMode", v as MatchMode)}
                  className="grid grid-cols-2 gap-2">
                  {[
                    { value: "any", label: t.rules.matchAny, hint: "با وجود هر کلمه‌ای فعال می‌شود" },
                    { value: "all", label: t.rules.matchAll, hint: "فقط اگر همه کلمات موجود باشند فعال می‌شود" },
                  ].map((opt) => (
                    <label key={opt.value} htmlFor={`match-${opt.value}`}
                      className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                      <RadioGroupItem id={`match-${opt.value}`} value={opt.value} className="mt-0.5" />
                      <span className="space-y-0.5">
                        <span className="block font-medium">{opt.label}</span>
                        <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============ IF ============ */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <SectionHeader badge="۲" badgeClass="bg-amber-500" icon={Filter}
          title={t.rules.ifConditions} desc={t.rules.ifDesc} />
        <div className="space-y-3 p-4">
          {form.conditions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">{t.rules.noConditions}</p>
          ) : (
            <div className="space-y-2">
              {form.conditions.map((c, i) => (
                <ConditionRow key={i} condition={c} error={errors[`cond-${i}`]}
                  onChange={(patch) => updateCondition(i, patch)}
                  onRemove={() => removeCondition(i)} canRemove={true} />
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4" /> {t.rules.addCondition}
          </Button>
        </div>
      </section>

      {/* ============ THEN ============ */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <SectionHeader badge="۳" badgeClass="bg-emerald-500" icon={PlayCircle}
          title={t.rules.then} desc={t.rules.thenDesc} />
        <div className="space-y-3 p-4">
          {form.actions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              حداقل یک اقدام اضافه کنید — مثلاً «پاسخ متنی».
            </p>
          ) : (
            <div className="space-y-2">
              {form.actions.map((a, i) => (
                <ActionRow key={i} action={a} error={errors[`act-${i}`]}
                  onChange={(patch) => updateAction(i, patch)}
                  onRemove={() => removeAction(i)} canRemove={form.actions.length > 1} />
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addAction}>
            <Plus className="h-4 w-4" /> {t.rules.addAction}
          </Button>
        </div>
      </section>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="rule-active" className="cursor-pointer">{t.rules.active}</Label>
          <p className="text-xs text-muted-foreground">قوانین غیرفعال هرگز اجرا نمی‌شوند.</p>
        </div>
        <Switch id="rule-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>{t.common.cancel}</Button>
        <Button type="submit" disabled={saving} className="ig-gradient text-white hover:opacity-90">
          {saving ? t.common.sending : isEdit ? t.common.save : t.common.create}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Condition row (IF section)
// ---------------------------------------------------------------------------

function ConditionRow({
  condition, error, onChange, onRemove, canRemove,
}: {
  condition: Condition; error?: string;
  onChange: (patch: Partial<Condition>) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  const condMeta = CONDITION_TYPES.find((c) => c.value === condition.type);
  const opList = (condMeta?.operators ?? []).flatMap((opKey) => CONDITION_OPERATORS[opKey] ?? []);

  function onTypeChange(newType: string) {
    const meta = CONDITION_TYPES.find((c) => c.value === newType);
    const firstOp = meta?.operators[0] ?? "is";
    const defaultVal =
      newType === "channel" ? "dm" :
      newType === "contact_type" ? "new" :
      newType === "time_window" ? "20:00-10:00" :
      newType === "message_length" ? "50" : "";
    onChange({ type: newType, operator: firstOp, value: defaultVal });
  }

  const isSelectValue = condition.type === "channel" || condition.type === "contact_type";
  const valueList = condition.type === "channel" ? CHANNELS : CONTACT_TYPES;

  return (
    <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
      <div className="flex items-start gap-1.5">
        <div className="grid flex-1 grid-cols-1 sm:grid-cols-3 gap-1.5">
          <Select value={condition.type} onValueChange={onTypeChange}>
            <SelectTrigger className="h-9" aria-label={t.rules.conditionType}><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONDITION_TYPES.map((c) => {
                const Ic = CONDITION_ICON[c.value] ?? Filter;
                return (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="flex items-center gap-1.5"><Ic className="h-3.5 w-3.5" /> {c.label}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={condition.operator} onValueChange={(v) => onChange({ operator: v })}>
            <SelectTrigger className="h-9" aria-label={t.rules.operator}><SelectValue /></SelectTrigger>
            <SelectContent>
              {opList.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isSelectValue ? (
            <Select value={condition.value} onValueChange={(v) => onChange({ value: v })}>
              <SelectTrigger className="h-9" aria-label={t.rules.value}><SelectValue /></SelectTrigger>
              <SelectContent>
                {valueList.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={condition.value} onChange={(e) => onChange({ value: e.target.value })}
              placeholder={
                condition.type === "time_window" ? "HH:MM-HH:MM" :
                condition.type === "message_length" ? "۵۰" : "متن…"
              }
              dir={condition.type === "time_window" ? "ltr" : undefined}
              className="h-9" aria-label={t.rules.value} />
          )}
        </div>

        {canRemove && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                onClick={onRemove} aria-label="حذف شرط">
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>حذف شرط</TooltipContent>
          </Tooltip>
        )}
      </div>
      {error && <p className="text-xs text-destructive ps-1">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action row (THEN section)
// ---------------------------------------------------------------------------

function ActionRow({
  action, error, onChange, onRemove, canRemove,
}: {
  action: RuleAction; error?: string;
  onChange: (patch: Partial<RuleAction>) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  const onTypeChange = (newType: string) => onChange({ type: newType, value: "" });
  const needsValue = action.type !== "resolve";

  return (
    <div className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
      <div className="flex items-start gap-1.5">
        <div className="flex-1 space-y-1.5">
          <Select value={action.type} onValueChange={onTypeChange}>
            <SelectTrigger className="h-9" aria-label={t.rules.actionType}><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((a) => {
                const Ic = ACTION_ICON[a.value] ?? PlayCircle;
                return (
                  <SelectItem key={a.value} value={a.value}>
                    <span className="flex items-center gap-1.5"><Ic className="h-3.5 w-3.5" /> {a.label}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {needsValue && action.type === "reply_text" && (
            <Textarea value={action.value} onChange={(e) => onChange({ value: e.target.value })}
              placeholder="مثلاً: سلام! ممنون از پیامتون. قیمت‌ها از … شروع می‌شه."
              rows={2} aria-label={t.rules.actionValue} aria-invalid={!!error} />
          )}
          {needsValue && action.type === "reply_media" && (
            <Input value={action.value} onChange={(e) => onChange({ value: e.target.value })}
              placeholder="https://…/image.png" dir="ltr"
              aria-label={t.rules.actionValue} aria-invalid={!!error} />
          )}
          {needsValue && action.type === "ai_reply" && (
            <>
              <Textarea value={action.value} onChange={(e) => onChange({ value: e.target.value })}
                placeholder="دستورالعمل اضافی اختیاری برای هوش مصنوعی (مثلاً: تخفیف ۱۰٪ را ذکر کن)"
                rows={2} aria-label={t.rules.actionValue} />
              <p className="text-[11px] text-muted-foreground">{t.rules.aiOverrideHelp}</p>
            </>
          )}
          {needsValue && action.type === "tag_lead" && (
            <Input value={action.value} onChange={(e) => onChange({ value: e.target.value })}
              placeholder="مثلاً: pricing یا booking" dir="ltr" aria-label={t.rules.actionValue} />
          )}
          {needsValue && action.type === "escalate" && (
            <Input value={action.value} onChange={(e) => onChange({ value: e.target.value })}
              placeholder="دلیل ارجاع (مثلاً: complaint)" aria-label={t.rules.actionValue} />
          )}
          {!needsValue && (
            <p className="text-[11px] text-muted-foreground italic">
              گفتگو به‌عنوان «حل‌شده» علامت‌گذاری می‌شود.
            </p>
          )}
        </div>

        {canRemove && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon"
                className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                onClick={onRemove} aria-label="حذف اقدام">
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>حذف اقدام</TooltipContent>
          </Tooltip>
        )}
      </div>
      {error && <p className="text-xs text-destructive ps-1">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template gallery
// ---------------------------------------------------------------------------

function TemplateGalleryDialog({
  open, onOpenChange, applying, onApply,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  applying: boolean; onApply: (templateId: string) => void;
}) {
  const [category, setCategory] = useState<string>("all");
  const filtered = useMemo(
    () => category === "all" ? SCENARIO_TEMPLATES : SCENARIO_TEMPLATES.filter((tpl) => tpl.category === category),
    [category],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" /> {t.rules.templateGallery}
          </DialogTitle>
          <DialogDescription>{t.rules.templateGalleryDesc}</DialogDescription>
        </DialogHeader>

        <Tabs value={category} onValueChange={setCategory} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap gap-1 bg-muted/50 p-1">
            {TEMPLATE_CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs">{c.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => {
            const Ic = TEMPLATE_ICONS[tpl.icon] ?? Bot;
            return (
              <div key={tpl.id}
                className="group flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                    tpl.color,
                  )}>
                    <Ic className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm leading-tight">{tpl.name}</h3>
                    <Badge variant="outline" className="mt-1 text-[10px]">{tpl.category}</Badge>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-muted-foreground line-clamp-3 flex-1">{tpl.description}</p>
                <Button type="button" size="sm"
                  className="mt-3 w-full ig-gradient text-white hover:opacity-90"
                  onClick={() => onApply(tpl.id)} disabled={applying}>
                  {applying ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {t.rules.useTemplate}
                </Button>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            قالبی در این دسته نیست.
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Rule tester
// ---------------------------------------------------------------------------

function RuleTester({
  igAccountId, open, onOpenChange, hasRules,
}: {
  igAccountId: string; open: boolean;
  onOpenChange: (o: boolean) => void; hasRules: boolean;
}) {
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"dm" | "comment" | "story">("dm");
  const [isFirstMessage, setIsFirstMessage] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runTest(msg?: string) {
    const text = (msg ?? message).trim();
    if (!text) return;
    setMessage(text);
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<PreviewResult>("/api/rules/preview", {
        igAccountId, message: text, channel, isFirstMessage,
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "پیش‌نمایش ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  const samples = ["سلام، قیمت چنده؟", "ساعت کاریتون چنده؟", "می‌خوام شکایت کنم"];

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 px-6 py-4 text-start hover:bg-accent/40 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg ig-gradient-soft text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold leading-tight">{t.rules.tester}</h3>
              <p className="text-xs text-muted-foreground">{t.rules.testerDesc}</p>
            </div>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-6 py-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="test-message" className="sr-only">{t.rules.testMessage}</Label>
                <Input id="test-message" value={message} onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runTest(); }
                  }}
                  placeholder="یک پیام مشتری بنویسید…" />
              </div>
              <div className="flex items-center gap-2">
                <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                  <SelectTrigger className="w-[140px]" aria-label={t.dashboard.channel}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => runTest()} disabled={loading || !message.trim()}
                  className="ig-gradient text-white hover:opacity-90">
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {t.rules.test}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="test-new" checked={isFirstMessage} onCheckedChange={setIsFirstMessage} />
              <Label htmlFor="test-new" className="cursor-pointer text-xs text-muted-foreground">
                {t.rules.testAsNew} (برای شرط «نوع تماس»)
              </Label>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">امتحان کنید:</span>
              {samples.map((s) => (
                <button key={s} type="button" onClick={() => runTest(s)}
                  className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-accent transition-colors"
                  disabled={loading}>
                  {s}
                </button>
              ))}
            </div>

            <TesterResult result={result} loading={loading} hasRules={hasRules} message={message.trim()} />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TesterResult({
  result, loading, hasRules, message,
}: {
  result: PreviewResult | null; loading: boolean;
  hasRules: boolean; message: string;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        {hasRules
          ? "یک آزمایش اجرا کنید تا ببینید کدام قانون تطابق دارد و چه اقداماتی انجام می‌شود."
          : "هنوز قانونی وجود ندارد — اگر پشتیبان هوش مصنوعی در تب دستیار هوش مصنوعی فعال باشد، پیام‌ها را پاسخ می‌دهد."}
      </div>
    );
  }

  const matched = result.matchedRule;
  const ai = result.aiPreview;

  return (
    <div className="space-y-3">
      {matched ? (
        <div className="space-y-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <span className="font-medium text-emerald-800 dark:text-emerald-200">
              {t.rules.matched} {matched.name}
            </span>
            {matched.matchedKeywords && matched.matchedKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-xs text-muted-foreground">{t.rules.matchedKeywords}:</span>
                {matched.matchedKeywords.map((k) => (
                  <Badge key={k} variant="secondary" className="font-mono text-[10px]">{k}</Badge>
                ))}
              </div>
            )}
            <ResponseChip type={matched.responseType} />
          </div>
          <ConditionBadges items={matched.conditions} />
          <ActionBadges items={matched.actions} label={t.rules.actionsExecuted} />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-amber-800 dark:text-amber-200">
            {result.aiFallback ? t.rules.noMatch : "هیچ قانونی تطابق نداشت — پشتیبان هوش مصنوعی خاموش است"}
          </span>
        </div>
      )}

      {ai && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {t.rules.reply}
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{intentLabel(ai.intent)}</Badge>
              {ai.escalate ? (
                <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent">
                  {t.rules.escalate}
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent">
                  پاسخ خودکار
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="self-start max-w-[80%] rounded-2xl rounded-es-sm bg-secondary px-3 py-2 text-sm">
              {message || t.inbox.customer}
            </div>
            <div className="self-end max-w-[85%] rounded-2xl rounded-ee-sm ig-gradient px-3 py-2 text-sm text-white whitespace-pre-wrap">
              {ai.reply}
            </div>
          </div>
          {ai.suggestedAction && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{t.rules.suggestedAction}:</span> {ai.suggestedAction}
            </p>
          )}
        </div>
      )}

      {matched && !ai && (
        <p className="text-xs text-muted-foreground">
          این قانون از پاسخ ثابت استفاده می‌کند — نیازی به تولید هوش مصنوعی نیست.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty + loading states
// ---------------------------------------------------------------------------

function EmptyRules({ onNew, onOpenGallery }: { onNew: () => void; onOpenGallery: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl ig-gradient-soft text-primary">
        <Zap className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{t.rules.noRules}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t.rules.noRulesDesc}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={onOpenGallery}>
          <LayoutGrid className="h-4 w-4" /> {t.rules.fromTemplate}
        </Button>
        <Button className="ig-gradient text-white hover:opacity-90" onClick={onNew}>
          <Plus className="h-4 w-4" /> {t.rules.newRule}
        </Button>
      </div>
      {/* Mini gallery preview as a hint */}
      <div className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {SCENARIO_TEMPLATES.slice(0, 4).map((tpl) => {
          const Ic = TEMPLATE_ICONS[tpl.icon] ?? Bot;
          return (
            <button key={tpl.id} type="button" onClick={onOpenGallery}
              className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-[11px] text-start hover:bg-accent/40 transition-colors">
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white",
                tpl.color,
              )}>
                <Ic className="h-3.5 w-3.5" />
              </div>
              <span className="truncate text-muted-foreground">{tpl.name}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="h-3 w-3" /> روی «از قالب آماده» بزنید تا بقیه را ببینید
      </p>
    </div>
  );
}

function RulesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="h-8 w-6" />
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}
