"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { LoginScreen } from "@/components/login-screen";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/views/dashboard-view";
import { InboxView } from "@/components/views/inbox-view";
import { RulesView } from "@/components/views/rules-view";
import { AiConfigView } from "@/components/views/ai-config-view";
import { LeadsView } from "@/components/views/leads-view";
import { AnalyticsView } from "@/components/views/analytics-view";
import { BillingView } from "@/components/views/billing-view";
import { SettingsView } from "@/components/views/settings-view";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { InstagramAccountDto } from "@/types";

export function AppShell() {
  const { data: session, status } = useSession();
  const { view, selectedAccountId, setSelectedAccountId } = useAppStore();

  // Load accounts once authenticated; default the selected account.
  const { data: accountsData } = useQuery<{ accounts: InstagramAccountDto[] }>({
    queryKey: ["ig-accounts"],
    queryFn: () => api.get("/api/instagram/accounts"),
    enabled: status === "authenticated",
  });
  useEffect(() => {
    if (accountsData?.accounts?.length && !selectedAccountId) {
      setSelectedAccountId(accountsData.accounts[0].id);
    }
  }, [accountsData, selectedAccountId, setSelectedAccountId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (status !== "authenticated" || !session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {view === "dashboard" && <DashboardView />}
          {view === "inbox" && <InboxView />}
          {view === "rules" && <RulesView />}
          {view === "ai-config" && <AiConfigView />}
          {view === "leads" && <LeadsView />}
          {view === "analytics" && <AnalyticsView />}
          {view === "billing" && <BillingView />}
          {view === "settings" && <SettingsView />}
        </main>
        <footer className="mt-auto border-t bg-background/80 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur">
          ReplyPilot · Instagram automation for growing businesses ·{" "}
          <span className="text-foreground/70">Demo mode active</span> — no real Instagram API calls are sent.
        </footer>
      </div>
    </div>
  );
}
