"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  MessagesSquare,
  Sparkles,
  Workflow,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Inbox,
  Tag,
  Zap,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { t, faNumber, faCompact, toFa } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { AnalyticsDto } from "@/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const CH_LIST = [
  { value: "dm", label: t.channels.dm },
  { value: "comment", label: t.channels.comment },
  { value: "story", label: t.channels.story },
] as const;

function intentLabel(intent: string): string {
  const map = t.intents as Record<string, string>;
  return map[intent] || intent;
}

const jalaliDayFmt = new Intl.DateTimeFormat("fa-IR", {
  month: "short",
  day: "numeric",
});

function fmtDay(d: string): string {
  try {
    return jalaliDayFmt.format(new Date(d));
  } catch {
    return d;
  }
}

/* ------------------------------------------------------------------ */
/* Empty state — no Instagram account connected                       */
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
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ig-gradient text-white">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">هنوز تحلیلی موجود نیست</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          برای جمع‌آوری داده‌های گفتگو و مشاهده تحلیل‌های غنی، یک حساب
          اینستاگرام متصل کنید.
        </p>
        <Button
          onClick={connect}
          disabled={connecting}
          className="ig-gradient mt-5 text-white hover:opacity-95"
        >
          {t.dashboard.connectInstagram}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small stat card                                                    */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "rose" | "amber" | "emerald" | "violet" | "sky" | "primary";
  loading?: boolean;
}

const ACCENT_STYLES: Record<
  NonNullable<StatCardProps["accent"]>,
  { iconBg: string; iconColor: string }
