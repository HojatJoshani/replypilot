"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X, ChevronLeft, ChevronRight, Check, Send, RotateCcw, Loader2, Sparkles,
  MessageCircle, PartyPopper, Hand, DollarSign, Clock, Calendar, Package,
  AlertTriangle, Bot, Moon, Store, LayoutDashboard, ListChecks,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { SCENARIO_TEMPLATES, TONES } from "@/lib/constants";
import { t, toFa } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ConversationDto } from "@/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Icon mapping for scenario templates (constants reference icon by name).
type IconCmp = React.ComponentType<{ className?: string }>;
const TEMPLATE_ICONS: Record<string, IconCmp> = {
  Hand, DollarSign, Clock, Calendar, Package, AlertTriangle, Bot, Moon, Sparkles,
};

const EXAMPLE_CHIPS = ["سلام، قیمت چنده؟", "ساعت کاریتون؟", "سلام"];

const TOTAL_STEPS = 4;

interface OnboardingWizardProps {
  igAccountId: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface BusinessForm {
  businessName: string;
  tone: string;
  description: string;
}

type ChatPhase = "idle" | "sending" | "waiting" | "done" | "error";

interface ChatTurn {
  inbound: string;
  outbound: string | null;
  wasAi: boolean;
  ruleName: string | null;
}

export function OnboardingWizard({ igAccountId, onComplete, onSkip }: OnboardingWizardProps) {
  const setView = useAppStore((s) => s.setView);
  const [step, setStep] = useState(1);

  // Step 1 — business info
  const [business, setBusiness] = useState<BusinessForm>({
    businessName: "",
    tone: TONES[0].value,
    description: "",
  });
  const [step1Saving, setStep1Saving] = useState(false);

  // Step 2 — template selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step2Saving, setStep2Saving] = useState(false);

  // Step 3 — live test
  const [testInput, setTestInput] = useState("");
  const [chatPhase, setChatPhase] = useState<ChatPhase>("idle");
  const [chatTurn, setChatTurn] = useState<ChatTurn | null>(null);

  // ---- Escape to close ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const progress = useMemo(() => (step / TOTAL_STEPS) * 100, [step]);

  const canAdvance = useMemo(() => {
    if (step === 1) return business.businessName.trim().length > 0;
    return true;
  }, [step, business.businessName]);

  const goPrev = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
  }, []);

  // ---- Step 1: save business info, then advance ----
  async function saveAndAdvanceStep1() {
    if (!business.businessName.trim() || step1Saving) return;
    setStep1Saving(true);
    try {
      await api.put(`/api/ai-config/${igAccountId}`, {
        businessName: business.businessName.trim(),
        tone: business.tone,
        description: business.description.trim() || null,
      });
      toast.success("اطلاعات کسب‌وکار ذخیره شد 💛");
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره اطلاعات ممکن نشد");
    } finally {
      setStep1Saving(false);
    }
  }

  // ---- Step 2: apply templates, then advance ----
  async function applyTemplatesAndAdvance() {
    if (step2Saving) return;
    setStep2Saving(true);
    try {
      const ids = Array.from(selected);
      if (ids.length > 0) {
        await Promise.all(
          ids.map((id) =>
            api.post("/api/rules/template", { igAccountId, templateId: id }),
          ),
        );
        toast.success(`${toFa(ids.length)} سناریو اضافه شد ✨`);
      }
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "افزودن سناریو ممکن نشد");
    } finally {
      setStep2Saving(false);
    }
  }

  // ---- Step 3: send test message and poll for reply ----
  async function sendTestMessage(msg?: string) {
    const message = (msg ?? testInput).trim();
    if (!message || chatPhase === "sending" || chatPhase === "waiting") return;
    setTestInput("");
    setChatTurn({ inbound: message, outbound: null, wasAi: false, ruleName: null });
    setChatPhase("sending");
    try {
      await api.post<{ ok: boolean; eventId: string }>("/api/instagram/simulate", {
        accountId: igAccountId,
        channel: "dm",
        message,
      });
      setChatPhase("waiting");
      // Poll for the reply (give the worker ~2s, then a few short polls).
      let found: ConversationDto | null = null;
      await new Promise((r) => setTimeout(r, 2000));
      for (let i = 0; i < 5; i++) {
        const res = await api.get<{ conversations: ConversationDto[]; total: number }>(
          "/api/conversations?limit=5",
        );
        const match = res.conversations.find((c) => c.inboundMessage === message);
        if (match && match.outboundMessage) {
          found = match;
          break;
        }
        if (i < 4) await new Promise((r) => setTimeout(r, 1200));
      }
      if (found) {
        setChatTurn({
          inbound: found.inboundMessage,
          outbound: found.outboundMessage,
          wasAi: found.wasAiGenerated,
          ruleName: found.matchedRuleName ?? null,
        });
        setChatPhase("done");
        toast.success(t.onboarding.step3Reply);
      } else {
        setChatPhase("error");
        toast.error("پاسخی در زمان مورد انتظار دریافت نشد — دوباره امتحان کنید");
      }
    } catch (e) {
      setChatPhase("error");
      toast.error(e instanceof Error ? e.message : "ارسال پیام تست ممکن نشد");
    }
  }

  function resetTest() {
    setChatTurn(null);
    setChatPhase("idle");
    setTestInput("");
  }

  function handleNext() {
    if (step === 1) {
      void saveAndAdvanceStep1();
    } else if (step === 2) {
      void applyTemplatesAndAdvance();
    } else if (step === 3) {
      setStep(4);
    }
  }

  function handleGoRules() {
    setView("rules");
    onSkip();
  }

  const nextBusy = (step === 1 && step1Saving) || (step === 2 && step2Saving);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.onboarding.title}
    >
      <Card className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden p-0 shadow-2xl">
        {/* ---- Header (ig-gradient) ---- */}
        <div className="ig-gradient relative px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-white/80 sm:text-xs">
                {t.onboarding.welcome}
              </p>
              <h2 className="mt-1 text-lg font-bold leading-snug sm:text-xl">
                {t.onboarding.title}
              </h2>
              <p className="mt-1 text-xs text-white/85 sm:text-sm">
                {t.onboarding.subtitle}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              aria-label={t.common.close}
              className="shrink-0 text-white hover:bg-white/20 hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-3">
            <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
              {t.onboarding.step} {toFa(step)} {t.onboarding.of} {toFa(TOTAL_STEPS)}
            </span>
            <Progress value={progress} className="h-1.5 bg-white/25" />
          </div>
        </div>

        {/* ---- Body (scrollable) ---- */}
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7">
          {step === 1 && (
            <Step1Body
              business={business}
              onChange={setBusiness}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2Body
              selected={selected}
              onToggle={(id) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3Body
              input={testInput}
              onInputChange={setTestInput}
              onSend={(m) => void sendTestMessage(m)}
              onReset={resetTest}
              phase={chatPhase}
              turn={chatTurn}
            />
          )}
          {step === 4 && (
            <Step4Body onGoDashboard={onComplete} onGoRules={handleGoRules} />
          )}
        </div>

        {/* ---- Footer navigation (hidden on step 4) ---- */}
        {step < 4 && (
          <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-5 py-3.5 sm:px-7">
            <Button
              variant="ghost"
              onClick={goPrev}
              disabled={step === 1 || nextBusy}
              className="gap-1.5"
              aria-label={t.common.previous}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="hidden sm:inline">{t.common.previous}</span>
            </Button>

            <span className="text-xs text-muted-foreground" aria-live="polite">
              {toFa(step)} / {toFa(TOTAL_STEPS)}
            </span>

            <Button
              onClick={handleNext}
              disabled={!canAdvance || nextBusy}
              className="ig-gradient gap-1.5 text-white hover:opacity-90"
              aria-label={t.common.next}
            >
              {nextBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>{t.common.next}</span>
              )}
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// Step 1 — Business info
function Step1Body({
  business,
  onChange,
  onSkip,
}: {
  business: BusinessForm;
  onChange: (next: BusinessForm) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<Store className="h-5 w-5" />}
        title={t.onboarding.step1Title}
        desc={t.onboarding.step1Desc}
      />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ob-business-name">{t.onboarding.step1BusinessName}</Label>
          <Input
            id="ob-business-name"
            value={business.businessName}
            onChange={(e) => onChange({ ...business, businessName: e.target.value })}
            placeholder={t.onboarding.step1BusinessNamePlaceholder}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-tone">{t.onboarding.step1Tone}</Label>
          <Select
            value={business.tone}
            onValueChange={(v) => onChange({ ...business, tone: v })}
          >
            <SelectTrigger id="ob-tone" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tn) => (
                <SelectItem key={tn.value} value={tn.value}>
                  {tn.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-desc">{t.onboarding.step1Description}</Label>
          <Textarea
            id="ob-desc"
            value={business.description}
            onChange={(e) => onChange({ ...business, description: e.target.value })}
            placeholder={t.onboarding.step1DescriptionPlaceholder}
            rows={4}
            className="resize-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {t.onboarding.step1Skip}
      </button>
    </div>
  );
}

// Step 2 — Pick templates
function Step2Body({
  selected,
  onToggle,
  onSkip,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={<ListChecks className="h-5 w-5" />}
        title={t.onboarding.step2Title}
        desc={t.onboarding.step2Desc}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SCENARIO_TEMPLATES.map((tpl) => {
          const Icon = TEMPLATE_ICONS[tpl.icon] ?? Sparkles;
          const isSelected = selected.has(tpl.id);
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onToggle(tpl.id)}
              aria-pressed={isSelected}
              className={cn(
                "group relative flex flex-col gap-2 rounded-xl border p-3.5 text-start transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                    tpl.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{tpl.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {tpl.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-background/60 text-[10px]">
                  {tpl.category}
                </Badge>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                    isSelected
                      ? "ig-gradient border-transparent text-white"
                      : "border-muted-foreground/30 text-transparent",
                  )}
                  aria-hidden
                >
                  <Check className="h-3 w-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t.common.skipForNow}
        </button>
        <Badge
          variant="secondary"
          className="gap-1 bg-primary/10 text-primary"
          aria-live="polite"
        >
          <Check className="h-3 w-3" />
          {toFa(selected.size)} {t.onboarding.step2Selected}
        </Badge>
      </div>
    </div>
  );
}

// Step 3 — Live test
function Step3Body({
  input,
  onInputChange,
  onSend,
  onReset,
  phase,
  turn,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSend: (msg?: string) => void;
  onReset: () => void;
  phase: ChatPhase;
  turn: ChatTurn | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = phase === "sending" || phase === "waiting";
  const hasResult = phase === "done" || (phase === "error" && turn !== null);

  useEffect(() => {
    if (phase === "idle" || phase === "done" || phase === "error") {
      inputRef.current?.focus();
    }
  }, [phase]);

  return (
    <div className="space-y-5">
      <StepHeader
        icon={<MessageCircle className="h-5 w-5" />}
        title={t.onboarding.step3Title}
        desc={t.onboarding.step3Desc}
      />

      {/* Chat surface */}
      <div className="ig-gradient-soft min-h-[200px] rounded-2xl border border-border/60 p-4">
        {!turn && phase === "idle" && (
          <div className="flex h-[170px] flex-col items-center justify-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              یک پیام شبیه‌سازی‌شده بفرستید تا ببینید آریا چطور پاسخ می‌دهد.
            </p>
          </div>
        )}

        {turn && (
          <div className="space-y-2.5">
            {/* Inbound (customer) — right in RTL */}
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-sm shadow-sm">
                <p className="whitespace-pre-wrap break-words">{turn.inbound}</p>
                <div className="mt-1 text-start text-[10px] text-muted-foreground">
                  {t.inbox.customer}
                </div>
              </div>
            </div>

            {/* Outbound (bot) — left in RTL */}
            {turn.outbound && (
              <div className="flex justify-end">
                <div className="max-w-[80%]">
                  <div className="rounded-2xl rounded-bl-md ig-gradient px-3.5 py-2 text-sm text-white shadow-sm">
                    <p className="whitespace-pre-wrap break-words">{turn.outbound}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-start text-[10px] text-white/80">
                      {turn.wasAi ? (
                        <>
                          <Sparkles className="h-2.5 w-2.5" />
                          {t.inbox.aiReply}
                        </>
                      ) : (
                        <>
                          <Bot className="h-2.5 w-2.5" />
                          {t.inbox.ruleReply}
                        </>
                      )}
                    </div>
                  </div>
                  {turn.ruleName && (
                    <p className="mt-1 text-end text-[10px] text-muted-foreground">
                      {turn.ruleName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Waiting spinner */}
            {isBusy && (
              <div className="flex justify-end">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md ig-gradient px-3.5 py-2.5 text-sm text-white shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{t.onboarding.step3Waiting}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Example chips — shown only before first send or after reset */}
      {!hasResult && phase !== "waiting" && phase !== "sending" && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isBusy}
              onClick={() => {
                onInputChange(chip);
                onSend(chip);
              }}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) onSend();
        }}
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="پیام مشتری را اینجا بنویسید…"
          disabled={isBusy}
          aria-label={t.onboarding.step3Send}
        />
        {hasResult ? (
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="gap-1.5 shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t.onboarding.step3TryAgain}</span>
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="ig-gradient gap-1.5 shrink-0 text-white hover:opacity-90"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t.onboarding.step3Send}</span>
          </Button>
        )}
      </form>
    </div>
  );
}

// Step 4 — Done
function Step4Body({
  onGoDashboard,
  onGoRules,
}: {
  onGoDashboard: () => void;
  onGoRules: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-6 text-center">
      <div className="relative">
        <div className="ig-gradient flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-lg">
          <PartyPopper className="h-10 w-10" />
        </div>
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-base shadow">
          🎉
        </span>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
          {t.onboarding.step4Title}
        </h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t.onboarding.step4Desc}
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2.5 pt-2 sm:flex-row sm:justify-center">
        <Button
          onClick={onGoDashboard}
          className="ig-gradient gap-2 text-white hover:opacity-90 sm:flex-1"
        >
          <LayoutDashboard className="h-4 w-4" />
          {t.onboarding.step4GoDashboard}
        </Button>
        <Button
          onClick={onGoRules}
          variant="outline"
          className="gap-2 sm:flex-1"
        >
          <ListChecks className="h-4 w-4" />
          {t.onboarding.step4GoRules}
        </Button>
      </div>
    </div>
  );
}

// Shared step header
function StepHeader({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="ig-gradient-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold leading-tight sm:text-lg">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{desc}</p>
      </div>
    </div>
  );
}
