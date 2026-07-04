"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { DashboardStatsDto, InstagramAccountDto } from "@/types";
import { CHANNELS, PLANS, ACCOUNT_STATUSES } from "@/lib/constants";
import { faDate, faTimeAgo, faTimeUntil, initials } from "@/lib/format";
import { t, toFa, faNumber } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Instagram,
  Plus,
  Trash2,
  Users,
  Building2,
  Film,
  LogOut,
  Send,
  Info,
  ShieldCheck,
  KeyRound,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}
interface TenantResp {
  tenant: {
    id: string;
    name: string;
    plan: string;
    status: string;
    createdAt: string;
    subscription: {
      plan: string;
      status: string;
      seats: number;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
    } | null;
    users: TenantUser[];
  };
}

const ROLES: Record<string, string> = t.roles as unknown as Record<string, string>;

const REQUIRED_SCOPES = [
  { id: "instagram_business_basic", label: t.settings.scopeBasic, desc: "خواندن پروفایل و رسانه شما" },
  { id: "instagram_business_manage_messages", label: t.settings.scopeMessages, desc: "خواندن و ارسال دایرکت" },
  { id: "instagram_business_manage_comments", label: t.settings.scopeComments, desc: "خواندن و پاسخ به کامنت‌ها" },
  { id: "instagram_business_content_publish", label: t.settings.scopePublish, desc: "زمان‌بندی پست‌ها" },
];

function ConnectAccountCta() {
  async function connect() {
    try {
      const { url, demoMode } = await api.get<{ url: string; demoMode: boolean }>("/api/instagram/oauth/start");
      if (demoMode) toast.info("حالت دمو — در حال شبیه‌سازی اتصال…");
      window.location.href = url;
    } catch {
      toast.error("شروع اتصال به اینستاگرام ناموفق بود");
    }
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="ig-gradient-soft rounded-full p-5">
        <Instagram className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{t.settings.noAccounts}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">{t.settings.noAccountsDesc}</p>
      </div>
      <Button onClick={connect} className="ig-gradient text-white">
        <Plus className="h-4 w-4" /> {t.settings.connectInstagram}
      </Button>
    </div>
  );
}

