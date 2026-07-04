"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useApi, useApiMutation } from "@/hooks/use-api";
import { api } from "@/lib/api-client";
import type { LeadDto } from "@/types";
import { CHANNELS, LEAD_STATUSES, labelFor } from "@/lib/constants";
import { timeAgo, fmtDateTime, initials, splitTags } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  MessageSquare,
  MessageCircle,
  Instagram,
  Users,
} from "lucide-react";

type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

function leadStatusColor(status: string): string {
  return LEAD_STATUSES.find((s) => s.value === status)?.color || "bg-muted text-muted-foreground";
}

function sourceMeta(source: string): { label: string; Icon: typeof MessageSquare } {
  if (source === "comment") return { label: "Comment", Icon: MessageCircle };
  if (source === "story") return { label: "Story", Icon: Instagram };
  return { label: "DM", Icon: MessageSquare };
}

function GradientAvatar({ name, size = "h-8 w-8" }: { name: string; size?: string }) {
  return (
    <Avatar className={size}>
      <AvatarFallback className="ig-gradient text-white text-[10px] font-semibold">
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
          Connect a business Instagram account to start capturing leads from your DMs, comments, and story replies.
        </p>
      </div>
      <Button onClick={connect} className="ig-gradient text-white">
        <Plus className="h-4 w-4" /> Connect Instagram
      </Button>
    </div>
  );
}

