"use client";

import { useMemo, useState } from "react";
import {
  Info,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Save,
  RotateCcw,
  Bot,
  MessageSquare,
  Clock,
  Tag,
  ShoppingCart,
  HelpCircle,
  Settings2,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { useAppStore } from "@/lib/store";
import { TONES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AiConfigDto } from "@/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FaqRow {
  q: string;
  a: string;
}

interface AiFormState {
  businessName: string;
  tone: string;
  description: string;
  products: string;
  services: string;
  faqs: FaqRow[];
  pricingVisible: boolean;
  pricingNote: string;
  purchaseLink: string;
  workingHours: string;
  specialRules: string;
  aiFallbackEnabled: boolean;
}

interface SaveBody {
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

interface FormSnapshot {
  form: AiFormState;
  snapshot: string;
}

function emptyForm(): AiFormState {
  return {
    businessName: "",
    tone: "friendly",
    description: "",
    products: "",
    services: "",
    faqs: [],
    pricingVisible: false,
    pricingNote: "",
    purchaseLink: "",
    workingHours: "",
    specialRules: "",
    aiFallbackEnabled: true,
  };
}

function parseFaqs(raw: string | null): FaqRow[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (x): x is FaqRow =>
          !!x &&
          typeof x === "object" &&
          typeof (x as FaqRow).q === "string" &&
          typeof (x as FaqRow).a === "string",
      )
      .map((x) => ({ q: x.q, a: x.a }));
  } catch {
    return [];
  }
}

function formFromConfig(c: AiConfigDto): AiFormState {
  return {
    businessName: c.businessName || "",
    tone: c.tone || "friendly",
    description: c.description || "",
    products: c.products || "",
    services: c.services || "",
    faqs: parseFaqs(c.faqs),
    pricingVisible: c.pricingVisible,
    pricingNote: c.pricingNote || "",
    purchaseLink: c.purchaseLink || "",
    workingHours: c.workingHours || "",
    specialRules: c.specialRules || "",
    aiFallbackEnabled: c.aiFallbackEnabled,
  };
}

function serializeForm(f: AiFormState): string {
  return JSON.stringify(f);
}

