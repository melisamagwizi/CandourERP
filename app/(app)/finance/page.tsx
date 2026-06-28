import { desc, sql } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createExpense } from "@/data/actions";

export const dynamic = "force-dynamic";

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};

export default async function FinancePage() {
  const session = await requireAuth();

  const data = await withTenant(session.tenantId, async (tx) => {
    const [agg] = await tx.select({
      inflow: sql<number>`coalesce(sum(case when ${s.transactions.type} = 'inflow' then ${s.transactions.amountMinor} else 0 end), 0)::bigint`,
      expense: sql<number>`coalesce(sum(case when ${s.transactions.type} = 'expense' then ${s.transactions.amountMinor} else 0 end), 0)::bigint`,
    }).from(s.transactions);
    const recent = await tx.select().from(s.transactions).orderBy(desc(s.transactions.occurredAt)).limit(20);
    return { inflow: Number(agg.inflow), expense: Number(agg.expense), recent };
  });
  const net = data.inflow - data.expense;

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Finance</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Your money in, money out, and where you stand.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "16px 0" }}>
        <div style={metric}><div style={mlabel}>Money in</div><div style={{ ...mvalue, color: "#0f6e56" }}>{money(data.inflow)}</div></div>
        <div style={metric}><div style={mlabel}>Money out</div><div style={{ ...mvalue, color: "#a32d2d" }}>{money(data.expense)}</div></div>
        <div style={{ ...metric, background: "#e6f1fb" }}><div style={{ ...mlabel, color: "#185fa5" }}>Net position</div><div style={{ ...mvalue, color: "#185fa5" }}>{money(net)}</div></div>
      </div>

      <form action={createExpense} style={{ display: "flex", gap: 8, flexWrap: "wrap",
        background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 16 }}>
        <input name="description" placeholder="Expense (e.g. Rent)" style={{ ...input, flex: 2, minWidth: 160 }} />
        <input name="category" placeholder="Category" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input name="amount" type="number" step="0.01" min="0" required placeholder="Amount" style={{ ...input, width: 120 }} />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none",
          background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add expense</button>
      </form>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden" }}>
        {data.recent.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No transactions yet. Mark an invoice paid in Billing, or add an expense above.</div>}
        {data.recent.map((t) => (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center",
            padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span>{t.description ?? (t.type === "inflow" ? "Income" : "Expense")}<span style={{ fontSize: 12, color: "#888" }}>{t.category ? ` · ${t.category}` : ""}</span></span>
            <span style={{ fontSize: 12, color: t.type === "inflow" ? "#0f6e56" : "#a32d2d", textTransform: "capitalize" }}>{t.type}</span>
            <span style={{ fontWeight: 500, textAlign: "right", color: t.type === "inflow" ? "#0f6e56" : "#a32d2d" }}>
              {t.type === "inflow" ? "+" : "−"}{money(t.amountMinor)}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

const metric: React.CSSProperties = { background: "#f6f8fa", borderRadius: 10, padding: "1rem" };
const mlabel: React.CSSProperties = { fontSize: 13, color: "#5f6b7a" };
const mvalue: React.CSSProperties = { fontSize: 22, fontWeight: 500, marginTop: 2 };
