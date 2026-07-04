"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { ConversationDto } from "@/types";
import { CHANNELS, CONVERSATION_STATUSES, labelFor } from "@/lib/constants";
import { timeAgo, fmtDateTime, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Send,
  Bot,
  Workflow,
  AlertTriangle,
  ExternalLink,
  CheckCheck,
  Flag,
  RotateCcw,
  MessageSquare,
  Inbox as InboxIcon,
  Instagram,
  Plus,
  ArrowLeft,
  Sparkles,
  Lightbulb,
} from "lucide-react";

type DetailResp = {
  conversation: ConversationDto & {
    matchedRule?: { name: string } | null;
    instagramAccount?: { igUsername: string } | null;
  };
  thread: ConversationDto[];
};

function statusDotClass(status: string): string {
  const s = CONVERSATION_STATUSES.find((x) => x.value === status);
  if (!s) return "bg-muted-foreground";
  // strip text-*; we just want the bg
  const bg = s.color.split(" ").find((c) => c.startsWith("bg-")) || "bg-muted-foreground";
  // normalize common bg-emerald-100 etc -> use 500 series dots
  return bg.replace(/-100$/, "-500").replace(/-200$/, "-500");
}

function statusBadgeClass(status: string): string {
  return (
    CONVERSATION_STATUSES.find((x) => x.value === status)?.color ||
    "bg-muted text-muted-foreground"
  );
}

function channelMeta(channel: string): { label: string; Icon: typeof MessageSquare } {
  const c = CHANNELS.find((x) => x.value === channel);
  return { label: c?.label || channel, Icon: MessageSquare };
}

function GradientAvatar({
  name,
  size = "h-9 w-9",
}: {
  name: string;
  size?: string;
}) {
  return (
    <Avatar className={size}>
      <AvatarFallback className="ig-gradient text-white text-xs font-semibold">
        {initials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}

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
        <h3 className="text-lg font-semibold">Connect an Instagram account</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Connect a business Instagram account to start receiving DMs, comments and story replies in your inbox.
        </p>
      </div>
      <Button onClick={connect} className="ig-gradient text-white">
        <Plus className="h-4 w-4" />
        Connect Instagram
      </Button>
    </div>
  );
}

