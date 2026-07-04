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
} from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV: { id: ViewId; label: string; icon: typeof Inbox; group?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "rules", label: "Automation Rules", icon: Workflow },
  { id: "ai-config", label: "AI Assistant", icon: Bot },
  { id: "leads", label: "Leads", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5 border-b">
          <button onClick={() => setView("dashboard")} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl ig-gradient text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-left leading-tight">
              <div className="font-bold text-[15px]">ReplyPilot</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Instagram Auto</div>
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

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          {NAV.slice(0, 6).map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }} />
          ))}
          <div className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </div>
          {NAV.slice(6).map((item) => (
            <NavButton key={item.id} item={item} active={view === item.id} onClick={() => { setView(item.id); setSidebarOpen(false); }} />
          ))}
        </nav>

        {/* Upgrade card */}
        <div className="p-3">
          <div className="rounded-xl ig-gradient-soft border p-3 text-xs">
            <div className="font-semibold text-foreground mb-1">💡 AI replies included</div>
            <p className="text-muted-foreground leading-relaxed">
              Your plan includes AI-generated responses powered by GLM.
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="mt-2 w-full h-7 text-xs"
              onClick={() => { setView("billing"); setSidebarOpen(false); }}
            >
              Manage plan
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
      <Icon className={cn("h-4 w-4", active && "text-primary")} />
      <span className="flex-1 text-left">{item.label}</span>
      {item.id === "inbox" && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">live</Badge>}
    </button>
  );
}
