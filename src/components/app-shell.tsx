"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { LoginScreen } from "@/components/login-screen";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { useAppStore } from "@/lib/store";
import { DashboardView } from "@/components/views/dashboard-view";
import { InboxView } from "@/components/views/inbox-view";
import { RulesView } from "@/components/views/rules-view";
import { AiConfigView } from "@/components/views/ai-config-view";
import { LeadsView } from "@/components/views/leads-view";
import { AnalyticsView } from "@/components/views/analytics-view";
import { BillingView } from "@/components/views/billing-view";
import { SettingsView } from "@/components/views/settings-view";
import { TutorialView } from "@/components/views/tutorial-view";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { InstagramAccountDto, AutomationRuleDto } from "@/types";
import { t } from "@/lib/i18n";

export function AppShell() {
  const { data: session, status } = useSession();
  const { view, selectedAccountId, setSelectedAccountId } = useAppStore();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Load accounts once authenticated; default the selected account.
  const { data: accountsData, isLoading: accountsLoading } = useQuery<{ accounts: InstagramAccountDto[] }>({
    queryKey: ["ig-accounts"],
    queryFn: () => api.get("/api/instagram/accounts"),
    enabled: status === "authenticated",
  });
  useEffect(() => {
    if (accountsData?.accounts?.length && !selectedAccountId) {
      setSelectedAccountId(accountsData.accounts[0].id);
    }
  }, [accountsData, selectedAccountId, setSelectedAccountId]);

  // Check if this tenant has any rules — if not, offer the onboarding wizard.
  const { data: rulesData } = useQuery<{ rules: AutomationRuleDto[] }>({
    queryKey: ["rules-onboarding", selectedAccountId],
    queryFn: () => api.get(`/api/rules?igAccountId=${selectedAccountId}`),
    enabled: status === "authenticated" && !!selectedAccountId && !onboardingDismissed,
  });

  // Show onboarding wizard when: authenticated, has account, has NO rules.
  // Pure derived state — no setState-in-effect needed.
  const hasNoRules = !!rulesData && rulesData.rules.length === 0;
  const onboardingSeen = typeof window !== "undefined" && selectedAccountId
    ? !!localStorage.getItem(`onboarding-seen-${selectedAccountId}`)
    : false;
  const showOnboarding = hasNoRules && !onboardingDismissed && !onboardingSeen;

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

  // Wait for accounts to load before rendering the dashboard so views don't
  // briefly flash the "no account" empty state (race condition fix).
  if (accountsLoading && !selectedAccountId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">در حال بارگذاری داشبورد…</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
            {view === "tutorial" && <TutorialView />}
          </main>
          <footer className="mt-auto border-t bg-background/80 px-4 py-3 text-center text-xs text-muted-foreground backdrop-blur">
            {t.demo.footer}
          </footer>
        </div>
      </div>
      {showOnboarding && selectedAccountId && (
        <OnboardingWizard
          igAccountId={selectedAccountId}
          onComplete={() => {
            setOnboardingDismissed(true);
            if (selectedAccountId) localStorage.setItem(`onboarding-seen-${selectedAccountId}`, "1");
            useAppStore.getState().setView("dashboard");
          }}
          onSkip={() => {
            setOnboardingDismissed(true);
            if (selectedAccountId) localStorage.setItem(`onboarding-seen-${selectedAccountId}`, "1");
          }}
        />
      )}
    </>
  );
}
