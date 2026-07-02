import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { markInvoicePaid, createRecurring, runRecurring } from "@/data/actions";
import { input, primaryBtn } from "@/ui";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  draft: "#888780", sent: "#185fa5", paid: "#0f6e56", partial: "#854f0b", overdue: "#a32d2d", void: "#888780",
};

export default async function InvoicesPage() {
  const session = await requireAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { rows, schedules, accounts, products } = await withTenant(session.tenantId, async (tx) => {
    const rows = await tx.select({
      id: s.invoices.id, number: s.invoices.number, status: s.invoices.status,
      totalMinor: s.invoices.totalMinor, dueDate: s.invoices.dueDate, customer: s.accounts.name,
    }).from(s.invoices).leftJoin(s.accounts, eq(s.accounts.id, s.invoices.accountId)).orderBy(desc(s.invoices.createdAt));
    const schedules = await tx.select({
      id: s.recurringSchedules.id, cadence: s.recurringSchedules.cadence, nextRunOn: s.recurringSchedules.nextRunOn,
      customer: s.accounts.name, item: s.products.name,
    }).from(s.recurringSchedules)
      .leftJoin(s.accounts, eq(s.accounts.id, s.recurringSchedules.accountId))
      .leftJoin(s.products, eq(s.products.id, s.recurringSchedules.productId))
      .where(eq(s.recurringSchedules.active, true)).orderBy(asc(s.recurringSchedules.nextRunOn));
    const accounts = await tx.select({ id: s.accounts.id, name: s.accounts.name }).from(s.accounts);
    const products = await tx.select({ id: s.products.id, name: s.products.name }).from(s.products);
    return { rows, schedules, accounts, products };
  });

  const dueNow = schedules.filter((sc) => sc.nextRunOn && sc.nextRunOn <= today).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Invoices</h1>
          <p style={{ color: "#5f6b7a", marginTop: 0 }}>Bill your customers and track what you&apos;re owed.</p>
        </div>
        <Link href="/invoices/new" style={{ padding: "9px 16px", borderRadius: 8, background: "#185fa5", color: "#fff", fontWeight: 500, textDecoration: "none" }}>New invoice</Link>
      </div>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
        {rows.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No invoices yet — create your first.</div>}
        {rows.map((inv) => {
          const unpaid = inv.status !== "paid" && inv.status !== "void";
          const overdue = unpaid && inv.dueDate && inv.dueDate < today;
          const days = overdue ? Math.floor((Date.parse(today) - Date.parse(inv.dueDate!)) / 86400_000) : 0;
          return (
            <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr auto auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
              <Link href={`/invoices/${inv.id}`} style={{ fontWeight: 500, color: "#185fa5", textDecoration: "none" }}>{inv.number}</Link>
              <span style={{ fontSize: 13, color: "#5f6b7a" }}>{inv.customer ?? "—"}</span>
              <span style={{ fontSize: 12, color: overdue ? "#a32d2d" : statusColor[inv.status], textTransform: "capitalize" }}>
                {overdue ? `Overdue ${days}d` : inv.status}
              </span>
              <span style={{ fontWeight: 500, textAlign: "right" }}>${(inv.totalMinor / 100).toFixed(2)}</span>
              {unpaid ? (
                <form action={markInvoicePaid}><input type="hidden" name="invoiceId" value={inv.id} />
                  <button type="submit" style={{ padding: "5px 11px", borderRadius: 8, border: "0.5px solid #1d9e75", background: "#e1f5ee", color: "#0f6e56", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Mark paid</button></form>
              ) : <span style={{ fontSize: 12, color: "#0f6e56", textAlign: "right" }}>✓ paid</span>}
            </div>
          );
        })}
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "1.75rem 0 0.5rem" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Recurring / retainers</h2>
        <form action={runRecurring}>
          <button type="submit" style={{ ...primaryBtn, opacity: dueNow ? 1 : 0.5 }}>Run due invoices{dueNow ? ` (${dueNow})` : ""}</button>
        </form>
      </div>

      {accounts.length > 0 && products.length > 0 && (
        <form action={createRecurring} style={{ display: "flex", gap: 8, flexWrap: "wrap", background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 12 }}>
          <select name="accountId" required style={{ ...input, flex: 1, minWidth: 140 }}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <select name="productId" required style={{ ...input, flex: 1, minWidth: 140 }}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select name="cadence" style={{ ...input }}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select>
          <button type="submit" style={primaryBtn}>Add retainer</button>
        </form>
      )}

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden" }}>
        {schedules.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No retainers yet. Add one to bill a customer automatically each period.</div>}
        {schedules.map((sc) => (
          <div key={sc.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6", fontSize: 13 }}>
            <span style={{ fontWeight: 500 }}>{sc.customer ?? "—"}</span>
            <span style={{ color: "#5f6b7a" }}>{sc.item ?? "—"}</span>
            <span style={{ color: "#5f6b7a", textTransform: "capitalize" }}>{sc.cadence}</span>
            <span style={{ color: sc.nextRunOn && sc.nextRunOn <= today ? "#a32d2d" : "#5f6b7a", textAlign: "right" }}>next: {sc.nextRunOn}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
