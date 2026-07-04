"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Bot,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Send,
  AlertCircle,
  Zap,
  Wand2,
  ChevronDown,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { useAppStore } from "@/lib/store";
import { TRIGGER_TYPES, RESPONSE_TYPES, CHANNELS, labelFor } from "@/lib/constants";
import { splitTags } from "@/lib/format";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  isActive: boolean;
}

interface UpdateRuleBody {
  id: string;
  name?: string;
  triggerType?: TriggerType;
  triggerKeywords?: string;
  triggerMatchMode?: MatchMode;
  responseType?: ResponseType;
  staticResponse?: string | null;
  mediaUrl?: string | null;
  aiPromptOverride?: string | null;
  isActive?: boolean;
}

interface ReorderBody {
  igAccountId: string;
  orderedIds: string[];
}

interface PreviewResult {
  matchedRule: {
    id: string;
    name: string;
    responseType: string;
    matchedKeywords?: string[];
  } | null;
  aiFallback: boolean;
  aiPreview: {
    reply: string;
    intent: string;
    escalate: boolean;
    suggestedAction: string;
  } | null;
}

interface RulesPayload {
  rules: AutomationRuleDto[];
}

function emptyForm(): RuleFormState {
  return {
    name: "",
    triggerType: "keyword",
    triggerKeywords: "",
    triggerMatchMode: "any",
    responseType: "static_text",
    staticResponse: "",
    mediaUrl: "",
    aiPromptOverride: "",
    isActive: true,
  };
}

