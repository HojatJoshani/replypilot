"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { DashboardStatsDto, InstagramAccountDto } from "@/types";
import { CHANNELS, PLANS } from "@/lib/constants";
import { fmtDate, timeAgo, initials } from "@/lib/format";
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
  ArrowRight,
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

const REQUIRED_SCOPES = [
  { id: "instagram_business_basic", label: "Basic display", desc: "Read your profile and media" },
  { id: "instagram_business_manage_messages", label: "Manage messages", desc: "Read & send DMs" },
  { id: "instagram_business_manage_comments", label: "Manage comments", desc: "Read & reply to comments" },
  { id: "instagram_business_content_publish", label: "Content publish", desc: "Schedule posts (optional)" },
];

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
        <Instagram className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">Connect your first Instagram account</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          ReplyPilot needs a business Instagram account to start automating your DMs and comments.
        </p>
      </div>
      <Button onClick={connect} className="ig-gradient text-white">
        <Plus className="h-4 w-4" /> Connect Instagram
      </Button>
    </div>
  );
}

function AccountRow({ account, onDisconnect }: { account: InstagramAccountDto; onDisconnect: (id: string) => void }) {
  const statusBadge = account.status === "active"
    ? "bg-emerald-100 text-emerald-700"
    : account.status === "expired"
      ? "bg-amber-100 text-amber-700"
      : "bg-muted text-muted-foreground";
  const statusLabel = account.status === "active"
    ? "Connected"
    : account.status === "expired"
      ? "Token expired"
      : "Disconnected";

  // token expiry display
  let expiry: string;
  if (!account.tokenExpiresAt) {
    expiry = "—";
  } else {
    const ms = new Date(account.tokenExpiresAt).getTime() - Date.now();
    if (ms <= 0) expiry = "expired";
    else if (ms < 24 * 60 * 60 * 1000) expiry = `expires in ${Math.round(ms / (60 * 60 * 1000))}h`;
    else expiry = `expires in ${Math.round(ms / (24 * 60 * 60 * 1000))}d`;
  }

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
          <span className="truncate text-sm font-medium">@{account.igUsername}</span>
          <Badge className={cn("text-[10px]", statusBadge)}>{statusLabel}</Badge>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>{account.followerCount.toLocaleString()} followers</span>
          <span>· connected {timeAgo(account.connectedAt)}</span>
          <span>· token {expiry}</span>
          <span>· {account.activeRules} active rule{account.activeRules === 1 ? "" : "s"}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onDisconnect(account.id)}
        aria-label={`Disconnect @${account.igUsername}`}
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
        <AlertTitle>Demo mode</AlertTitle>
        <AlertDescription>
          Connecting simulates a business account. Configure a real Meta App (see README) to go live with actual DMs and comments.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Connected Instagram accounts</CardTitle>
              <CardDescription>Manage the business accounts ReplyPilot can read & reply from.</CardDescription>
            </div>
            <Button onClick={onConnect} className="ig-gradient text-white">
              <Plus className="h-4 w-4" /> Connect Instagram
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              No accounts connected yet. Click <span className="font-medium text-foreground">Connect Instagram</span> to begin.
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
            <CardTitle className="text-base">Required permissions</CardTitle>
          </div>
          <CardDescription>
            ReplyPilot requests the minimum scopes required to run your automation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {REQUIRED_SCOPES.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-md border p-2.5">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{s.id}</code>
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
  const t = tenant.tenant;
  const planDef = PLANS.find((p) => p.value === t.plan);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Business profile</CardTitle>
          </div>
          <CardDescription>Your tenant/workspace details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Workspace name</span>
            <span className="font-medium">{t.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <Badge className="bg-primary/10 text-primary">{planDef?.label || t.plan}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium capitalize">{t.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{fmtDate(t.createdAt)}</span>
          </div>
          {t.subscription && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium">{t.subscription.seats}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Renews</span>
                <span className="font-medium">
                  {t.subscription.currentPeriodEnd ? fmtDate(t.subscription.currentPeriodEnd) : "—"}
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
            <CardTitle className="text-base">Team members</CardTitle>
          </div>
          <CardDescription>{t.users.length} member{t.users.length === 1 ? "" : "s"} on this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {t.users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-md border p-2.5">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="ig-gradient text-white text-xs font-semibold">
                  {initials(u.name || u.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.name || u.email}</div>
                <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
              </div>
              <Badge variant="outline" className="capitalize text-[10px]">{u.role}</Badge>
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
    "Hi! Do you ship internationally?",
    "What's the price of the vitamin C serum?",
    "I'd like to book an appointment",
    "Just placed an order, when will it ship?",
  ];

  function send() {
    if (!message.trim()) {
      toast.error("Type a message to simulate");
      return;
    }
    simMut.mutate(
      { accountId, channel, message: message.trim(), fromUsername: fromUsername.trim() || undefined },
      {
        onSuccess: () =>
          toast.success("Simulated message sent — check the Inbox", {
            action: {
              label: "Open Inbox",
              onClick: () => setView("inbox"),
            },
          }),
        onError: (e) => toast.error(e.message || "Simulation failed"),
      },
    );
    setMessage("");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Test your automation 🎬</CardTitle>
        </div>
        <CardDescription>
          Inject a simulated inbound Instagram event so the full pipeline (queue → rules → AI → reply → log) runs end-to-end — no real Meta app required.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sim-channel">Channel</Label>
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
            <Label htmlFor="sim-from">From @username (optional)</Label>
            <Input
              id="sim-from"
              value={fromUsername}
              onChange={(e) => setFromUsername(e.target.value)}
              placeholder="demo_customer"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sim-message">Inbound message</Label>
          <Input
            id="sim-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type what the customer would say…"
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
          <p className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
          <Button onClick={send} disabled={simMut.isPending} className="ig-gradient text-white">
            <Send className="h-4 w-4" /> {simMut.isPending ? "Sending…" : "Send simulated inbound"}
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
        <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
        <CardDescription>Sign out of your ReplyPilot account on this device.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          You can sign back in any time with your email and password.
        </p>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmOpen(true)}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of ReplyPilot?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be returned to the login screen. Any unsaved changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => signOut({ redirect: false }).then(() => window.location.reload())}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Sign out
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
      if (demoMode) toast.info("Demo mode — simulating a connection…");
      window.location.href = url;
    } catch {
      toast.error("Could not start Instagram connection");
    }
  }

  function disconnect(id: string) {
    disconnectMut.mutate(
      { id },
      {
        onSuccess: () => toast.success("Account disconnected"),
        onError: (e) => toast.error(e.message || "Failed to disconnect"),
      },
    );
  }

  // No selected account but at least the user is on Settings — show onboarding CTA only if NO accounts at all
  if (accounts.length === 0 && !accountsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Connect Instagram, manage your workspace, and test automation.</p>
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
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Connect Instagram, manage your workspace, and test automation.
          </p>
        </div>
        {selectedAccountId && (
          <Button variant="outline" onClick={() => setView("inbox")}>
            Go to Inbox <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="instagram" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-4 h-auto">
          <TabsTrigger value="instagram" className="text-xs">
            <Instagram className="h-3.5 w-3.5" /> Instagram
          </TabsTrigger>
          <TabsTrigger value="business" className="text-xs">
            <Building2 className="h-3.5 w-3.5" /> Business
          </TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs">
            <Film className="h-3.5 w-3.5" /> Simulator
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs">
            <LogOut className="h-3.5 w-3.5" /> Account
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
                      <CardTitle className="text-base">This period at a glance</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">AI replies used</div>
                      <div className="text-lg font-semibold">{stats.aiRepliesUsed.toLocaleString()}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">AI limit</div>
                      <div className="text-lg font-semibold">
                        {stats.aiRepliesLimit >= 999999 ? "∞" : stats.aiRepliesLimit.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Open follow-ups</div>
                      <div className="text-lg font-semibold">{stats.escalatedOpen}</div>
                    </div>
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">New leads</div>
                      <div className="text-lg font-semibold">{stats.leadsNew}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select an Instagram account in the top bar to use the simulator.
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