function FiltersBar({
  q,
  setQ,
  channel,
  setChannel,
  status,
  setStatus,
  escalatedOnly,
  setEscalatedOnly,
}: {
  q: string;
  setQ: (v: string) => void;
  channel: string;
  setChannel: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  escalatedOnly: boolean;
  setEscalatedOnly: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2 border-b p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search messages or @username…"
          className="pl-8"
          aria-label="Search conversations"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className="h-8 text-xs" aria-label="Filter by channel">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {CHANNELS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 text-xs" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CONVERSATION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5">
        <Label htmlFor="escalated-toggle" className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          Needs follow-up
        </Label>
        <Switch id="escalated-toggle" checked={escalatedOnly} onCheckedChange={setEscalatedOnly} />
      </div>
    </div>
  );
}

function ConversationListItem({
  convo,
  active,
  onClick,
}: {
  convo: ConversationDto;
  active: boolean;
  onClick: () => void;
}) {
  const { Icon } = channelMeta(convo.channel);
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-accent/50",
        active && "bg-accent",
      )}
      aria-current={active ? "true" : undefined}
    >
      <div className="relative shrink-0">
        <GradientAvatar name={convo.contactUsername || convo.contactIgId} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
            statusDotClass(convo.status),
          )}
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">
            @{convo.contactUsername || convo.contactIgId}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(convo.createdAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs text-muted-foreground">
            {convo.inboundMessage}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {convo.wasAiGenerated && (
            <Badge variant="secondary" className="gap-0.5 bg-primary/10 text-primary text-[10px] px-1.5 py-0">
              <Bot className="h-2.5 w-2.5" /> AI
            </Badge>
          )}
          {!convo.wasAiGenerated && convo.matchedRuleName && (
            <Badge variant="secondary" className="gap-0.5 bg-secondary text-[10px] px-1.5 py-0">
              <Workflow className="h-2.5 w-2.5" /> Rule
            </Badge>
          )}
          {convo.escalated && (
            <Badge className="gap-0.5 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 hover:bg-amber-100">
              <AlertTriangle className="h-2.5 w-2.5" /> Follow-up
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

function ListSkeletons() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-md p-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="ig-gradient-soft rounded-full p-4">
        <InboxIcon className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">No conversations yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          When customers DM or comment, they&apos;ll appear here. Try the simulator in Settings to test your automation.
        </p>
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div className="ig-gradient-soft rounded-full p-5">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium">Select a conversation</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Pick a conversation from the list to see the full thread and reply.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  convo,
}: {
  convo: ConversationDto;
}) {
  return (
    <div className="space-y-1.5">
      {/* inbound (customer) — left */}
      <div className="flex justify-start">
        <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm">
          <p className="whitespace-pre-wrap break-words">{convo.inboundMessage}</p>
          <div className="mt-1 text-right text-[10px] text-muted-foreground">
            {fmtDateTime(convo.createdAt)}
          </div>
        </div>
      </div>
      {/* outbound (bot/agent) — right */}
      {convo.outboundMessage && (
        <div className="flex justify-end">
          <div className="max-w-[78%] space-y-1">
            <div className="rounded-2xl rounded-br-md ig-gradient px-3.5 py-2 text-sm text-white shadow-sm">
              <p className="whitespace-pre-wrap break-words">{convo.outboundMessage}</p>
              <div className="mt-1 text-right text-[10px] text-white/70">
                {fmtDateTime(convo.createdAt)}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              {convo.wasAiGenerated ? (
                <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0 hover:bg-primary/10">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                  {convo.aiModel && <span className="ml-1 opacity-70">{convo.aiModel}</span>}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <Workflow className="h-2.5 w-2.5" />
                  {convo.matchedRuleName ? `Rule: ${convo.matchedRuleName}` : "Rule"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailPane({
  detail,
  loading,
  onBack,
  onPatch,
  patching,
}: {
  detail: DetailResp | undefined;
  loading: boolean;
  onBack?: () => void;
  onPatch: (b: { status?: "auto" | "manual" | "escalated" | "resolved" | "failed"; escalated?: boolean; manualReply?: string }) => void;
  patching: boolean;
}) {
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const convo = detail?.conversation;
  const thread = detail?.thread ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [detail, thread.length]);

  if (loading && !convo) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-12 w-2/3", i % 2 ? "ml-auto" : "")} />
          ))}
        </div>
      </div>
    );
  }

  if (!convo) return <EmptyDetail />;

  const { Icon, label } = channelMeta(convo.channel);
  const escalated = convo.escalated || convo.status === "escalated";

  function sendReply() {
    const text = reply.trim();
    if (!text) {
      toast.error("Type a reply first");
      return;
    }
    onPatch({ manualReply: text });
    setReply("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 space-y-3">
        {onBack && (
          <Button variant="ghost" size="sm" className="md:hidden -ml-2 mb-1" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <GradientAvatar name={convo.contactUsername || convo.contactIgId} size="h-10 w-10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">@{convo.contactUsername || convo.contactIgId}</span>
                {convo.igUsername && (
                  <span className="text-xs text-muted-foreground">→ @{convo.igUsername}</span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                  <Icon className="h-2.5 w-2.5" /> {label}
                </Badge>
                <Badge className={cn("text-[10px]", statusBadgeClass(convo.status))}>
                  {labelFor(CONVERSATION_STATUSES, convo.status)}
                </Badge>
                {convo.intent && (
                  <Badge variant="secondary" className="text-[10px] capitalize">{convo.intent}</Badge>
                )}
              </div>
            </div>
          </div>
          {convo.postPermalink && (
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <a href={convo.postPermalink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View on IG
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Escalation banner */}
      {escalated && (
        <div className="border-b bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            Needs human follow-up
          </div>
          {convo.suggestedAction && (
            <div className="mt-1 flex items-start gap-1.5 text-xs">
              <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" />
              <span>Suggested: {convo.suggestedAction}</span>
            </div>
          )}
        </div>
      )}

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4">
        {thread.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet.</p>
        ) : (
          thread.map((t) => <MessageBubble key={t.id} convo={t} />)
        )}
      </div>

      {/* Composer + actions */}
      <div className="border-t p-3 space-y-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type a manual reply…"
          className="min-h-[60px] resize-none"
          aria-label="Reply message"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              sendReply();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={sendReply} disabled={patching} className="ig-gradient text-white">
            <Send className="h-4 w-4" /> Send reply
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPatch({ status: "resolved" })}
              disabled={patching}
            >
              <CheckCheck className="h-4 w-4" /> Resolve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPatch({ escalated: true, status: "escalated" })}
              disabled={patching || escalated}
              title="Flag for follow-up"
            >
              <Flag className="h-4 w-4" /> Follow-up
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPatch({ status: "auto", escalated: false })}
              disabled={patching}
              title="Reopen"
            >
              <RotateCcw className="h-4 w-4" /> Reopen
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
      </div>
    </div>
  );
}

export function InboxView() {
  const { selectedAccountId } = useAppStore();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [channel, setChannel] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [escalatedOnly, setEscalatedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const listUrl = useMemo(() => {
    if (!selectedAccountId) return null;
    const params = new URLSearchParams();
    params.set("igAccountId", selectedAccountId);
    if (channel !== "all") params.set("channel", channel);
    if (status !== "all") params.set("status", status);
    if (escalatedOnly) params.set("escalated", "true");
    if (debouncedQ) params.set("q", debouncedQ);
    params.set("limit", "100");
    return `/api/conversations?${params.toString()}`;
  }, [selectedAccountId, channel, status, escalatedOnly, debouncedQ]);

  const { data: listData, isLoading } = useApi<{ conversations: ConversationDto[]; total: number }>(
    ["conversations", listUrl],
    listUrl,
  );
  const conversations = listData?.conversations ?? [];

  const { data: detail, isLoading: detailLoading } = useApi<DetailResp>(
    ["conversation", selectedId],
    selectedId ? `/api/conversations/${selectedId}` : null,
  );

  const patchMut = useApiMutation<
    { id: string; status?: "auto" | "manual" | "escalated" | "resolved" | "failed"; escalated?: boolean; manualReply?: string },
    { conversation: ConversationDto }
  >("PATCH", (b) => `/api/conversations/${b.id}`, [
    ["conversations"],
    ["conversation", selectedId],
  ]);

  function handlePatch(body: {
    status?: "auto" | "manual" | "escalated" | "resolved" | "failed";
    escalated?: boolean;
    manualReply?: string;
  }) {
    if (!selectedId) return;
    patchMut.mutate(
      { id: selectedId, ...body },
      {
        onSuccess: (data) => {
          if (body.manualReply) toast.success("Reply sent to Instagram");
          else if (body.status === "resolved") toast.success("Conversation resolved");
          else if (body.escalated) toast.success("Flagged for follow-up");
          else if (body.status === "auto") toast.success("Conversation reopened");
          else toast.success("Conversation updated");
          void data;
        },
        onError: (e) => toast.error(e.message || "Update failed"),
      },
    );
  }

  function selectConversation(id: string) {
    setSelectedId(id);
    setMobileOpen(true);
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

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {listData ? `${listData.total} conversation${listData.total === 1 ? "" : "s"}` : "Loading conversations…"}
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border bg-card">
        {/* List pane — desktop */}
        <aside className="hidden md:flex md:w-[340px] md:shrink-0 md:flex-col border-r">
          <FiltersBar
            q={q}
            setQ={setQ}
            channel={channel}
            setChannel={setChannel}
            status={status}
            setStatus={setStatus}
            escalatedOnly={escalatedOnly}
            setEscalatedOnly={setEscalatedOnly}
          />
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <ListSkeletons />
            ) : conversations.length === 0 ? (
              <EmptyInbox />
            ) : (
              conversations.map((c) => (
                <ConversationListItem
                  key={c.id}
                  convo={c}
                  active={c.id === selectedId}
                  onClick={() => selectConversation(c.id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* Detail pane — desktop */}
        <section className="hidden md:flex md:flex-1 md:flex-col">
          <DetailPane
            detail={detail}
            loading={detailLoading}
            onPatch={handlePatch}
            patching={patchMut.isPending}
          />
        </section>

        {/* Mobile list — full width */}
        <div className="flex md:hidden flex-1 flex-col">
          <FiltersBar
            q={q}
            setQ={setQ}
            channel={channel}
            setChannel={setChannel}
            status={status}
            setStatus={setStatus}
            escalatedOnly={escalatedOnly}
            setEscalatedOnly={setEscalatedOnly}
          />
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <ListSkeletons />
            ) : conversations.length === 0 ? (
              <EmptyInbox />
            ) : (
              conversations.map((c) => (
                <ConversationListItem
                  key={c.id}
                  convo={c}
                  active={c.id === selectedId}
                  onClick={() => selectConversation(c.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile detail sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Conversation</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <DetailPane
              detail={detail}
              loading={detailLoading}
              onBack={() => setMobileOpen(false)}
              onPatch={handlePatch}
              patching={patchMut.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