function AccountRow({ account, onDisconnect }: { account: InstagramAccountDto; onDisconnect: (id: string) => void }) {
  const statusDef = ACCOUNT_STATUSES.find((s) => s.value === account.status);
  const statusBadge = statusDef?.color || "bg-muted text-muted-foreground";
  const statusLabel = statusDef?.label || account.status;
  // strip text-* from bg-only dot classes for badges
  const badgeBg = statusBadge.split(" ").find((c) => c.startsWith("bg-")) || "bg-muted";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <Avatar className="h-10 w-10">
        {account.igProfilePic ? <AvatarImage src={account.igProfilePic} alt="" /> : null}
        <AvatarFallback className="ig-gradient text-white text-xs font-semibold">
          {initials(account.igUsername)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span dir="ltr" className="truncate text-sm font-medium">@{account.igUsername}</span>
          <Badge className={cn("text-[10px]", badgeBg, "text-white")}>{statusLabel}</Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>{t.settings.followers}: {faNumber(account.followerCount)}</span>
          <span>· {t.settings.connectedSince} {faTimeAgo(account.connectedAt)}</span>
          <span>· {t.settings.tokenExpires}: {faTimeUntil(account.tokenExpiresAt)}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onDisconnect(account.id)}
        aria-label={`${t.settings.disconnect} @${account.igUsername}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function InstagramConnectionTab({
  accounts,
  loading,
  onConnect,
  onDisconnect,
}: {
  accounts: InstagramAccountDto[];
  loading: boolean;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t.common.demoMode}</AlertTitle>
        <AlertDescription>{t.settings.demoNote}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{t.settings.connectedAccounts}</CardTitle>
              <CardDescription>{t.settings.connectedAccountsDesc}</CardDescription>
            </div>
            <Button onClick={onConnect} className="ig-gradient text-white">
              <Plus className="h-4 w-4" /> {t.settings.connectInstagram}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              هنوز حسابی متصل نشده است. روی <span className="font-medium text-foreground">{t.settings.connectInstagram}</span> کلیک کنید.
            </div>
          ) : (
            accounts.map((a) => <AccountRow key={a.id} account={a} onDisconnect={onDisconnect} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t.settings.requiredScopes}</CardTitle>
          </div>
          <CardDescription>{t.settings.scopesDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {REQUIRED_SCOPES.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-md border p-2.5">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s.id}</code>
                </div>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function BusinessProfileTab({ tenant, loading }: { tenant: TenantResp | undefined; loading: boolean }) {
  if (loading || !tenant) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></CardContent></Card>
      </div>
    );
  }
  const tnt = tenant.tenant;
  const planDef = PLANS.find((p) => p.value === tnt.plan);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t.settings.tenantProfile}</CardTitle>
          </div>
          <CardDescription>جزئیات فضای کار شما.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">نام فضای کار</span>
            <span className="font-medium">{tnt.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.billing.plan}</span>
            <Badge className="bg-primary/10 text-primary">{planDef?.label || tnt.plan}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">وضعیت</span>
            <span className="font-medium">{tnt.status === "active" ? "فعال" : tnt.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">تاریخ ایجاد</span>
            <span className="font-medium">{faDate(tnt.createdAt)}</span>
          </div>
          {tnt.subscription && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.billing.seats}</span>
                <span className="font-medium">{faNumber(tnt.subscription.seats)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تمدید در</span>
                <span className="font-medium">
                  {tnt.subscription.currentPeriodEnd ? faDate(tnt.subscription.currentPeriodEnd) : "—"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t.settings.teamMembers}</CardTitle>
          </div>
          <CardDescription>{faNumber(tnt.users.length)} عضو در این فضای کار.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tnt.users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-md border p-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="ig-gradient text-white text-xs font-semibold">
                  {initials(u.name || u.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.name || u.email}</div>
                <div dir="ltr" className="truncate text-[11px] text-muted-foreground">{u.email}</div>
              </div>
              <Badge variant="outline" className="text-[10px]">{ROLES[u.role] || u.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SimulatorTab({ accountId }: { accountId: string }) {
  const { setView } = useAppStore();
  const [channel, setChannel] = useState<"dm" | "comment" | "story">("dm");
  const [message, setMessage] = useState("");
  const [fromUsername, setFromUsername] = useState("");

  const simMut = useApiMutation<
    { accountId: string; channel: "dm" | "comment" | "story"; message: string; fromUsername?: string },
    { ok: true; eventId: string }
  >("POST", () => "/api/instagram/simulate", [["conversations"], ["dashboard-stats"]]);

  const examples = [
    "سلام! ارسال بین‌المللی دارید؟",
    "قیمت سرم ویتامین سی چنده؟",
    "می‌خواستم وقت رزرو کنم",
    "همین الان سفارش دادم، کی ارسال میشه؟",
  ];

  function send() {
    if (!message.trim()) {
      toast.error("برای شبیه‌سازی، یک پیام بنویسید");
      return;
    }
    simMut.mutate(
      { accountId, channel, message: message.trim(), fromUsername: fromUsername.trim() || undefined },
      {
        onSuccess: () =>
          toast.success(t.settings.simulatorSent, {
            action: {
              label: t.settings.openInbox,
              onClick: () => setView("inbox"),
            },
          }),
        onError: (e) => toast.error(e.message || "شبیه‌سازی ناموفق بود"),
      },
    );
    setMessage("");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{t.settings.simulatorDesc}</CardTitle>
        </div>
        <CardDescription>
          یک رویداد ورودی اینستاگرام شبیه‌سازی کنید تا کل خط‌لوله (صف → قوانین → هوش مصنوعی → پاسخ → ثبت) سرتاسری اجرا شود — به اپ متا نیاز نیست.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sim-channel">{t.dashboard.channel}</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger id="sim-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sim-from">@نام کاربری فرستنده (اختیاری)</Label>
            <Input
              id="sim-from"
              value={fromUsername}
              onChange={(e) => setFromUsername(e.target.value)}
              placeholder="demo_customer"
              dir="ltr"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sim-message">{t.dashboard.message}</Label>
          <Input
            id="sim-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="پیامی که مشتری می‌فرستد را بنویسید…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setMessage(ex)}
              className="rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter برای ارسال</p>
          <Button onClick={send} disabled={simMut.isPending} className="ig-gradient text-white">
            <Send className="h-4 w-4" /> {simMut.isPending ? t.common.sending : t.common.send}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{t.settings.dangerZone}</CardTitle>
        <CardDescription>از حساب آریا روی این دستگاه خارج شوید.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          هر زمان می‌توانید با ایمیل و رمز عبور خود دوباره وارد شوید.
        </p>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <LogOut className="h-4 w-4" /> {t.settings.signOut}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.settings.signOutConfirm}</AlertDialogTitle>
              <AlertDialogDescription>
                به صفحه ورود بازمی‌گردید. تغییرات ذخیره‌نشده از بین می‌روند.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => signOut({ redirect: false }).then(() => window.location.reload())}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {t.settings.signOut}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export function SettingsView() {
  const { selectedAccountId, setView } = useAppStore();

  const { data: accountsData, isLoading: accountsLoading } = useApi<{ accounts: InstagramAccountDto[] }>(
    ["ig-accounts"],
    "/api/instagram/accounts",
  );
  const accounts = accountsData?.accounts ?? [];

  const { data: tenantData, isLoading: tenantLoading } = useApi<TenantResp>(["tenant"], "/api/tenant");

  const { data: stats } = useApi<DashboardStatsDto>(["dashboard-stats"], "/api/dashboard/stats");

  const disconnectMut = useApiMutation<{ id: string }, { ok: true }>(
    "DELETE",
    (b) => `/api/instagram/accounts?id=${b.id}`,
    [["ig-accounts"], ["dashboard-stats"]],
  );

  async function connect() {
    try {
      const { url, demoMode } = await api.get<{ url: string; demoMode: boolean }>("/api/instagram/oauth/start");
      if (demoMode) toast.info("حالت دمو — در حال شبیه‌سازی اتصال…");
      window.location.href = url;
    } catch {
      toast.error("شروع اتصال به اینستاگرام ناموفق بود");
    }
  }

  function disconnect(id: string) {
    disconnectMut.mutate(
      { id },
      {
        onSuccess: () => toast.success("حساب قطع شد"),
        onError: (e) => toast.error(e.message || "قطع اتصال ناموفق بود"),
      },
    );
  }

  // No accounts at all → onboarding CTA
  if (accounts.length === 0 && !accountsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
        </div>
        <div className="rounded-xl border bg-card">
          <ConnectAccountCta />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <BusinessProfileTab tenant={tenantData} loading={tenantLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
        </div>
        {selectedAccountId && (
          <Button variant="outline" onClick={() => setView("inbox")}>
            {t.settings.openInbox} <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="instagram" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-4 h-auto">
          <TabsTrigger value="instagram" className="text-xs">
            <Instagram className="h-3.5 w-3.5" /> {t.settings.instagram}
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs">
            <Building2 className="h-3.5 w-3.5" /> {t.settings.business}
          </TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs">
            <Film className="h-3.5 w-3.5" /> {t.settings.simulator}
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs">
            <LogOut className="h-3.5 w-3.5" /> {t.settings.account}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instagram" className="mt-4">
          <InstagramConnectionTab
            accounts={accounts}
            loading={accountsLoading}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </TabsContent>

        <TabsContent value="business" className="mt-4">
          <BusinessProfileTab tenant={tenantData} loading={tenantLoading} />
        </TabsContent>

        <TabsContent value="simulator" className="mt-4">
          {selectedAccountId ? (
            <div className="space-y-4">
              <SimulatorTab accountId={selectedAccountId} />
              {stats && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">یک نگاه به این دوره</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">پاسخ‌های هوش مصنوعی استفاده‌شده</div>
                      <div className="text-lg font-semibold">{faNumber(stats.aiRepliesUsed)}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">محدودیت هوش مصنوعی</div>
                      <div className="text-lg font-semibold">
                        {stats.aiRepliesLimit >= 999999 ? "∞" : faNumber(stats.aiRepliesLimit)}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">پیگیری‌های باز</div>
                      <div className="text-lg font-semibold">{faNumber(stats.escalatedOpen)}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">سرنخ‌های جدید</div>
                      <div className="text-lg font-semibold">{faNumber(stats.leadsNew)}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                برای استفاده از شبیه‌ساز، یک حساب اینستاگرام در نوار بالا انتخاب کنید.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="account" className="mt-4">
          <DangerZoneCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
