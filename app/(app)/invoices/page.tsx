import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { markInvoicePaid } from "@/data/actions";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  draft: "#888780", sent: "#185fa5", paid: "#0f6e56", partial: "#854f0b",
  overdue: "#a32d2d", void: "#888780",
};

export default async function InvoicesPage() {
  const session = await requireAuth();
  const rows = await withTenant(session.tenantId, (tx) =>
    tx.select({
      id: s.invoices.id, number: s.invoices.number, status: s.invoices.status,
      totalMinor: s.invoices.totalMinor, currency: s.invoices.currency,
      issueDate: s.invoices.issueDate, customer: s.accounts.name,
    })
      .from(s.invoices)
      .leftJoin(s.accounts, eq(s.accounts.id, s.invoices.accountId))
      .orderBy(desc(s.invoices.createdAt)),
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Invoices</h1>
          <p style={{ color: "#5f6b7a", marginTop: 0 }}>Bill your customers and track what you&apos;re owed.</p>
        </div>
        <Link href="/invoices/new" style={{ padding: "9px 16px", borderRadius: 8,
          background: "#185fa5", color: "#fff", fontWeight: 500, textDecoration: "none" }}>New invoice</Link>
      </div>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        {rows.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No invoices yet — create your first.</div>}
        {rows.map((inv) => (
          <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr auto auto auto",
            gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span style={{ fontWeight: 500 }}>{inv.number}</span>
            <span style={{ fontSize: 13, color: "#5f6b7a" }}>{inv.customer ?? "—"}</span>
            <span style={{ fontSize: 12, color: statusColor[inv.status] ?? "#888", textTransform: "capitalize" }}>{inv.status}</span>
            <span style={{ fontWeight: 500, textAlign: "right" }}>${(inv.totalMinor / 100).toFixed(2)}</span>
            {inv.status !== "paid" && inv.status !== "void" ? (
              <form action={markInvoicePaid}>
                <input type="hidden" name="invoiceId" value={inv.id} />
                <button type="submit" style={{ padding: "5px 11px", borderRadius: 8, border: "0.5px solid #1d9e75",
                  background: "#e1f5ee", color: "#0f6e56", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Mark paid</button>
              </form>
            ) : <span style={{ fontSize: 12, color: "#0f6e56", textAlign: "right" }}>✓ paid</span>}
          </div>
        ))}
      </section>
    </div>
  );
}
