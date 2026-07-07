"use client";

import {
  LayoutDashboard,
  Inbox,
  Workflow,
  Bot,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  Sparkles,
  X,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

const NAV: { id: ViewId; label: string; icon: typeof Inbox }[] = [
  { id: "dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
  { id: "inbox", label: t.nav.inbox, icon: Inbox },
  { id: "rules", label: t.nav.rules, icon: Workflow },
  { id: "ai-config", label: t.nav.aiConfig, icon: Bot },
  { id: "leads", label: t.nav.leads, icon: Users },
  { id: "analytics", label: t.nav.analytics, icon: BarChart3 },
  { id: "billing", label: t.nav.billing, icon: CreditCard },
  { id: "tutorial", label: t.nav.tutorial, icon: GraduationCap },
  { id: "terms", label: "قوانین و شروط", icon: ShieldCheck },
  { id: "settings", label: t.nav.settings, icon: Settings },
];

export function AppSidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-64 shrink-0 border-e bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* برند */}
        <div className="flex h-16 items-center justify-between px-5 border-b">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl ig-gradient text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-end leading-tight">
              <div className="font-bold text-[15px]">{t.brandFull}</div>
              <div className="text-[10px] text-muted-foreground">{t.company}</div>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ناوبری */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.nav.workspace}
          </div>
          {NAV.slice(0, 8).map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }} />
          ))}
          <div className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.nav.account}
          </div>
          {NAV.slice(8).map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }} />
          ))}
        </nav>

        {/* کارت ارتقا */}
        <div className="p-3">
          <div className="rounded-xl ig-gradient-soft border p-3 text-xs">
            <div className="font-semibold text-foreground mb-1">💡 {t.demo.replyIncluded}</div>
            <p className="text-muted-foreground leading-relaxed">
              طرح شما شامل پاسخ‌های تولیدشده با هوش مصنوعی GLM است.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 w-full h-7 text-xs"
              onClick={() => { setView("billing"); setSidebarOpen(false); }}
            >
              مدیریت طرح
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: { id: ViewId; label: string; icon: typeof Inbox };
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      <span className="flex-1 text-end">{item.label}</span>
      {item.id === "inbox" && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">زنده</Badge>}
    </button>
  );
}