function formFromRule(r: AutomationRuleDto): RuleFormState {
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
      toast.error("Could not start Instagram connection");
    }
  }
  return (
    <div className="p-4 md:p-6">
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl ig-gradient text-white shadow-lg">
          <Inbox className="h-9 w-9" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Connect Instagram to build automation rules</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Rules trigger on incoming DMs, comments and story replies. Connect an Instagram account to get started.
        </p>
        <Button className="mt-6 ig-gradient text-white hover:opacity-90" onClick={connect} disabled={connecting}>
          {connecting ? "Redirecting…" : (
            <>
              <Plus className="h-4 w-4" /> Connect Instagram
            </>
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
    [...rulesKey],
    `/api/rules?igAccountId=${igAccountId}`,
  );

  const rules = data?.rules ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRuleDto | null>(null);
  const [testerOpen, setTesterOpen] = useState(true);

  // ----- mutations -----
  const createMut = useApiMutation<CreateRuleBody, { rule: AutomationRuleDto }>(
    "POST",
    () => "/api/rules",
    [[...rulesKey]],
  );
  const updateMut = useApiMutation<UpdateRuleBody, { rule: AutomationRuleDto }>(
    "PUT",
    (b) => `/api/rules/${b.id}`,
    [[...rulesKey]],
  );
  const deleteMut = useApiMutation<{ id: string }, { ok: boolean }>(
    "DELETE",
    (b) => `/api/rules/${b.id}`,
    [[...rulesKey]],
  );
  const reorderMut = useApiMutation<ReorderBody, { ok: boolean }>(
    "POST",
    () => "/api/rules/reorder",
    [[...rulesKey]],
  );

  // ----- optimistic helpers -----
  function setRulesCache(updater: (rs: AutomationRuleDto[]) => AutomationRuleDto[]) {
    qc.setQueryData<RulesPayload>([...rulesKey], (old) =>
      old ? { ...old, rules: updater(old.rules) } : old,
    );
  }
  function rollback() {
    qc.invalidateQueries({ queryKey: [...rulesKey] });
  }

  // ----- handlers -----
  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(rule: AutomationRuleDto) {
    setEditing(rule);
    setDialogOpen(true);
  }

  async function handleSave(form: RuleFormState) {
    const isKeyword = form.triggerType === "keyword";
    const payload: CreateRuleBody = {
      igAccountId,
      name: form.name.trim(),
      triggerType: form.triggerType,
      triggerKeywords: isKeyword ? form.triggerKeywords.trim() : "",
      triggerMatchMode: form.triggerMatchMode,
      responseType: form.responseType,
      staticResponse: form.responseType === "static_text" ? form.staticResponse.trim() || null : null,
      mediaUrl: form.responseType === "static_media" ? form.mediaUrl.trim() || null : null,
      aiPromptOverride: form.responseType === "ai_generated" ? form.aiPromptOverride.trim() || null : null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success("Rule updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Rule created");
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save rule");
    }
  }

  function handleToggleActive(rule: AutomationRuleDto, next: boolean) {
    setRulesCache((rs) => rs.map((r) => (r.id === rule.id ? { ...r, isActive: next } : r)));
    updateMut.mutate(
      { id: rule.id, isActive: next },
      {
        onError: (e) => {
          rollback();
          toast.error(e instanceof Error ? e.message : "Could not update rule");
        },
      },
    );
  }

  async function handleDelete(rule: AutomationRuleDto) {
    setRulesCache((rs) => rs.filter((r) => r.id !== rule.id));
    try {
      await deleteMut.mutateAsync({ id: rule.id });
      toast.success("Rule deleted");
    } catch (e) {
      rollback();
      toast.error(e instanceof Error ? e.message : "Could not delete rule");
    }
  }

  // ----- dnd -----
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
    const orderedIds = reordered.map((r) => r.id);
    reorderMut.mutate(
      { igAccountId, orderedIds },
      {
        onError: (e) => {
          rollback();
          toast.error(e instanceof Error ? e.message : "Could not save order");
        },
        onSuccess: () => toast.success("Priority updated"),
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
          <h1 className="text-2xl font-semibold tracking-tight">Automation Rules</h1>
          <p className="text-sm text-muted-foreground">Drag to reorder priority. Higher rules win.</p>
        </div>
        <Button onClick={openNew} className="ig-gradient text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> New rule
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <RulesSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not load rules</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Something went wrong."}{" "}
            <button className="underline underline-offset-2 font-medium" onClick={() => refetch()}>
              Try again
            </button>
          </AlertDescription>
        </Alert>
      ) : rules.length === 0 ? (
        <EmptyRules onNew={openNew} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto scrollbar-thin pr-1 pb-1">
              {rules.map((rule, idx) => (
                <SortableRuleCard
                  key={rule.id}
                  rule={rule}
                  rank={idx + 1}
                  onToggle={(next) => handleToggleActive(rule, next)}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => handleDelete(rule)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Rule tester */}
      <RuleTester igAccountId={igAccountId} open={testerOpen} onOpenChange={setTesterOpen} hasRules={rules.length > 0} />

      {/* Dialog */}
      <RuleDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable rule card
// ---------------------------------------------------------------------------

function SortableRuleCard({
  rule,
  rank,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AutomationRuleDto;
  rank: number;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const triggerLabel = labelFor(TRIGGER_TYPES, rule.triggerType);
  const keywords = rule.triggerType === "keyword" ? splitTags(rule.triggerKeywords) : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow",
        isDragging && "z-10 shadow-lg ring-2 ring-primary/40",
        !rule.isActive && "opacity-60",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-0.5 flex h-8 w-6 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag ${rule.name} to reorder`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Priority badge */}
      <div className="flex flex-col items-center pt-0.5">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
            rank === 1
              ? "ig-gradient text-white"
              : "bg-secondary text-secondary-foreground",
          )}
          title={`Priority ${rank}`}
        >
          {rank}
        </span>
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-semibold leading-tight truncate">{rule.name}</h3>
          {!rule.isActive && (
            <Badge variant="secondary" className="text-[10px]">Paused</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {TRIGGER_TYPES.find((t) => t.value === rule.triggerType)?.description}
        </p>

        {/* Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" /> {triggerLabel}
          </Badge>
          {keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="font-mono text-[10px]">
              {kw}
            </Badge>
          ))}
          {keywords.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {rule.triggerMatchMode === "all" ? "match ALL" : "match ANY"}
            </span>
          )}
          <ResponseChip type={rule.responseType} />
        </div>

        {/* Preview of static content */}
        {rule.responseType === "static_text" && rule.staticResponse && (
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            “{rule.staticResponse}”
          </p>
        )}
        {rule.responseType === "static_media" && rule.mediaUrl && (
          <p className="text-xs text-muted-foreground truncate">📎 {rule.mediaUrl}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-2 pr-1">
          <Label htmlFor={`active-${rule.id}`} className="sr-only">
            {rule.isActive ? "Pause rule" : "Activate rule"}
          </Label>
          <Switch id={`active-${rule.id}`} checked={rule.isActive} onCheckedChange={onToggle} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label={`Edit ${rule.name}`}>
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={`Delete ${rule.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete rule?</AlertDialogTitle>
              <AlertDialogDescription>
                “{rule.name}” will be permanently removed. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={onDelete}
              >
                Delete
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
        <MessageSquare className="h-3 w-3" /> Static text
      </Badge>
    );
  }
  if (type === "static_media") {
    return (
      <Badge className="gap-1 bg-violet-500/15 text-violet-700 dark:text-violet-300 border-transparent">
        <ImageIcon className="h-3 w-3" /> Static media
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 ig-gradient text-white border-transparent">
      <Sparkles className="h-3 w-3" /> AI generated
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// New / Edit dialog
// ---------------------------------------------------------------------------

function RuleDialog({
  open,
  onOpenChange,
  editing,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: AutomationRuleDto | null;
  saving: boolean;
  onSave: (form: RuleFormState) => void;
}) {
  const initial = editing ? formFromRule(editing) : emptyForm();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit rule" : "New automation rule"}</DialogTitle>
          <DialogDescription>
            Define when this rule fires and what ReplyPilot replies with.
          </DialogDescription>
        </DialogHeader>
        {/* key forces fresh form state every time the dialog opens / target changes */}
        <RuleFormBody
          key={editing?.id ?? "new"}
          initial={initial}
          saving={saving}
          onCancel={() => onOpenChange(false)}
          onSubmit={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

function RuleFormBody({
  initial,
  saving,
  onCancel,
  onSubmit,
}: {
  initial: RuleFormState;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (form: RuleFormState) => void;
}) {
  const [form, setForm] = useState<RuleFormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof RuleFormState>(key: K, value: RuleFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.triggerType === "keyword" && !form.triggerKeywords.trim())
      e.triggerKeywords = "Add at least one keyword";
    if (form.responseType === "static_text" && !form.staticResponse.trim())
      e.staticResponse = "Static reply is required";
    if (form.responseType === "static_media" && !form.mediaUrl.trim())
      e.mediaUrl = "Image URL is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    onSubmit(form);
  }

  const triggerMeta = TRIGGER_TYPES.find((t) => t.value === form.triggerType);
  const responseMeta = RESPONSE_TYPES.find((r) => r.value === form.responseType);
  const isKeyword = form.triggerType === "keyword";

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="rule-name">Rule name</Label>
        <Input
          id="rule-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Price question handler"
          autoFocus
          aria-invalid={!!errors.name}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Trigger type */}
      <div className="space-y-1.5">
        <Label htmlFor="rule-trigger">Trigger</Label>
        <Select value={form.triggerType} onValueChange={(v) => set("triggerType", v as TriggerType)}>
          <SelectTrigger id="rule-trigger" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {triggerMeta && <p className="text-xs text-muted-foreground">{triggerMeta.description}</p>}
      </div>

      {/* Keywords (conditional) */}
      {isKeyword && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="rule-keywords">Keywords</Label>
            <Input
              id="rule-keywords"
              value={form.triggerKeywords}
              onChange={(e) => set("triggerKeywords", e.target.value)}
              placeholder="price, cost, چند, قیمت"
              aria-invalid={!!errors.triggerKeywords}
            />
            <p className="text-xs text-muted-foreground">Comma-separated. e.g. price, cost, چند, قیمت</p>
            {errors.triggerKeywords && (
              <p className="text-xs text-destructive">{errors.triggerKeywords}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Match mode</Label>
            <RadioGroup
              value={form.triggerMatchMode}
              onValueChange={(v) => set("triggerMatchMode", v as MatchMode)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: "any", label: "Match ANY", hint: "Fire if any keyword is present" },
                { value: "all", label: "Match ALL", hint: "Fire only if all keywords are present" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`match-${opt.value}`}
                  className="flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
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

      {/* Response type */}
      <div className="space-y-1.5">
        <Label htmlFor="rule-response">Response</Label>
        <Select value={form.responseType} onValueChange={(v) => set("responseType", v as ResponseType)}>
          <SelectTrigger id="rule-response" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESPONSE_TYPES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {responseMeta && <p className="text-xs text-muted-foreground">{responseMeta.description}</p>}
      </div>

      {/* Response fields (conditional) */}
      {form.responseType === "static_text" && (
        <div className="space-y-1.5">
          <Label htmlFor="rule-static">Reply message</Label>
          <Textarea
            id="rule-static"
            value={form.staticResponse}
            onChange={(e) => set("staticResponse", e.target.value)}
            placeholder="Hi! Thanks for reaching out. Our prices start at…"
            rows={4}
            aria-invalid={!!errors.staticResponse}
          />
          {errors.staticResponse && <p className="text-xs text-destructive">{errors.staticResponse}</p>}
        </div>
      )}

      {form.responseType === "static_media" && (
        <div className="space-y-1.5">
          <Label htmlFor="rule-media">Image URL</Label>
          <Input
            id="rule-media"
            value={form.mediaUrl}
            onChange={(e) => set("mediaUrl", e.target.value)}
            placeholder="https://…/price-list.png"
            aria-invalid={!!errors.mediaUrl}
          />
          <p className="text-xs text-muted-foreground">A direct image URL ReplyPilot will attach to the reply.</p>
          {errors.mediaUrl && <p className="text-xs text-destructive">{errors.mediaUrl}</p>}
        </div>
      )}

      {form.responseType === "ai_generated" && (
        <div className="space-y-1.5">
          <Label htmlFor="rule-override">AI instructions (optional)</Label>
          <Textarea
            id="rule-override"
            value={form.aiPromptOverride}
            onChange={(e) => set("aiPromptOverride", e.target.value)}
            placeholder="Extra instructions for the AI when this rule fires, e.g. always mention the current 10% discount."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Merged with your business context in the AI Assistant tab.
          </p>
        </div>
      )}

      {/* Active switch */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="rule-active" className="cursor-pointer">Active</Label>
          <p className="text-xs text-muted-foreground">Inactive rules never fire.</p>
        </div>
        <Switch id="rule-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Create rule"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Rule tester
// ---------------------------------------------------------------------------

function RuleTester({
  igAccountId,
  open,
  onOpenChange,
  hasRules,
}: {
  igAccountId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hasRules: boolean;
}) {
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"dm" | "comment" | "story">("dm");
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
        igAccountId,
        message: text,
        channel,
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  const samples = ["Hi, how much is this?", "Do you ship to Tehran?", "What are your working hours?"];

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-accent/40 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg ig-gradient-soft text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold leading-tight">Rule tester</h3>
              <p className="text-xs text-muted-foreground">
                Simulate an incoming message and see which rule matches — or how the AI replies.
              </p>
            </div>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-6 py-4 space-y-4">
            {/* Input row */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="test-message" className="sr-only">Test message</Label>
                <Input
                  id="test-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      runTest();
                    }
                  }}
                  placeholder="Type a customer message…"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                  <SelectTrigger className="w-[140px]" aria-label="Channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => runTest()} disabled={loading || !message.trim()} className="ig-gradient text-white hover:opacity-90">
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Test
                </Button>
              </div>
            </div>

            {/* Sample chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Try:</span>
              {samples.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => runTest(s)}
                  className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-accent transition-colors"
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Result */}
            <TesterResult result={result} loading={loading} hasRules={hasRules} message={message.trim()} />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TesterResult({
  result,
  loading,
  hasRules,
  message,
}: {
  result: PreviewResult | null;
  loading: boolean;
  hasRules: boolean;
  message: string;
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
          ? "Run a test to see which rule matches and preview the AI reply."
          : "No rules yet — the AI fallback will handle messages if enabled in the AI Assistant tab."}
      </div>
    );
  }

  const matched = result.matchedRule;
  const ai = result.aiPreview;

  return (
    <div className="space-y-3">
      {/* Match badge */}
      {matched ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Zap className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-emerald-800 dark:text-emerald-200">
            Matched rule: {matched.name}
          </span>
          {matched.matchedKeywords && matched.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {matched.matchedKeywords.map((k) => (
                <Badge key={k} variant="secondary" className="font-mono text-[10px]">{k}</Badge>
              ))}
            </div>
          )}
          <ResponseChip type={matched.responseType} />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-white">
            <Bot className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-amber-800 dark:text-amber-200">
            {result.aiFallback ? "No rule matched — AI fallback engaged" : "No rule matched, AI fallback off"}
          </span>
        </div>
      )}

      {/* AI reply chat bubble */}
      {ai && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI reply preview
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{ai.intent}</Badge>
              {ai.escalate ? (
                <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-transparent">
                  Escalate
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent">
                  Auto-reply
                </Badge>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-secondary px-3 py-2 text-sm">
              {message || "Customer message"}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm ig-gradient px-3 py-2 text-sm text-white whitespace-pre-wrap">
              {ai.reply}
            </div>
          </div>
          {ai.suggestedAction && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Suggested action:</span> {ai.suggestedAction}
            </p>
          )}
        </div>
      )}

      {/* Static reply preview (no AI) */}
      {matched && !ai && (
        <p className="text-xs text-muted-foreground">
          This rule uses a static reply — no AI generation needed.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty + loading states
// ---------------------------------------------------------------------------

function EmptyRules({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl ig-gradient-soft text-primary">
        <Zap className="h-8 w-8" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">Create your first automation rule</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Rules let ReplyPilot reply instantly to common questions — based on keywords, DMs, comments or story replies. Higher rules take priority.
      </p>
      <Button className="mt-5 ig-gradient text-white hover:opacity-90" onClick={onNew}>
        <Plus className="h-4 w-4" /> New rule
      </Button>
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
