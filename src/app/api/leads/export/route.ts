import { getTenantContext } from "@/lib/session";
import { db } from "@/lib/db";

// Export leads as CSV.
export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.tenantId) return new Response("Unauthorized", { status: 401 });
  const leads = await db.lead.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    include: { instagramAccount: { select: { igUsername: true } } },
  });

  const header = ["id", "username", "ig_account", "status", "source", "tags", "notes", "created_at"];
  const escape = (v: string | null | undefined) => {
    const s = (v ?? "").toString().replace(/"/g, '""');
    return `"${s}"`;
  };
  const rows = leads.map((l) =>
    [l.id, l.contactUsername, l.instagramAccount?.igUsername, l.status, l.source, l.tags, l.notes, l.createdAt.toISOString()]
      .map(escape)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="replypilot-leads-${Date.now()}.csv"`,
    },
  });
}