> = {
  rose: { iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
  amber: { iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
  emerald: { iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
  violet: { iconBg: "bg-violet-500/10", iconColor: "text-violet-500" },
  sky: { iconBg: "bg-sky-500/10", iconColor: "text-sky-500" },
  primary: { iconBg: "bg-primary/10", iconColor: "text-primary" },
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  loading,
}: StatCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <Card className="py-0 h-full flex flex-col">
      <CardContent className="p-4 flex-1 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground line-clamp-1">
            {label}
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-16" />
          ) : (
            <div
              dir="ltr"
              className="mt-1 truncate text-2xl font-bold tracking-tight"
            >
              {value}
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
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Recharts tooltip styles                                            */
/* ------------------------------------------------------------------ */

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const TICK_STYLE = { fontSize: 11, fill: "var(--muted-foreground)" };

/* ------------------------------------------------------------------ */
/* Charts                                                             */
/* ------------------------------------------------------------------ */

function VolumeAreaChart({
  data,
}: {
  data: AnalyticsDto["timeseries"];
}) {
  if (data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDay}
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={TICK_STYLE}
          tickFormatter={(v: number) => toFa(Number(v))}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          labelFormatter={(l) => fmtDay(String(l))}
          formatter={(value: number, name) => {
            const label =
              name === "total"
                ? "مجموع پاسخ‌ها"
                : name === "ai"
                  ? "پاسخ‌های هوش مصنوعی"
                  : String(name);
            return [faNumber(Number(value)), label];
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#totalFill)"
          name="total"
        />
        <Area
          type="monotone"
          dataKey="ai"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="transparent"
          name="ai"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AiVsRuleDonut({ ai, rule }: { ai: number; rule: number }) {
  const total = ai + rule;
  const data = [
    { name: "هوش مصنوعی", value: ai, color: "var(--chart-1)" },
    { name: "قانون", value: rule, color: "var(--chart-3)" },
  ];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number, n) => [faNumber(Number(v)), String(n)]}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          dir="ltr"
          className="text-2xl font-bold tracking-tight"
        >
          {faNumber(total)}
        </span>
        <span className="text-[11px] text-muted-foreground">مجموع پاسخ‌ها</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Channel breakdown                                                  */
/* ------------------------------------------------------------------ */

function ChannelBreakdown({
  data,
}: {
  data: AnalyticsDto["channelBreakdown"];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, b) => a + b.count, 0);
  return (
    <ul className="space-y-3">
      {CH_LIST.map((c) => {
        const entry = data.find((d) => d.channel === c.value);
        const count = entry?.count ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const widthPct = Math.round((count / max) * 100);
        return (
          <li key={c.value} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{c.label}</span>
              <span className="text-muted-foreground" dir="ltr">
                {faNumber(count)} · {toFa(pct)}٪
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="ig-gradient h-full rounded-full transition-all"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
      {total === 0 && (
        <li className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
          در این دوره داده‌ای برای کانال‌ها وجود ندارد.
        </li>
      )}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bar list (intents / keywords)                           */
/* ------------------------------------------------------------------ */

function BarList({
  items,
  emptyText = "هنوز چیزی اینجا نیست.",
}: {
  items: { label: string; count: number }[];
  emptyText?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="max-h-80 space-y-2.5 overflow-y-auto scrollbar-thin">
      {items.map((it) => (
        <li key={it.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate font-medium">{it.label}</span>
            <span className="ms-2 shrink-0 text-muted-foreground" dir="ltr">
              {faNumber(it.count)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/70 transition-all"
              style={{ width: `${Math.round((it.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Main AnalyticsView                                                 */
/* ------------------------------------------------------------------ */

const RANGES = [
  { value: "7", label: t.analytics.days7 },
  { value: "30", label: t.analytics.days30 },
  { value: "90", label: t.analytics.days90 },
] as const;

export function AnalyticsView() {
  const selectedAccountId = useAppStore((s) => s.selectedAccountId);
  const [days, setDays] = useState<string>("30");

  const url = selectedAccountId ? `/api/analytics?days=${days}` : null;
  const { data, isLoading, isError, refetch } = useApi<AnalyticsDto>(
    ["analytics", days, selectedAccountId],
    url,
  );

  const topIntents = useMemo(
    () =>
      (data?.topIntents ?? []).map((it) => ({
        label: intentLabel(it.intent),
        count: it.count,
      })),
    [data?.topIntents],
  );
  const topKeywords = useMemo(
    () =>
      (data?.topKeywords ?? []).map((it) => ({
        label: it.keyword,
        count: it.count,
      })),
    [data?.topKeywords],
  );

  if (!selectedAccountId) return <NoAccountEmptyState />;

  const escalationRate = data?.escalationRate ?? 0;
  const escalationTone =
    escalationRate > 20 ? "amber" : escalationRate < 10 ? "emerald" : "primary";

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header + range selector */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t.analytics.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.analytics.subtitle}</p>
        </div>
        <Tabs value={days} onValueChange={setDays}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.value} value={r.value}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {isError && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              بارگذاری تحلیل‌ها ناموفق بود.
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <section
        aria-label="خلاصه تحلیلی"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        <StatCard
          label={t.analytics.totalConv}
          value={data ? faCompact(data.totalConversations) : toFa(0)}
          icon={MessagesSquare}
          accent="primary"
          loading={isLoading}
        />
        <StatCard
          label={t.analytics.aiReplies}
          value={data ? faCompact(data.aiReplies) : toFa(0)}
          icon={Sparkles}
          accent="rose"
          loading={isLoading}
        />
        <StatCard
          label={t.analytics.ruleReplies}
          value={data ? faCompact(data.ruleReplies) : toFa(0)}
          icon={Workflow}
          accent="violet"
          loading={isLoading}
        />
        <StatCard
          label={t.analytics.escalationRate}
          value={data ? `${toFa(data.escalationRate)}٪` : `${toFa(0)}٪`}
          icon={TrendingUp}
          accent={escalationTone}
          loading={isLoading}
        />
        <StatCard
          label={t.analytics.failed}
          value={data ? faCompact(data.failed) : toFa(0)}
          icon={XCircle}
          accent="amber"
          loading={isLoading}
        />
      </section>

      {/* Empty state for whole period */}
      {!isLoading && data && data.totalConversations === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">{t.analytics.noData}</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              یک پیام ورودی را از داشبورد شبیه‌سازی کنید یا به محدوده تاریخ
              گسترده‌تری تغییر دهید.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Volume chart + AI vs rule donut */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t.analytics.volumeOverTime}
                </CardTitle>
                <CardDescription>
                  گفتگوهای ورودی روزانه پردازش‌شده (مجموع + پوشش هوش مصنوعی).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <>
                    <VolumeAreaChart data={data?.timeseries ?? []} />
                    <div className="mt-3 flex items-center justify-center gap-5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
                        مجموع پاسخ‌ها
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-2)" }} />
                        پاسخ‌های هوش مصنوعی
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t.analytics.aiVsRule}
                </CardTitle>
                <CardDescription>
                  پاسخ‌ها در این دوره چطور تولید شده‌اند.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  <>
                    <AiVsRuleDonut
                      ai={data?.aiVsRule.ai ?? 0}
                      rule={data?.aiVsRule.rule ?? 0}
                    />
                    <div className="mt-3 flex items-center justify-center gap-5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-1)" }} />
                        هوش مصنوعی · {faNumber(data?.aiVsRule.ai ?? 0)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-3)" }} />
                        قانون · {faNumber(data?.aiVsRule.rule ?? 0)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Channel breakdown + Escalation highlight + Top intents */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessagesSquare className="h-4 w-4 text-primary" />
                  {t.analytics.channelBreakdown}
                </CardTitle>
                <CardDescription>{t.analytics.channelDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : (
                  <ChannelBreakdown data={data?.channelBreakdown ?? []} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {t.analytics.escalationCard}
                </CardTitle>
                <CardDescription>
                  گفتگوهای نیازمند پیگیری انسانی.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                {isLoading ? (
                  <Skeleton className="h-16 w-24" />
                ) : (
                  <>
                    <div
                      dir="ltr"
                      className={cn(
                        "text-5xl font-bold tracking-tight",
                        escalationTone === "amber" && "text-amber-500",
                        escalationTone === "emerald" && "text-emerald-500",
                        escalationTone === "primary" && "text-primary",
                      )}
                    >
                      {toFa(escalationRate)}٪
                    </div>
                    <p className="mt-3 max-w-xs text-center text-xs text-muted-foreground">
                      {escalationRate > 20
                        ? "بالاتر از حد مطلوب — برای پاسخ خودکار به موارد بیشتر، قوانین خود را تنظیم کنید."
                        : escalationRate < 10
                          ? "سالم. بیشتر گفتگوها به‌صورت خودکار حل می‌شوند."
                          : "در محدوده نرمال. روند را زیر نظر داشته باشید."}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-3",
                        escalationTone === "amber" &&
                          "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                        escalationTone === "emerald" &&
                          "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                      )}
                    >
                      {escalationRate > 20
                        ? "نیازمند توجه"
                        : escalationRate < 10
                          ? "سالم"
                          : "نرمال"}
                    </Badge>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  {t.analytics.topIntents}
                </CardTitle>
                <CardDescription>
                  نیت‌های مشتری شناسایی‌شده (اول بیشترین).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2.5">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  <BarList
                    items={topIntents}
                    emptyText="هنوز نیت‌ای شناسایی نشده است."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          {/* Top trigger rules */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="h-4 w-4 text-primary" />
                  {t.analytics.topRules}
                </CardTitle>
                <CardDescription>
                  کدام قوانین خودکارسازی در این دوره بیشتر فعال شده‌اند.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                    <BarList
                      items={topKeywords}
                      emptyText="هنوز قانونی تطابق نداشته است."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
