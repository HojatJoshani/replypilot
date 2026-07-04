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
import { compactNumber } from "@/lib/format";
import { CHANNELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import type { AnalyticsDto } from "@/types";

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
      toast.error("Could not start Instagram connection. Please try again.");
      setConnecting(false);
    }
  }
  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ig-gradient text-white">
          <BarChart3 className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold">No analytics yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect an Instagram account to start collecting conversation data
          and see rich analytics here.
        </p>
        <Button
          onClick={connect}
          disabled={connecting}
          className="ig-gradient mt-5 text-white hover:opacity-95"
        >
          Connect Instagram
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
  hint?: string;
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
  hint,
  loading,
}: StatCardProps) {
  const s = ACCENT_STYLES[accent];
  return (
    <Card className="py-0">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <div className="mt-1 truncate text-2xl font-bold tracking-tight">
                {value}
              </div>
            )}
            {hint && !loading && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
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
/* Date format helper                                                 */
/* ------------------------------------------------------------------ */

function fmtDay(d: string): string {
  try {
    return format(parseISO(d), "MMM d");
  } catch {
    return d;
  }
}

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
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          labelFormatter={(l) => fmtDay(String(l))}
          formatter={(value: number, name) => {
            const label = name === "total" ? "Total" : name === "ai" ? "AI replies" : String(name);
            return [compactNumber(Number(value)), label];
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
    { name: "AI replies", value: ai, color: "var(--chart-1)" },
    { name: "Rule replies", value: rule, color: "var(--chart-3)" },
  ];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: number, n) => [compactNumber(Number(v)), String(n)]}
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
        <span className="text-2xl font-bold tracking-tight">
          {compactNumber(total)}
        </span>
        <span className="text-[11px] text-muted-foreground">total replies</span>
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
      {CHANNELS.map((c) => {
        const entry = data.find((d) => d.channel === c.value);
        const count = entry?.count ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const widthPct = Math.round((count / max) * 100);
        return (
          <li key={c.value} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{c.label}</span>
              <span className="text-muted-foreground">
                {compactNumber(count)} · {pct}%
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
          No channel data in this period.
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
  emptyText = "Nothing here yet.",
  capitalize = false,
}: {
  items: { label: string; count: number }[];
  emptyText?: string;
  capitalize?: boolean;
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
            <span className="truncate font-medium">
              {capitalize ? it.label.charAt(0).toUpperCase() + it.label.slice(1) : it.label}
            </span>
            <span className="ml-2 shrink-0 text-muted-foreground">
              {compactNumber(it.count)}
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
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
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
    () => (data?.topIntents ?? []).map((t) => ({ label: t.intent, count: t.count })),
    [data?.topIntents],
  );
  const topKeywords = useMemo(
    () =>
      (data?.topKeywords ?? []).map((t) => ({
        label: t.keyword,
        count: t.count,
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
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track reply performance, channel mix, intents and escalations over
            time.
          </p>
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
              Couldn&apos;t load analytics.
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI row */}
      <section
        aria-label="Analytics summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        <StatCard
          label="Total conversations"
          value={data ? compactNumber(data.totalConversations) : 0}
          icon={MessagesSquare}
          accent="primary"
          loading={isLoading}
        />
        <StatCard
          label="AI replies"
          value={data ? compactNumber(data.aiReplies) : 0}
          icon={Sparkles}
          accent="rose"
          loading={isLoading}
        />
        <StatCard
          label="Rule-based replies"
          value={data ? compactNumber(data.ruleReplies) : 0}
          icon={Workflow}
          accent="violet"
          loading={isLoading}
        />
        <StatCard
          label="Escalation rate"
          value={data ? `${data.escalationRate}%` : "0%"}
          icon={TrendingUp}
          accent={escalationTone}
          loading={isLoading}
        />
        <StatCard
          label="Failed"
          value={data ? compactNumber(data.failed) : 0}
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
            <p className="mt-3 text-sm font-medium">
              No conversations in this period yet
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Try simulating an inbound message from the dashboard, or switch to
              a wider date range.
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
                  Response volume over time
                </CardTitle>
                <CardDescription>
                  Daily inbound conversations handled (total + AI overlay).
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
                        Total replies
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-2)" }} />
                        AI replies
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
                  AI vs Rule split
                </CardTitle>
                <CardDescription>
                  How replies were generated this period.
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
                        AI · {compactNumber(data?.aiVsRule.ai ?? 0)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--chart-3)" }} />
                        Rule · {compactNumber(data?.aiVsRule.rule ?? 0)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Channel breakdown + Escalation highlight */}
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessagesSquare className="h-4 w-4 text-primary" />
                  Channel breakdown
                </CardTitle>
                <CardDescription>
                  Where your inbound volume is coming from.
                </CardDescription>
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
                  Escalation rate
                </CardTitle>
                <CardDescription>
                  Conversations needing human follow-up.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                {isLoading ? (
                  <Skeleton className="h-16 w-24" />
                ) : (
                  <>
                    <div
                      className={cn(
                        "text-5xl font-bold tracking-tight",
                        escalationTone === "amber" && "text-amber-500",
                        escalationTone === "emerald" && "text-emerald-500",
                        escalationTone === "primary" && "text-primary",
                      )}
                    >
                      {escalationRate}%
                    </div>
                    <p className="mt-3 max-w-xs text-center text-xs text-muted-foreground">
                      {escalationRate > 20
                        ? "Higher than ideal — consider tuning your rules to handle more cases automatically."
                        : escalationRate < 10
                          ? "Healthy. Most conversations are resolved automatically."
                          : "Within a normal range. Keep an eye on the trend."}
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
                        ? "Needs attention"
                        : escalationRate < 10
                          ? "Healthy"
                          : "Normal"}
                    </Badge>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="h-4 w-4 text-primary" />
                  Top intents
                </CardTitle>
                <CardDescription>
                  Detected customer intents (most common first).
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
                    capitalize
                    emptyText="No intents detected yet."
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
                  Top trigger rules
                </CardTitle>
                <CardDescription>
                  Which automation rules fired most often this period.
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
                      emptyText="No rules have matched yet."
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
