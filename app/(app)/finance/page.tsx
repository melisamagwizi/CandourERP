import { desc, eq, sql } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createExpense, setBudget, deleteBudget } from "@/data/actions";
import { input, card, primaryBtn } from "@/ui";

export const dynamic = "force-dynamic";

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function FinancePage() {
  const session = await requireAuth();

  const d = await withTenant(session.tenantId, async (tx) => {
    const [agg] = await tx.select({
      inflow: sql<number>`coalesce(sum(case when ${s.transactions.type} = 'inflow' then ${s.transactions.amountMinor} else 0 end), 0)::bigint`,
      expense: sql<number>`coalesce(sum(case when ${s.transactions.type} = 'expense' then ${s.transactions.amountMinor} else 0 end), 0)::bigint`,
      expense90: sql<number>`coalesce(sum(${s.transactions.amountMinor}) filter (where ${s.transactions.type} = 'expense' and ${s.transactions.occurredAt} >= now() - interval '90 days'), 0)::bigint`,
    }).from(s.transactions);
    const [rec] = await tx.select({
      expected: sql<number>`coalesce(sum(${s.invoices.totalMinor}) filter (where ${s.invoices.status} not in ('paid','void')), 0)::bigint`,
    }).from(s.invoices);
    const monthSpend = await tx.select({
      category: sql<string>`coalesce(${s.transactions.category}, 'Uncategorised')`,
      spent: sql<number>`sum(${s.transactions.amountMinor})::bigint`,
    }).from(s.transactions)
      .where(sql`${s.transactions.type} = 'expense' and ${s.transactions.occurredAt} >= date_trunc('month', now())`)
      .groupBy(sql`coalesce(${s.transactions.category}, 'Uncategorised')`);
    const budgets = await tx.select().from(s.budgets).orderBy(desc(s.budgets.createdAt));
    const topCustomers = await tx.select({
      name: s.accounts.name,
      total: sql<number>`sum(${s.payments.amountMinor})::bigint`,
    }).from(s.payments)
      .innerJoin(s.invoices, eq(s.invoices.id, s.payments.invoiceId))
      .innerJoin(s.accounts, eq(s.accounts.id, s.invoices.accountId))
      .groupBy(s.accounts.name).orderBy(desc(sql`sum(${s.payments.amountMinor})`)).limit(5);
    const recent = await tx.select().from(s.transactions).orderBy(desc(s.transactions.occurredAt)).limit(15);
    return {
      inflow: Number(agg.inflow), expense: Number(agg.expense), expense90: Number(agg.expense90),
      expected: Number(rec.expected),
      monthSpend: monthSpend.map((m) => ({ ...m, spent: Number(m.spent) })),
      budgets, topCustomers: topCustomers.map((c) => ({ ...c, total: Number(c.total) })), recent,
    };
  });

  const cash = d.inflow - d.expense;
  const avgMonthlySpend = Math.round(d.expense90 / 3);
  const runwayMonths = cash > 0 && avgMonthlySpend > 0 ? cash / avgMonthlySpend : null;

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Finance</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Your money in, money out, and where you stand.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "16px 0" }}>
        <div style={metric}><div style={mlabel}>Money in</div><div style={{ ...mvalue, color: "#0f6e56" }}>{money(d.inflow)}</div></div>
        <div style={metric}><div style={mlabel}>Money out</div><div style={{ ...mvalue, color: "#a32d2d" }}>{money(d.expense)}</div></div>
        <div style={{ ...metric, background: "#e6f1fb" }}><div style={{ ...mlabel, color: "#185fa5" }}>Cash position</div><div style={{ ...mvalue, color: "#185fa5" }}>{money(cash)}</div></div>
      </div>

      <section style={{ ...card, marginBottom: 16, background: "#e6f1fb", border: "0.5px solid #b5d4f4" }}>
        <strong style={{ fontSize: 15, color: "#185fa5" }}>Runway</strong>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: "#0c447c" }}>
          <span>Avg monthly spend (90d): <strong>{money(avgMonthlySpend)}</strong></span>
          <span>Expected in (unpaid invoices): <strong>{money(d.expected)}</strong></span>
          <span>
            {runwayMonths === null
              ? "Log expenses to see your runway."
              : <>Cash covers <strong>≈ {runwayMonths.toFixed(1)} months</strong> of spend{d.expected > 0 ? " — more once you collect what you're owed" : ""}.</>}
          </span>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
        <section style={card}>
          <strong style={{ fontSize: 15 }}>Budgets · this month</strong>
          <form action={setBudget} style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
            <input name="category" required placeholder="Category (e.g. Rent)" style={{ ...input, flex: 1 }} />
            <input name="amount" type="number" step="0.01" min="0" required placeholder="Monthly $" style={{ ...input, width: 110 }} />
            <button type="submit" style={primaryBtn}>Set</button>
          </form>
          {d.budgets.length === 0 && <div style={{ fontSize: 13, color: "#5f6b7a" }}>No budgets yet — set one to track spending.</div>}
          {d.budgets.map((b) => {
            const spent = d.monthSpend.find((m) => m.category.toLowerCase() === b.category.toLowerCase())?.spent ?? 0;
            const over = spent > b.monthlyMinor && b.monthlyMinor > 0;
            const pct = b.monthlyMinor > 0 ? Math.min(100, Math.round((spent / b.monthlyMinor) * 100)) : 0;
            return (
              <div key={b.id} style={{ padding: "8px 0", borderTop: "0.5px solid #eef2f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>{b.category}</span>
                  <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: over ? "#a32d2d" : "#5f6b7a" }}>{money(spent)} / {money(b.monthlyMinor)}{over ? " · over" : ""}</span>
                    <form action={deleteBudget}><input type="hidden" name="id" value={b.id} />
                      <button type="submit" aria-label="Remove budget" style={{ border: "none", background: "transparent", color: "#c0b9c9", cursor: "pointer" }}>×</button></form>
                  </span>
                </div>
                <div style={{ height: 6, background: "#eef2f6", borderRadius: 3 }}>
                  <div style={{ width: pct + "%", height: "100%", background: over ? "#e24b4a" : "#1d9e75", borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </section>

        <section style={card}>
          <strong style={{ fontSize: 15 }}>Top customers by revenue</strong>
          {d.topCustomers.length === 0 && <div style={{ fontSize: 13, color: "#5f6b7a", marginTop: 8 }}>No payments recorded yet.</div>}
          {d.topCustomers.map((c, i) => (
            <div key={c.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "0.5px solid #eef2f6", fontSize: 13 }}>
              <span>{i + 1}. {c.name}</span><span style={{ fontWeight: 500 }}>{money(c.total)}</span>
            </div>
          ))}
        </section>
      </div>

      <form action={createExpense} style={{ display: "flex", gap: 8, flexWrap: "wrap", ...card, marginBottom: 16 }}>
        <input name="description" placeholder="Expense (e.g. Rent)" style={{ ...input, flex: 2, minWidth: 160 }} />
        <input name="category" placeholder="Category" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input name="amount" type="number" step="0.01" min="0" required placeholder="Amount" style={{ ...input, width: 120 }} />
        <button type="submit" style={primaryBtn}>Add expense</button>
      </form>

      <section style={{ ...card, padding: 0, overflow: "hidden" }}>
        {d.recent.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No transactions yet.</div>}
        {d.recent.map((t) => (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span>{t.description ?? (t.type === "inflow" ? "Income" : "Expense")}<span style={{ fontSize: 12, color: "#888" }}>{t.category ? ` · ${t.category}` : ""}</span></span>
            <span style={{ fontSize: 12, color: t.type === "inflow" ? "#0f6e56" : "#a32d2d", textTransform: "capitalize" }}>{t.type}</span>
            <span style={{ fontWeight: 500, textAlign: "right", color: t.type === "inflow" ? "#0f6e56" : "#a32d2d" }}>{t.type === "inflow" ? "+" : "−"}{money(t.amountMinor)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

const metric: React.CSSProperties = { background: "#f6f8fa", borderRadius: 10, padding: "1rem" };
const mlabel: React.CSSProperties = { fontSize: 13, color: "#5f6b7a" };
const mvalue: React.CSSProperties = { fontSize: 22, fontWeight: 500, marginTop: 2 };
