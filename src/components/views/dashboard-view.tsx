"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  Workflow,
  MessageSquare,
  History,
  Sparkles,
  AlertCircle,
  UserPlus,
  Gauge,
  ArrowLeft,
  MessageCircle,
  RefreshCw,
  Send,
  TrendingUp,
  Zap,
  Inbox as InboxIcon,
  Bot,
  UsersRound,
  BarChart3,
  PlusCircle,
  CircleDot,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { useAppStore, type ViewId } from "@/lib/store";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/format";
import {
  t,
  faCompact,
  faNumber,
  toFa,
  faTimeAgo,
  faTimeUntil,
} from "@/lib/i18n";
import { CHANNELS, PLANS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ConversationDto, DashboardStatsDto } from "@/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function channelLabel(channel: string): string {
  if (channel === "comment") return t.channels.comment;
  if (channel === "story") return t.channels.story;
  return t.channels.dm;
}

/* ------------------------------------------------------------------ */
/* Empty state — no Instagram account connected yet                   */
/* ------------------------------------------------------------------ */

function NoAccountEmptyState() {
  const [connecting, setConnecting] = useState(false);
  async function connect() {
    setConnecting(true);
    try {
      const { url } = await api.get<{ url: string }>(
        "/api/instagram/oauth/start",
      );
      window.location.href = url;
    } catch {
      toast.error("اتصال اینستاگرام آغاز نشد. دوباره امتحان کنید.");
      setConnecting(false);
    }
  }
  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-xl">
        <Card className="overflow-hidden border-none shadow-lg">
          <div className="ig-gradient px-6 py-10 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {t.dashboard.noAccount}
            </h2>
            <p className="mt-2 text-sm text-white/90">
              {t.dashboard.noAccountDesc}
            </p>
          </div>
          <CardContent className="px-6 pt-6">
            <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                پاسخ خودکار به سؤالات متداول در چند ثانیه — حتی وقتی خوابید.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ثبت خودکار سرنخ از کامنت‌ها و دایرکت‌های شما.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ارجاع گفتگوهای حساس به صندوق پیام تیم شما.
              </li>
            </ul>
            <Button
              onClick={connect}
              disabled={connecting}
              className="ig-gradient w-full text-white hover:opacity-95"
              size="lg"
            >
              {connecting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  در حال اتصال…
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  {t.dashboard.connectInstagram}
                </>
              )}
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              حالت دمو — هیچ دسترسی واقعی متا لازم نیست.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KPI card                                                           */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "rose" | "amber" | "emerald" | "violet" | "sky" | "primary";
  hint?: string;
  loading?: boolean;
}

const ACCENT_STYLES: Record<
  NonNullable<KpiCardProps["accent"]>,
  { iconBg: string; iconColor: string; bar: string }
> = {
  rose: { iconBg: "bg-rose-500/10", iconColor: "text-rose-500", bar: "bg-rose-500" },
  amber: { iconBg: "bg-amber-500/10", iconColor: "text-amber-500", bar: "bg-amber-500" },
  emerald: { iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", bar: "bg-emerald-500" },
  violet: { iconBg: "bg-violet-500/10", iconColor: "text-violet-500", bar: "bg-violet-500" },
  sky: { iconBg: "bg-sky-500/10", iconColor: "text-sky-500", bar: "bg-sky-500" },
  primary: { iconBg: "bg-primary/10", iconColor: "text-primary", bar: "bg-primary" },
};

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  hint,
  loading,
}: KpiCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {label}
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <div
                dir="ltr"
                className="mt-1 truncate text-2xl font-bold tracking-tight"
              >
                {value}
              </div>
            )}
            {hint && !loading && (
              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                {hint}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              s.iconBg,
            )}
          >
            <Icon className={cn("h-4 w-4", s.iconColor)} />
          </div>
        </div>
      </CardContent>
      <div className={cn("h-1 w-full", s.bar)} aria-hidden />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Channel icon helper                                                */
