"use client";

import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { Menu, ChevronDown, LogOut, User as UserIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { initials } from "@/lib/format";
import type { InstagramAccountDto } from "@/types";
import { toast } from "sonner";

export function AppTopbar() {
  const { data: session } = useSession();
  const { sidebarOpen, setSidebarOpen, selectedAccountId, setSelectedAccountId, setView } = useAppStore();

  const { data: accountsData } = useQuery<{ accounts: InstagramAccountDto[] }>({
    queryKey: ["ig-accounts"],
    queryFn: () => api.get("/api/instagram/accounts"),
  });
  const accounts = accountsData?.accounts ?? [];
  const selected = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  async function connectInstagram() {
    try {
      const { url } = await api.get<{ url: string }>("/api/instagram/oauth/start");
      window.location.href = url;
    } catch {
      toast.error("Could not start Instagram connection");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Account selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 max-w-[240px]">
            {selected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="truncate">@{selected.igUsername}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Connect account</span>
              </>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Instagram accounts</DropdownMenuLabel>
          {accounts.length > 0 && <DropdownMenuSeparator />}
          {accounts.map((a) => (
            <DropdownMenuItem
              key={a.id}
              onClick={() => setSelectedAccountId(a.id)}
              className="gap-2"
            >
              <span className={`h-2 w-2 rounded-full ${a.status === "active" ? "bg-emerald-500" : a.status === "expired" ? "bg-amber-500" : "bg-muted-foreground"}`} />
              <span className="flex-1 truncate">@{a.igUsername}</span>
              <span className="text-xs text-muted-foreground">{a.followerCount.toLocaleString()}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={connectInstagram} className="gap-2 text-primary">
            <Plus className="h-4 w-4" />
            Connect another account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => setView("rules")}>
          <Plus className="h-4 w-4 mr-1" />
          New rule
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || undefined} alt="" />
                <AvatarFallback className="ig-gradient text-white text-xs">
                  {initials(session?.user?.name || session?.user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left leading-tight">
                <div className="text-sm font-medium max-w-[120px] truncate">{session?.user?.name || "User"}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{(session?.user as { role?: string })?.role || "admin"}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{session?.user?.name}</span>
                <span className="text-xs text-muted-foreground truncate">{session?.user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setView("settings")}>
              <UserIcon className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => signOut({ redirect: false }).then(() => window.location.reload())}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