function StatusChips({
  counts,
  active,
  onSelect,
}: {
  counts: Record<string, number>;
  active: string;
  onSelect: (s: string) => void;
}) {
  const chips = [{ value: "all", label: "All", color: "bg-secondary text-secondary-foreground" }, ...LEAD_STATUSES];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((s) => {
        const count = s.value === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[s.value] || 0;
        const isActive = active === s.value;
        return (
          <button
            key={s.value}
            onClick={() => onSelect(s.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                s.value === "all" ? "bg-muted-foreground" : leadStatusColor(s.value).split(" ").find((c) => c.startsWith("bg-"))?.replace(/-100$/, "-500").replace(/-200$/, "-500") || "bg-muted-foreground",
              )}
            />
            {s.label}
            <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

type LeadFormState = {
  contactIgId: string;
  contactUsername: string;
  tags: string;
  notes: string;
  status: LeadStatus;
  source: "dm" | "comment" | "story";
};

const EMPTY_FORM: LeadFormState = {
  contactIgId: "",
  contactUsername: "",
  tags: "",
  notes: "",
  status: "new",
  source: "dm",
};

function LeadForm({
  state,
  setState,
  showContactId,
}: {
  state: LeadFormState;
  setState: (s: LeadFormState) => void;
  showContactId: boolean;
}) {
  return (
    <div className="space-y-4">
      {showContactId && (
        <div className="space-y-1.5">
          <Label htmlFor="lead-igid">Instagram contact ID *</Label>
          <Input
            id="lead-igid"
            value={state.contactIgId}
            onChange={(e) => setState({ ...state, contactIgId: e.target.value })}
            placeholder="e.g. 17841400000000001"
            required
          />
          <p className="text-[11px] text-muted-foreground">
            The unique Instagram-scoped ID of the contact. Required.
          </p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="lead-username">Contact @username</Label>
        <Input
          id="lead-username"
          value={state.contactUsername}
          onChange={(e) => setState({ ...state, contactUsername: e.target.value })}
          placeholder="e.g. jane.doe"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lead-status">Status</Label>
          <Select value={state.status} onValueChange={(v) => setState({ ...state, status: v as LeadStatus })}>
            <SelectTrigger id="lead-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-source">Source</Label>
          <Select value={state.source} onValueChange={(v) => setState({ ...state, source: v as LeadFormState["source"] })}>
            <SelectTrigger id="lead-source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-tags">Tags</Label>
        <Input
          id="lead-tags"
          value={state.tags}
          onChange={(e) => setState({ ...state, tags: e.target.value })}
          placeholder="comma, separated, tags"
        />
        <p className="text-[11px] text-muted-foreground">Separate tags with commas.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead-notes">Notes</Label>
        <Textarea
          id="lead-notes"
          value={state.notes}
          onChange={(e) => setState({ ...state, notes: e.target.value })}
          placeholder="Add context about this lead…"
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}

export function LeadsView() {
  const { selectedAccountId } = useAppStore();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<LeadDto | null>(null);
  const [deleting, setDeleting] = useState<LeadDto | null>(null);
  const [addForm, setAddForm] = useState<LeadFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<LeadFormState>(EMPTY_FORM);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const listUrl = useMemo(() => {
    if (!selectedAccountId) return null;
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (debouncedQ) params.set("q", debouncedQ);
    return `/api/leads?${params.toString()}`;
  }, [selectedAccountId, status, debouncedQ]);

  const { data: leadsData, isLoading } = useApi<{ leads: LeadDto[] }>(
    ["leads", listUrl],
    listUrl,
  );
  const leads = leadsData?.leads ?? [];

  // status counts — based on full set (no status filter) for chip totals
  const { data: allData } = useApi<{ leads: LeadDto[] }>(
    ["leads-all", selectedAccountId],
    selectedAccountId ? `/api/leads` : null,
  );
  const allLeads = allData?.leads ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
    for (const l of allLeads) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [allLeads]);

  const createMut = useApiMutation<LeadFormState & { igAccountId?: string }, { lead: LeadDto }>(
    "POST",
    () => "/api/leads",
    [["leads"], ["leads-all"]],
  );
  const updateMut = useApiMutation<LeadFormState & { id: string }, { lead: LeadDto }>(
    "PUT",
    (b) => `/api/leads/${b.id}`,
    [["leads"], ["leads-all"]],
  );
  const deleteMut = useApiMutation<{ id: string }, { ok: true }>(
    "DELETE",
    (b) => `/api/leads/${b.id}`,
    [["leads"], ["leads-all"]],
  );

  function openAdd() {
    setAddForm(EMPTY_FORM);
    setAddOpen(true);
  }
  function openEdit(l: LeadDto) {
    setEditing(l);
    setEditForm({
      contactIgId: l.contactIgId,
      contactUsername: l.contactUsername || "",
      tags: l.tags,
      notes: l.notes || "",
      status: l.status as LeadStatus,
      source: l.source as LeadFormState["source"],
    });
  }

  function submitAdd() {
    if (!addForm.contactIgId.trim()) {
      toast.error("Contact ID is required");
      return;
    }
    createMut.mutate(
      { ...addForm, igAccountId: selectedAccountId || undefined },
      {
        onSuccess: () => {
          toast.success("Lead added");
          setAddOpen(false);
          setAddForm(EMPTY_FORM);
        },
        onError: (e) => toast.error(e.message || "Failed to add lead"),
      },
    );
  }

  function submitEdit() {
    if (!editing) return;
    updateMut.mutate(
      {
        id: editing.id,
        contactUsername: editForm.contactUsername,
        tags: editForm.tags,
        notes: editForm.notes,
        status: editForm.status,
      },
      {
        onSuccess: () => {
          toast.success("Lead updated");
          setEditing(null);
        },
        onError: (e) => toast.error(e.message || "Failed to update lead"),
      },
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    deleteMut.mutate(
      { id: deleting.id },
      {
        onSuccess: () => {
          toast.success("Lead deleted");
          setDeleting(null);
        },
        onError: (e) => toast.error(e.message || "Failed to delete lead"),
      },
    );
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Capture, qualify, and track potential customers from Instagram conversations.
          </p>
        </div>
      </div>

      {/* Status chips */}
      <StatusChips counts={counts} active={status} onSelect={setStatus} />

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by @username or tags…"
              className="pl-8"
              aria-label="Search leads"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.open("/api/leads/export", "_blank")}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={openAdd} className="ig-gradient text-white">
              <Plus className="h-4 w-4" /> Add lead
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table (desktop) */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  No leads yet — they appear when conversations get escalated or hit pricing/order intents.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((l) => {
                const { Icon, label } = sourceMeta(l.source);
                return (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <GradientAvatar name={l.contactUsername || l.contactIgId} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            @{l.contactUsername || "unknown"}
                          </div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {l.igUsername ? `via @${l.igUsername}` : l.contactIgId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[11px]", leadStatusColor(l.status))}>
                        {labelFor(LEAD_STATUSES, l.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {splitTags(l.tags).length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          splitTags(l.tags).slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] font-normal">{t}</Badge>
                          ))
                        )}
                        {splitTags(l.tags).length > 3 && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            +{splitTags(l.tags).length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 text-[11px] font-normal">
                        <Icon className="h-3 w-3" /> {label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1 max-w-[220px] text-xs text-muted-foreground">
                        {l.notes || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" title={fmtDateTime(l.createdAt)}>
                        {timeAgo(l.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(l)}
                          aria-label="Edit lead"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(l)}
                          aria-label="Delete lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Card list (mobile) */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : leads.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No leads yet — they appear when conversations get escalated or hit pricing/order intents.
            </CardContent>
          </Card>
        ) : (
          leads.map((l) => {
            const { Icon, label } = sourceMeta(l.source);
            return (
              <Card key={l.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <GradientAvatar name={l.contactUsername || l.contactIgId} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          @{l.contactUsername || "unknown"}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Icon className="h-2.5 w-2.5" /> {label} · {timeAgo(l.createdAt)}
                        </div>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px]", leadStatusColor(l.status))}>
                      {labelFor(LEAD_STATUSES, l.status)}
                    </Badge>
                  </div>
                  {splitTags(l.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {splitTags(l.tags).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] font-normal">{t}</Badge>
                      ))}
                    </div>
                  )}
                  {l.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{l.notes}</p>
                  )}
                  <div className="flex justify-end gap-1 pt-1 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(l)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a lead</DialogTitle>
            <DialogDescription>
              Manually add a contact as a lead. They&apos;ll show up in your CRM.
            </DialogDescription>
          </DialogHeader>
          <LeadForm state={addForm} setState={setAddForm} showContactId />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={createMut.isPending} className="ig-gradient text-white">
              {createMut.isPending ? "Adding…" : "Add lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit lead</DialogTitle>
            <DialogDescription>
              Update status, tags, and notes for this contact.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-1 pb-2">
              <div className="text-xs text-muted-foreground">Contact</div>
              <div className="text-sm font-medium">@{editing.contactUsername || editing.contactIgId}</div>
            </div>
          )}
          <LeadForm state={editForm} setState={setEditForm} showContactId={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={submitEdit} disabled={updateMut.isPending} className="ig-gradient text-white">
              {updateMut.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                @{deleting?.contactUsername || deleting?.contactIgId}
              </span>{" "}
              from your CRM. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
