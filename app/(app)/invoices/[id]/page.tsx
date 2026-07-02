import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { markInvoiceSent, markInvoicePaid, recordPayment } from "@/data/actions";

export const dynamic = "force-dynamic";

const money = (m: number) => "$" + (m / 100).toFixed(2);

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const data = await withTenant(session.tenantId, async (tx) => {
    const [inv] = await tx.select().from(s.invoices).where(eq(s.invoices.id, id));
    if (!inv) return null;
    const [acct] = await tx.select().from(s.accounts).where(eq(s.accounts.id, inv.accountId));
    const lines = await tx.select().from(s.invoiceLines).where(eq(s.invoiceLines.invoiceId, id));
    const [{ paid }] = await tx.select({ paid: sql<number>`coalesce(sum(${s.payments.amountMinor}),0)::bigint` }).from(s.payments).where(eq(s.payments.invoiceId, id));
    return { inv, acct, lines, paid: Number(paid) };
  });
  if (!data) notFound();
  const { inv, acct, lines, paid } = data;
  const outstanding = inv.totalMinor - paid;

  const msg = `Hi ${acct?.name ?? "there"}, here is invoice ${inv.number} for ${money(inv.totalMinor)}. Thank you!`;
  const waDigits = (acct?.whatsapp ?? "").replace(/\D/g, "");
  const waLink = `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`;
  const mailLink = `mailto:${acct?.billingEmail ?? ""}?subject=${encodeURIComponent(`Invoice ${inv.number}`)}&body=${encodeURIComponent(msg)}`;

  return (
    <div style={{ maxWidth: 680 }}>
      <Link href="/invoices" style={{ fontSize: 13, color: "#185fa5", textDecoration: "none" }}>← All invoices</Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 4px" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>{inv.number}</h1>
        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "#f1efe8",
          color: "#5f6b7a", textTransform: "capitalize" }}>{inv.status}</span>
      </div>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Bill to {acct?.name ?? "—"}{acct?.billingEmail ? ` · ${acct.billingEmail}` : ""}</p>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        {lines.map((l) => (
          <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12,
            padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span>{l.description} <span style={{ color: "#888", fontSize: 12 }}>× {l.qty}</span></span>
            <span style={{ color: "#5f6b7a" }}>{money(l.unitPriceMinor)}</span>
            <span style={{ fontWeight: 500, textAlign: "right" }}>{money(l.lineTotalMinor)}</span>
          </div>
        ))}
        <div style={{ padding: "12px 1.25rem", borderTop: "0.5px solid #eef2f6", background: "#f6f8fa" }}>
          <Row label="Subtotal" value={money(inv.subtotalMinor)} />
          <Row label="Tax" value={money(inv.taxMinor)} />
          <Row label="Total" value={money(inv.totalMinor)} bold />
          {paid > 0 && <Row label="Paid" value={"− " + money(paid)} />}
          {paid > 0 && outstanding > 0 && <Row label="Outstanding" value={money(outstanding)} bold />}
        </div>
      </section>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <a href={`/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" style={btn}>📄 Download PDF</a>
        <a href={waLink} target="_blank" rel="noreferrer" style={{ ...btn, borderColor: "#9fe1cb", color: "#0f6e56", background: "#e1f5ee" }}>Send on WhatsApp</a>
        <a href={mailLink} style={btn}>Send by email</a>
        {inv.status === "draft" && (
          <form action={markInvoiceSent}><input type="hidden" name="invoiceId" value={inv.id} />
            <button type="submit" style={btn}>Mark as sent</button></form>
        )}
        {inv.status !== "paid" && inv.status !== "void" && (
          <form action={markInvoicePaid}><input type="hidden" name="invoiceId" value={inv.id} />
            <button type="submit" style={{ ...btn, borderColor: "#185fa5", color: "#fff", background: "#185fa5" }}>Mark paid</button></form>
        )}
      </div>

      {inv.status !== "paid" && inv.status !== "void" && (
        <form action={recordPayment} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <input type="hidden" name="invoiceId" value={inv.id} />
          <span style={{ fontSize: 13, color: "#5f6b7a" }}>Record a payment:</span>
          <input name="amount" type="number" step="0.01" min="0" defaultValue={(outstanding / 100).toFixed(2)} style={{ ...btn, width: 110, cursor: "text" }} />
          <button type="submit" style={btn}>Record</button>
        </form>
      )}

      <p style={{ fontSize: 12, color: "#8a809e", marginTop: 14 }}>
        WhatsApp and email open with the message pre-filled, sent from your own account. Automated server-side
        delivery (WhatsApp Business API) comes with billing setup.
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0",
      fontWeight: bold ? 600 : 400, fontSize: bold ? 15 : 14, color: bold ? "#1f2933" : "#5f6b7a" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "0.5px solid #d9e2ec", background: "#fff",
  color: "#1f2933", fontSize: 13, fontWeight: 500, cursor: "pointer", textDecoration: "none",
};
