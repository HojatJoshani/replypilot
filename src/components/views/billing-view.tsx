"use client";

import { useAppStore } from "@/lib/store";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { Plan, SubscriptionDto } from "@/types";
import { PLANS, labelFor } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Check,
  Sparkles,
  Crown,
  Zap,
  Building2,
  CreditCard,
  TrendingUp,
  Info,
  Ban,
} from "lucide-react";

const PLAN_ICONS: Record<Plan, typeof Crown> = {
  free: Zap,
  pro: Sparkles,
  business: Building2,
};

function ConnectAccountCta() {
  async function connect() {
    try {
      const { url } = await api.get<{ url: string }>("/api/instagram/oauth/start");
      window.location.href = url;
    } catch {
      toast.error("Could not start Instagram connection");
    }
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="ig-gradient-soft rounded-full p-5">
        <CreditCard className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Connect an Instagram account</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Connect an account to start using ReplyPilot and manage your subscription.
        </p>
      </div>
      <Button onClick={connect} className="ig-gradient text-white">Connect Instagram</Button>
    </div>
  );
}

function CurrentPlanSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

function CurrentPlanCard({
  subscription,
  aiRepliesUsed,
  aiRepliesLimit,
}: {
  subscription: SubscriptionDto | null;
  aiRepliesUsed: number;
  aiRepliesLimit: number;
}) {
  const plan = subscription?.plan || "free";
  const planDef = PLANS.find((p) => p.value === plan) || PLANS[0];
  const pct = aiRepliesLimit > 0 ? Math.min(100, Math.round((aiRepliesUsed / aiRepliesLimit) * 100)) : 0;
  const approachingLimit = plan === "free" && pct >= 80;
  const isUnlimited = aiRepliesLimit >= 999999;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Current plan</CardTitle>
            <CardDescription>Your subscription and usage this billing period.</CardDescription>
          </div>
          <Badge
            className={cn(
              "text-xs",
              subscription?.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground",
            )}
          >
            {subscription?.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : "Active"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Plan</div>
            <div className="text-2xl font-semibold tracking-tight">{planDef.label}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            ${planDef.price}/mo
          </div>
          {subscription?.cancelAtPeriodEnd && (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-xs">
              <Ban className="h-3 w-3" /> Cancels at period end
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Seats</div>
            <div className="font-medium">{subscription?.seats ?? planDef.limits.accounts} account{(subscription?.seats ?? planDef.limits.accounts) === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Current period ends</div>
            <div className="font-medium">
              {subscription?.currentPeriodEnd ? fmtDate(subscription.currentPeriodEnd) : "—"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI replies this period
            </span>
            <span className="text-muted-foreground">
              {aiRepliesUsed.toLocaleString()}{" "}
              / {isUnlimited ? "∞" : aiRepliesLimit.toLocaleString()}
            </span>
          </div>
          <Progress value={isUnlimited ? 5 : pct} className="h-2" />
          {!isUnlimited && (
            <p className="text-[11px] text-muted-foreground">
              {pct < 100 ? `${100 - pct}% remaining` : "Limit reached — upgrade to keep using AI replies"}
            </p>
          )}
          {isUnlimited && (
            <p className="text-[11px] text-muted-foreground">Unlimited AI replies on your plan.</p>
          )}
        </div>

        {approachingLimit && (
          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Approaching your AI reply limit</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              You&apos;ve used {pct}% of your monthly AI replies. Upgrade to Growth for 2,000 replies/mo.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onSwitch,
  loading,
}: {
  plan: (typeof PLANS)[number];
  isCurrent: boolean;
  onSwitch: () => void;
  loading: boolean;
}) {
  const Icon = PLAN_ICONS[plan.value as Plan];
  const popular = "popular" in plan && plan.popular === true;
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        popular && "border-primary ring-2 ring-primary/20 ig-gradient-soft",
      )}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="ig-gradient text-white text-[10px] uppercase tracking-wide px-3 py-1 shadow-sm">
            Most popular
          </Badge>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className={cn("rounded-lg p-1.5", popular ? "ig-gradient text-white" : "bg-muted text-muted-foreground")}>
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-base">{plan.label}</CardTitle>
        </div>
        <CardDescription>{plan.tagline}</CardDescription>
        <div className="flex items-baseline gap-1 pt-1">
          <span className="text-3xl font-bold tracking-tight">${plan.price}</span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <ul className="space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-md bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Accounts</span>
            <span className="font-medium text-foreground">
              {plan.limits.accounts >= 10 ? "Up to 10" : plan.limits.accounts}
            </span>
          </div>
          <div className="flex justify-between">
            <span>AI replies/mo</span>
            <span className="font-medium text-foreground">
              {plan.limits.aiReplies >= 999999 ? "Unlimited" : plan.limits.aiReplies.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Automation rules</span>
            <span className="font-medium text-foreground">
              {plan.limits.rules >= 999 ? "Unlimited" : plan.limits.rules}
            </span>
          </div>
        </div>
      </CardContent>
      <CardContent className="pt-0">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="h-4 w-4" /> Current plan
          </Button>
        ) : (
          <Button
            onClick={onSwitch}
            disabled={loading}
            className={cn("w-full", popular ? "ig-gradient text-white" : "")}
          >
            {loading ? "Switching…" : `Switch to ${plan.label}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function BillingView() {
  const { selectedAccountId } = useAppStore();

  const { data: billing, isLoading: billingLoading } = useApi<{
    subscription: SubscriptionDto | null;
    plans: typeof PLANS;
  }>(["billing"], selectedAccountId ? "/api/billing" : null);

  const { data: stats } = useApi<{
    aiRepliesUsed: number;
    aiRepliesLimit: number;
  }>(["dashboard-stats"], selectedAccountId ? "/api/dashboard/stats" : null);

  const changeMut = useApiMutation<{ plan: Plan }, { subscription: SubscriptionDto }>(
    "POST",
    () => "/api/billing",
    [["billing"], ["dashboard-stats"]],
  );
  const cancelMut = useApiMutation<void, { ok: true }>(
    "DELETE",
    () => "/api/billing",
    [["billing"]],
  );

  function switchPlan(plan: Plan) {
    changeMut.mutate({ plan }, {
      onSuccess: () => toast.success(`Plan updated to ${labelFor(PLANS, plan)}`),
      onError: (e) => toast.error(e.message || "Failed to change plan"),
    });
  }

  function cancel() {
    cancelMut.mutate(undefined as unknown as void, {
      onSuccess: () => toast.success("Subscription will cancel at period end"),
      onError: (e) => toast.error(e.message || "Failed to cancel"),
    });
  }

  if (!selectedAccountId) {
    return (
      <div className="p-4 md:p-6">
        <div className="rounded-xl border bg-card">
          <ConnectAccountCta />
        </div>
      </div>
    );
  }

  const currentPlan = billing?.subscription?.plan || "free";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing &amp; Plan</h1>
        <p className="text-sm text-muted-foreground">
          Manage your ReplyPilot subscription, usage, and billing period.
        </p>
      </div>

      {/* Demo payment note */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Demo mode</AlertTitle>
        <AlertDescription>
          No real payment is processed. Swap in Stripe or a local gateway in production to handle subscriptions.
        </AlertDescription>
      </Alert>

      {/* Current plan + usage */}
      {billingLoading ? (
        <CurrentPlanSkeleton />
      ) : (
        <CurrentPlanCard
          subscription={billing?.subscription ?? null}
          aiRepliesUsed={stats?.aiRepliesUsed ?? 0}
          aiRepliesLimit={stats?.aiRepliesLimit ?? (billing?.subscription ? (PLANS.find((p) => p.value === currentPlan)?.limits.aiReplies ?? 50) : 50)}
        />
      )}

      {/* Plan comparison */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Available plans</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3 pt-2">
          {(billing?.plans || PLANS).map((plan) => (
            <PlanCard
              key={plan.value}
              plan={plan}
              isCurrent={plan.value === currentPlan}
              onSwitch={() => switchPlan(plan.value as Plan)}
              loading={changeMut.isPending}
            />
          ))}
        </div>
      </div>

      {/* Cancel */}
      <div className="flex items-center justify-between rounded-xl border border-dashed p-4">
        <div>
          <div className="text-sm font-medium">Cancel subscription</div>
          <p className="text-xs text-muted-foreground">
            Cancel anytime — your plan stays active until the end of the current period.
          </p>
        </div>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={cancel}
          disabled={cancelMut.isPending || currentPlan === "free" || billing?.subscription?.cancelAtPeriodEnd}
        >
          <Ban className="h-4 w-4" />
          {billing?.subscription?.cancelAtPeriodEnd ? "Already cancelling" : "Cancel subscription"}
        </Button>
      </div>
    </div>
  );
}