function buildSaveBody(form: AiFormState): SaveBody {
  return {
    businessName: form.businessName.trim() || null,
    tone: form.tone,
    description: form.description.trim() || null,
    products: form.products.trim() || null,
    services: form.services.trim() || null,
    faqs: form.faqs.length
      ? JSON.stringify(form.faqs.filter((r) => r.q.trim() || r.a.trim()))
      : null,
    pricingVisible: form.pricingVisible,
    pricingNote: form.pricingNote.trim() || null,
    purchaseLink: form.purchaseLink.trim() || null,
    workingHours: form.workingHours.trim() || null,
    specialRules: form.specialRules.trim() || null,
    aiFallbackEnabled: form.aiFallbackEnabled,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function AiConfigView() {
  const { selectedAccountId } = useAppStore();
  if (!selectedAccountId) return <ConnectAccountEmptyState />;
  return <AiConfigViewContent key={selectedAccountId} igAccountId={selectedAccountId} />;
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
        <h2 className="mt-6 text-xl font-semibold">Connect Instagram to train your AI</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          The AI assistant is configured per Instagram account. Connect an account to provide your business context.
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

function AiConfigViewContent({ igAccountId }: { igAccountId: string }) {
  const configKey = useMemo(() => ["ai-config", igAccountId] as const, [igAccountId]);
  const { data, isLoading, isError, error, refetch } = useApi<{ config: AiConfigDto }>(
    [...configKey],
    `/api/ai-config/${igAccountId}`,
  );

  const saveMut = useApiMutation<SaveBody, { config: AiConfigDto }>(
    "PUT",
    () => `/api/ai-config/${igAccountId}`,
    [[...configKey]],
  );

  const config = data?.config;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-28">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Train your AI on your business. This context shapes every AI-generated reply.
        </p>
      </div>

      {/* Info alert */}
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-foreground">We build the prompt, you provide the context</AlertTitle>
        <AlertDescription>
          ReplyPilot builds a safe, consistent system prompt from this form — you configure your business
          context, we handle the rest. You cannot edit the raw prompt, by design. This keeps every reply
          on-brand and prevents prompt leakage.
        </AlertDescription>
      </Alert>

      {/* Body */}
      {isLoading ? (
        <AiConfigSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not load AI config</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Something went wrong."}{" "}
            <button className="underline underline-offset-2 font-medium" onClick={() => refetch()}>
              Try again
            </button>
          </AlertDescription>
        </Alert>
      ) : (
        // Remount whenever the upstream record changes so the form reseeds cleanly.
        <AiConfigWorkspace
          key={config?.updatedAt ?? "empty"}
          config={config}
          igAccountId={igAccountId}
          saving={saveMut.isPending}
          save={saveMut.mutateAsync}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace (form + live preview). Remounts on config change.
// ---------------------------------------------------------------------------

function AiConfigWorkspace({
  config,
  igAccountId,
  saving,
  save,
}: {
  config: AiConfigDto | undefined;
  igAccountId: string;
  saving: boolean;
  save: (body: SaveBody) => Promise<{ config: AiConfigDto }>;
}) {
  const [{ form, snapshot }, setState] = useState<FormSnapshot>(() => {
    const f = config ? formFromConfig(config) : emptyForm();
    return { form: f, snapshot: serializeForm(f) };
  });

  const isDirty = serializeForm(form) !== snapshot;

  function set<K extends keyof AiFormState>(key: K, value: AiFormState[K]) {
    setState((s) => ({ ...s, form: { ...s.form, [key]: value } }));
  }

  function addFaq() {
    setState((s) => ({ ...s, form: { ...s.form, faqs: [...s.form.faqs, { q: "", a: "" }] } }));
  }
  function updateFaq(index: number, field: "q" | "a", value: string) {
    setState((s) => ({
      ...s,
      form: {
        ...s.form,
        faqs: s.form.faqs.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
      },
    }));
  }
  function removeFaq(index: number) {
    setState((s) => ({ ...s, form: { ...s.form, faqs: s.form.faqs.filter((_, i) => i !== index) } }));
  }

  async function handleSave() {
    try {
      await save(buildSaveBody(form));
      // Mark clean instantly (the upstream refetch will also remount this component).
      setState((s) => ({ ...s, snapshot: serializeForm(s.form) }));
      toast.success("AI assistant updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save AI config");
    }
  }

  function handleDiscard() {
    setState((s) => ({ ...s, form: JSON.parse(s.snapshot) as AiFormState }));
    toast("Changes discarded");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Form column */}
      <div className="space-y-6">
        {/* Basics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg ig-gradient-soft text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Basics</CardTitle>
                <CardDescription>Who you are and how you sound.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="biz-name">Business name</Label>
                <Input
                  id="biz-name"
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="Glow Skin Studio"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="biz-tone">Tone</Label>
                <Select value={form.tone} onValueChange={(v) => set("tone", v)}>
                  <SelectTrigger id="biz-tone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="biz-desc">What does your business do?</Label>
              <Textarea
                id="biz-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A skincare studio offering facials, chemical peels, and a line of cruelty-free products. We help clients build glowing, healthy skin."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Products & Services */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg ig-gradient-soft text-primary">
                <Tag className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Products & Services</CardTitle>
                <CardDescription>One per line. Suggested format: Name (price).</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="biz-products">Products</Label>
              <Textarea
                id="biz-products"
                value={form.products}
                onChange={(e) => set("products", e.target.value)}
                placeholder={"Vitamin C Serum (450k Toman)\nHydrating Cream (380k Toman)\nSPF 50 (520k Toman)"}
                rows={5}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="biz-services">Services</Label>
              <Textarea
                id="biz-services"
                value={form.services}
                onChange={(e) => set("services", e.target.value)}
                placeholder={"Signature Facial (1.2m Toman)\nChemical Peel (900k Toman)\nConsultation (free)"}
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg ig-gradient-soft text-primary">
                <HelpCircle className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Frequently asked questions</CardTitle>
                <CardDescription>The AI will use these to answer common questions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.faqs.length === 0 && (
              <p className="text-sm text-muted-foreground">No FAQs yet. Add a few common questions.</p>
            )}
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
              {form.faqs.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <Input
                    value={row.q}
                    onChange={(e) => updateFaq(i, "q", e.target.value)}
                    placeholder="Question"
                    aria-label={`FAQ ${i + 1} question`}
                    className="sm:flex-1"
                  />
                  <Input
                    value={row.a}
                    onChange={(e) => updateFaq(i, "a", e.target.value)}
                    placeholder="Answer"
                    aria-label={`FAQ ${i + 1} answer`}
                    className="sm:flex-[1.4]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeFaq(i)}
                    aria-label={`Remove FAQ ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addFaq}>
              <Plus className="h-4 w-4" /> Add FAQ
            </Button>
          </CardContent>
        </Card>

        {/* Pricing & Checkout */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg ig-gradient-soft text-primary">
                <ShoppingCart className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Pricing & Checkout</CardTitle>
                <CardDescription>Control how the AI talks about prices.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="pricing-visible" className="cursor-pointer">Show prices to customers</Label>
                <p className="text-xs text-muted-foreground">
                  When off, the AI will ask customers to DM for pricing.
                </p>
              </div>
              <Switch
                id="pricing-visible"
                checked={form.pricingVisible}
                onCheckedChange={(v) => set("pricingVisible", v)}
              />
            </div>
            {form.pricingVisible && (
              <div className="space-y-1.5">
                <Label htmlFor="pricing-note">Pricing note</Label>
                <Input
                  id="pricing-note"
                  value={form.pricingNote}
                  onChange={(e) => set("pricingNote", e.target.value)}
                  placeholder="Prices in Toman"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="purchase-link">Purchase / booking link</Label>
              <Input
                id="purchase-link"
                value={form.purchaseLink}
                onChange={(e) => set("purchaseLink", e.target.value)}
                placeholder="https://glowstudio.com/order"
              />
              <p className="text-xs text-muted-foreground">
                The AI can share this when a customer is ready to buy or book.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg ig-gradient-soft text-primary">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Availability</CardTitle>
                <CardDescription>When you're open and reachable.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Label htmlFor="working-hours">Working hours</Label>
            <Input
              id="working-hours"
              value={form.workingHours}
              onChange={(e) => set("workingHours", e.target.value)}
              placeholder="Sat–Thu 10:00–20:00 (closed Fridays)"
            />
            <p className="text-xs text-muted-foreground">
              The AI will mention these when customers ask about timing.
            </p>
          </CardContent>
        </Card>

        {/* Special rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg ig-gradient-soft text-primary">
                <Settings2 className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">Special rules & guardrails</CardTitle>
                <CardDescription>Hard limits the AI must respect.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="special-rules">Special rules</Label>
              <Textarea
                id="special-rules"
                value={form.specialRules}
                onChange={(e) => set("specialRules", e.target.value)}
                placeholder={"e.g. Escalate medical questions. Never offer discounts beyond 10%. Always confirm booking by phone."}
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="ai-fallback" className="cursor-pointer">Let AI handle unmatched messages</Label>
                <p className="text-xs text-muted-foreground">
                  When no automation rule matches, the AI will craft a reply using this context.
                </p>
              </div>
              <Switch
                id="ai-fallback"
                checked={form.aiFallbackEnabled}
                onCheckedChange={(v) => set("aiFallbackEnabled", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview column */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <LivePreview igAccountId={igAccountId} aiFallbackEnabled={form.aiFallbackEnabled} />
      </div>

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0">
          <div className="flex items-center gap-3 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
            <span className="hidden sm:inline text-sm text-muted-foreground">Unsaved changes</span>
            <span className="sm:hidden text-sm text-muted-foreground">Unsaved</span>
            <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5" /> Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="ig-gradient text-white hover:opacity-90">
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live preview
// ---------------------------------------------------------------------------

const SAMPLE_MESSAGES = [
  "Hi, how much is the Vitamin C Serum?",
  "Do you ship to Tehran?",
  "What are your working hours?",
];

function LivePreview({
  igAccountId,
  aiFallbackEnabled,
}: {
  igAccountId: string;
  aiFallbackEnabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(msg?: string) {
    const text = (msg ?? message).trim();
    if (!text) return;
    setMessage(text);
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<PreviewResult>("/api/rules/preview", {
        igAccountId,
        message: text,
        channel: "dm",
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg ig-gradient text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-base">Live preview</CardTitle>
            <CardDescription>See how your context shapes replies.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sample chips */}
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_MESSAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => run(s)}
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs hover:bg-accent transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Chat input */}
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run();
              }
            }}
            placeholder="Simulate a customer message…"
            aria-label="Simulate a customer message"
          />
          <Button
            size="icon"
            onClick={() => run()}
            disabled={loading || !message.trim()}
            className="ig-gradient text-white hover:opacity-90 shrink-0"
            aria-label="Send test message"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Result */}
        <PreviewChat result={result} loading={loading} message={message.trim()} aiFallbackEnabled={aiFallbackEnabled} />
      </CardContent>
    </Card>
  );
}

function PreviewChat({
  result,
  loading,
  message,
  aiFallbackEnabled,
}: {
  result: PreviewResult | null;
  loading: boolean;
  message: string;
  aiFallbackEnabled: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        Send a message to preview how your AI assistant will reply.
      </div>
    );
  }

  const matched = result.matchedRule;
  const ai = result.aiPreview;

  return (
    <div className="space-y-2">
      {/* Status line */}
      {matched ? (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant="secondary" className="gap-1">
            <MessageSquare className="h-3 w-3" /> Rule: {matched.name}
          </Badge>
          {matched.responseType === "ai_generated" && (
            <Badge className="gap-1 ig-gradient text-white border-transparent text-[10px]">
              <Sparkles className="h-3 w-3" /> AI
            </Badge>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs">
          {result.aiFallback || aiFallbackEnabled ? (
            <Badge className="gap-1 ig-gradient text-white border-transparent">
              <Bot className="h-3 w-3" /> AI fallback
            </Badge>
          ) : (
            <Badge variant="secondary">No rule · fallback off</Badge>
          )}
        </div>
      )}

      {/* Chat bubbles */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-3 py-2 text-sm">
          {message || "Customer message"}
        </div>
      </div>
      {ai ? (
        <div className="space-y-1.5">
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm ig-gradient px-3 py-2 text-sm text-white whitespace-pre-wrap">
              {ai.reply}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
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
            {ai.suggestedAction && (
              <span className="text-[10px] text-muted-foreground">
                → {ai.suggestedAction}
              </span>
            )}
          </div>
        </div>
      ) : matched ? (
        <div className="flex justify-start">
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground italic">
            This rule uses a static reply — no AI generation.
          </div>
        </div>
      ) : (
        <div className="flex justify-start">
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground italic">
            {aiFallbackEnabled
              ? "The AI is thinking… try again in a moment."
              : "Enable AI fallback above to generate a reply."}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function AiConfigSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-28 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