/* ------------------------------------------------------------------ */

function ChannelIcon({
  channel,
  className,
}: {
  channel: string;
  className?: string;
}) {
  if (channel === "comment") return <MessageSquare className={className} />;
  if (channel === "story") return <Sparkles className={className} />;
  return <MessageCircle className={className} />;
}

/* ------------------------------------------------------------------ */
/* Account health row                                                 */
/* ------------------------------------------------------------------ */

function accountStatusMeta(status: string) {
  if (status === "active")
    return { dot: "bg-emerald-500", label: t.dashboard.connected, color: "text-emerald-600" };
  if (status === "expired")
    return { dot: "bg-amber-500", label: t.dashboard.expired, color: "text-amber-600" };
  return { dot: "bg-muted-foreground", label: "قطع‌شده", color: "text-muted-foreground" };
}

function AccountHealthCard({
  health,
  loading,
}: {
  health: DashboardStatsDto["accountHealth"];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CircleDot className="h-4 w-4 text-primary" />
          {t.dashboard.accountHealth}
        </CardTitle>
        <CardDescription>{t.dashboard.accountHealthDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : health.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            هنوز حسابی متصل نشده است.
          </div>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto scrollbar-thin">
            {health.map((a) => {
              const meta = accountStatusMeta(a.status);
              const renewingSoon =
                a.status === "active" && a.tokenExpiresAt
                  ? new Date(a.tokenExpiresAt).getTime() - Date.now() <=
                    7 * 24 * 60 * 60 * 1000
                  : false;
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50"
                >
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
                  <span className="flex-1 truncate text-sm font-medium" dir="ltr">
                    @{a.username}
                  </span>
                  {renewingSoon && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    >
                      {t.dashboard.renewingSoon}
                    </Badge>
                  )}
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {a.tokenExpiresAt ? faTimeUntil(a.tokenExpiresAt) : "بدون انقضا"}
                  </span>
                  <span className={cn("text-xs font-medium", meta.color)}>
                    {meta.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Recent conversations preview                                       */
/* ------------------------------------------------------------------ */

function RecentConversationsCard({
  conversations,
  loading,
  onViewAll,
}: {
  conversations: ConversationDto[];
  loading: boolean;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <InboxIcon className="h-4 w-4 text-primary" />
              {t.dashboard.recentConversations}
            </CardTitle>
            <CardDescription>
              آخرین ۵ رویداد ورودی پردازش‌شده.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="shrink-0">
            {t.common.viewAll}
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">{t.inbox.noConversations}</p>
            <p className="text-xs text-muted-foreground">
              دایرکت‌ها، کامنت‌ها و ریپلای استوری‌های جدید اینجا نمایش داده می‌شوند.
            </p>
          </div>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto scrollbar-thin">
            {conversations.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-accent/50"
              >
                <Avatar className="mt-0.5 h-9 w-9">
                  <AvatarFallback className="ig-gradient-soft text-xs font-semibold">
                    {initials(c.contactUsername || c.contactIgId)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium" dir="ltr">
                      {c.contactUsername ? `@${c.contactUsername}` : "ناشناس"}
                    </span>
                    <ChannelIcon
                      channel={c.channel}
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    />
                    {c.escalated && (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                      >
                        <AlertCircle className="h-3 w-3" />
                        {t.convoStatus.escalated}
                      </Badge>
                    )}
                    <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">
                      {faTimeAgo(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {c.inboundMessage}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    {c.wasAiGenerated ? (
                      <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                        <Sparkles className="h-3 w-3" />
                        {t.inbox.aiReply}
                      </Badge>
                    ) : c.matchedRuleName ? (
                      <Badge variant="secondary" className="gap-1">
                        <Workflow className="h-3 w-3" />
                        {c.matchedRuleName}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t.convoStatus.auto}</Badge>
                    )}
                    {c.intent && (
                      <span className="text-[10px] tracking-wide text-muted-foreground">
                        {intentLabelShort(c.intent)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Map a raw intent value to its Persian label. */
function intentLabelShort(intent: string): string {
  const map = t.intents as Record<string, string>;
  return map[intent] || intent;
}

/* ------------------------------------------------------------------ */
/* Simulate inbound widget — the wow-factor feature                   */
/* ------------------------------------------------------------------ */

const EXAMPLE_CHIPS = [
  "سلام، قیمت سرم ویتامین سی چنده؟",
  "ساعات کاری شما؟",
  "می‌خوام وجه رو پس بگیرم",
  "ارسال بین‌المللی دارید؟",
  "می‌تونم نوبت بگیرم؟",
];

interface SimulateResult {
  conversation: ConversationDto;
  at: number;
}

function SimulateInboundCard({ accountId }: { accountId: string }) {
  const [channel, setChannel] = useState<"dm" | "comment" | "story">("dm");
  const [message, setMessage] = useState(EXAMPLE_CHIPS[0]);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState<SimulateResult | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up the poll timer on unmount.
  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  const simulate = useApiMutation<
    { accountId: string; channel: string; message: string; fromUsername?: string },
    { ok: boolean; eventId: string }
  >("POST", () => "/api/instagram/simulate", []);

  async function handleSend() {
    if (!message.trim()) {
      toast.error("یک پیام برای شبیه‌سازی بنویسید.");
      return;
    }
    setResult(null);
    setPolling(true);
    try {
      await simulate.mutateAsync({
        accountId,
        channel,
        message: message.trim(),
      });
      toast.success(t.dashboard.running);
      // Give the queue/worker a beat to process the event, then refetch.
      pollTimer.current = setTimeout(async () => {
        try {
          const data = await api.get<{ conversations: ConversationDto[] }>(
            "/api/conversations?limit=1",
          );
          if (data.conversations[0]) {
            setResult({ conversation: data.conversations[0], at: Date.now() });
          }
        } catch {
          /* swallow */
        } finally {
          setPolling(false);
        }
      }, 1500);
    } catch (err) {
      setPolling(false);
      const msg = err instanceof Error ? err.message : "شبیه‌سازی ناموفق بود";
      toast.error(msg);
    }
  }

  const busy = simulate.isPending || polling;

  return (
    <Card className="overflow-hidden">
      <div className="ig-gradient px-6 py-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎬</span>
          <div>
            <CardTitle className="text-base text-white">
              {t.dashboard.tryLive}
            </CardTitle>
            <p className="text-xs text-white/85">{t.dashboard.tryLiveDesc}</p>
          </div>
        </div>
      </div>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="sim-channel">
              {t.dashboard.channel}
            </label>
            <Select
              value={channel}
              onValueChange={(v) => setChannel(v as typeof channel)}
            >
              <SelectTrigger id="sim-channel" className="w-full">
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
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="sim-message">
              {t.dashboard.message}
            </label>
            <Input
              id="sim-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="پیامی که یک مشتری ممکن است بفرستد…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) handleSend();
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setMessage(chip)}
              className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {chip}
            </button>
          ))}
        </div>

        <Button
          onClick={handleSend}
          disabled={busy || !message.trim()}
          className="ig-gradient w-full text-white hover:opacity-95"
        >
          {busy ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              {simulate.isPending ? "در حال تزریق…" : "در حال مشاهده خودکارسازی…"}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t.dashboard.sendWatch}
            </>
          )}
        </Button>

        {/* Result panel */}
        {result && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">خودکارسازی پاسخ داد</span>
              <span className="ms-auto text-[11px] text-muted-foreground">
                {faTimeAgo(new Date(result.at))}
              </span>
            </div>
            <ConversationBubble conversation={result.conversation} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* A compact inbound → outbound bubble pair. */
function ConversationBubble({ conversation: c }: { conversation: ConversationDto }) {
  return (
    <div className="space-y-2">
      {/* Inbound — customer (start side in RTL = right) */}
      <div className="flex items-start gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="ig-gradient-soft text-[10px] font-semibold">
            {initials(c.contactUsername || c.contactIgId)}
          </AvatarFallback>
        </Avatar>
        <div className="max-w-[80%]">
          <div className="text-[10px] text-muted-foreground">
            {c.contactUsername ? (
              <span dir="ltr">@{c.contactUsername}</span>
            ) : (
              "ناشناس"
            )}{" "}
            · {channelLabel(c.channel)}
          </div>
          <div className="rounded-2xl rounded-ts-sm bg-background px-3 py-2 text-sm shadow-sm">
            {c.inboundMessage}
          </div>
        </div>
      </div>
      {/* Outbound — our reply (end side in RTL = left) */}
      {c.outboundMessage ? (
        <div className="flex items-start justify-end gap-2">
          <div className="max-w-[80%] text-start">
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              {c.wasAiGenerated ? (
                <>
                  <Sparkles className="h-3 w-3 text-primary" />
                  {t.dashboard.reply}
                </>
              ) : c.matchedRuleName ? (
                <>
                  <Workflow className="h-3 w-3" />
                  {c.matchedRuleName}
                </>
              ) : (
                t.brand
              )}
            </div>
            <div className="rounded-2xl rounded-te-sm ig-gradient px-3 py-2 text-start text-sm text-white shadow-sm">
              {c.outboundMessage}
            </div>
          </div>
          <Avatar className="h-7 w-7">
            <AvatarFallback className="ig-gradient text-[10px] font-semibold text-white">
              <Bot className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
        </div>
      ) : c.escalated ? (
        <div className="flex justify-end">
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <AlertCircle className="h-3 w-3" />
            به تیم شما ارجاع داده شد
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AI usage card                                                      */
/* ------------------------------------------------------------------ */

function AiUsageCard({
  used,
  limit,
  loading,
}: {
  used: number;
  limit: number;
  loading: boolean;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const healthy = pct < 80;
  const nearLimit = pct >= 80 && pct < 100;
  const unlimited = limit >= 999999;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-primary" />
          {t.dashboard.aiUsageTitle}
        </CardTitle>
        <CardDescription>{t.dashboard.aiUsageDesc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-40" />
          </>
        ) : (
          <>
            <Progress
              value={pct}
              className={cn(
                "h-2.5",
                healthy ? "" : "bg-amber-200/60 dark:bg-amber-900/40",
              )}
            />
            <div className="flex items-end justify-between">
              <div>
                <div
                  dir="ltr"
                  className="text-2xl font-bold tracking-tight"
                >
                  {faNumber(used)}{" "}
                  <span className="text-base font-medium text-muted-foreground">
                    / {unlimited ? "∞" : faNumber(limit)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {toFa(pct)}٪ از سهمیه ماهانه استفاده شد
                </div>
              </div>
              {nearLimit && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  {t.dashboard.approachingLimit}
                </Badge>
              )}
              {!healthy && !nearLimit && pct >= 100 && (
                <Badge variant="destructive">محدودیت تکمیل شد</Badge>
              )}
              {unlimited && (
                <Badge
                  variant="outline"
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  {t.dashboard.unlimited}
                </Badge>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions                                                      */
/* ------------------------------------------------------------------ */

function QuickActions({ onNavigate }: { onNavigate: (v: ViewId) => void }) {
  const actions = [
    { label: t.dashboard.newRule, icon: Workflow, view: "rules" as const },
    { label: t.dashboard.configAi, icon: Bot, view: "ai-config" as const },
    { label: t.dashboard.viewLeads, icon: UsersRound, view: "leads" as const },
    { label: t.dashboard.analytics, icon: BarChart3, view: "analytics" as const },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((a) => (
        <Button
          key={a.view}
          variant="outline"
          className="h-auto justify-start gap-2 py-3 text-sm"
          onClick={() => onNavigate(a.view)}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <a.icon className="h-4 w-4" />
          </span>
          {a.label}
        </Button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main DashboardView                                                 */
/* ------------------------------------------------------------------ */

export function DashboardView() {
  const selectedAccountId = useAppStore((s) => s.selectedAccountId);
  const setView = useAppStore((s) => s.setView);

  const stats = useApi<DashboardStatsDto>(
    ["dashboard-stats"],
    selectedAccountId ? "/api/dashboard/stats" : null,
  );
  const recent = useApi<{ conversations: ConversationDto[]; total: number }>(
    ["conversations", "recent", 5],
    selectedAccountId ? "/api/conversations?limit=5" : null,
  );

  const planLabel = useMemo(() => {
    const lim = stats.data?.aiRepliesLimit;
    const plan = PLANS.find((p) => p.limits.aiReplies === lim);
    return plan?.label ?? "فعلی";
  }, [stats.data?.aiRepliesLimit]);

  if (!selectedAccountId) return <NoAccountEmptyState />;

  const s = stats.data;
  const loading = stats.isLoading;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t.dashboard.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.dashboard.subtitle}</p>
      </header>

      {/* KPI grid */}
      <section
        aria-label="شاخص‌های کلیدی عملکرد"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        <KpiCard
          label={t.dashboard.kpi.accounts}
          value={s ? toFa(s.accounts) : toFa(0)}
          icon={Users}
          accent="primary"
          hint={t.dashboard.connected}
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.kpi.activeRules}
          value={s ? toFa(s.activeRules) : toFa(0)}
          icon={Workflow}
          accent="violet"
          hint="خودکارسازی فعال"
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.kpi.convToday}
          value={s ? faCompact(s.conversationsToday) : toFa(0)}
          icon={MessageSquare}
          accent="emerald"
          hint="از نیمه‌شب"
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.kpi.conv30d}
          value={s ? faCompact(s.conversations30d) : toFa(0)}
          icon={History}
          accent="sky"
          hint="۳۰ روز اخیر"
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.kpi.aiReplies30d}
          value={s ? faCompact(s.aiReplies30d) : toFa(0)}
          icon={Sparkles}
          accent="rose"
          hint="تولیدشده با GLM"
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.kpi.escalated}
          value={s ? toFa(s.escalatedOpen) : toFa(0)}
          icon={AlertCircle}
          accent="amber"
          hint="ارجاع‌های باز"
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.kpi.leadsNew}
          value={s ? toFa(s.leadsNew) : toFa(0)}
          icon={UserPlus}
          accent="emerald"
          hint="وضعیت: جدید"
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.kpi.aiUsage}
          value={
            s
              ? `${faNumber(s.aiRepliesUsed)}/${s.aiRepliesLimit >= 999999 ? "∞" : faNumber(s.aiRepliesLimit)}`
              : toFa(0)
          }
          icon={Zap}
          accent="primary"
          hint={`طرح ${planLabel}`}
          loading={loading}
        />
      </section>

      {/* AI usage + Account health */}
      <section className="grid gap-4 lg:grid-cols-2">
        <AiUsageCard
          used={s?.aiRepliesUsed ?? 0}
          limit={s?.aiRepliesLimit ?? 0}
          loading={loading}
        />
        <AccountHealthCard
          health={s?.accountHealth ?? []}
          loading={loading}
        />
      </section>

      {/* Simulate inbound + Recent conversations */}
      <section className="grid gap-4 lg:grid-cols-2">
        <SimulateInboundCard accountId={selectedAccountId} />
        <RecentConversationsCard
          conversations={recent.data?.conversations ?? []}
          loading={recent.isLoading}
          onViewAll={() => setView("inbox")}
        />
      </section>

      {/* Quick actions */}
      <section aria-label="اقدامات سریع">
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t.dashboard.quickActions}</h2>
        </div>
        <QuickActions onNavigate={setView} />
      </section>
    </div>
  );
}
