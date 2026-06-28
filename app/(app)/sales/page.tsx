import { desc, eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createDeal, moveDeal } from "@/data/actions";
import StageSelect from "@/components/StageSelect";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "lead", label: "New" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "won", label: "Won" },
] as const;

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};

export default async function SalesPage() {
  const session = await requireAuth();

  const { deals, accounts } = await withTenant(session.tenantId, async (tx) => {
    const deals = await tx.select({
      id: s.opportunities.id, name: s.opportunities.name, valueMinor: s.opportunities.valueMinor,
      stage: s.opportunities.stage, customer: s.accounts.name,
    }).from(s.opportunities).leftJoin(s.accounts, eq(s.accounts.id, s.opportunities.accountId))
      .orderBy(desc(s.opportunities.createdAt));
    const accounts = await tx.select({ id: s.accounts.id, name: s.accounts.name }).from(s.accounts);
    return { deals, accounts };
  });

  const weighted = deals.filter((d) => d.stage !== "lost" && d.stage !== "won")
    .reduce((sum, d) => sum + d.valueMinor, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Sales pipeline</h1>
          <p style={{ color: "#5f6b7a", marginTop: 0 }}>Move a deal to <strong>Won</strong> and Candour drafts the invoice automatically.</p>
        </div>
        <span style={{ fontSize: 13, color: "#5f6b7a" }}>Open pipeline: <strong style={{ color: "#1f2933" }}>{money(weighted)}</strong></span>
      </div>

      <form action={createDeal} style={{ display: "flex", gap: 8, flexWrap: "wrap",
        background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", margin: "16px 0" }}>
        <input name="name" required placeholder="Deal name" style={{ ...input, flex: 2, minWidth: 160 }} />
        <select name="accountId" style={{ ...input, flex: 1, minWidth: 140 }}>
          <option value="">No customer</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input name="value" type="number" step="0.01" min="0" placeholder="Value" style={{ ...input, width: 120 }} />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none",
          background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add deal</button>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {COLUMNS.map((col) => {
          const items = deals.filter((d) => d.stage === col.key);
          return (
            <div key={col.key} style={{ background: "#f1f4f8", borderRadius: 12, padding: 10, minHeight: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12,
                color: col.key === "won" ? "#0f6e56" : "#5f6b7a", marginBottom: 8, fontWeight: 500 }}>
                <span>{col.label}</span><span>{items.length}</span>
              </div>
              {items.map((d) => (
                <div key={d.id} style={{ background: col.key === "won" ? "#e1f5ee" : "#fff",
                  border: "0.5px solid " + (col.key === "won" ? "#9fe1cb" : "#e2e8f0"),
                  borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#5f6b7a" }}>{d.customer ?? "—"} · {money(d.valueMinor)}</div>
                  <StageSelect dealId={d.id} stage={d.stage} action={moveDeal} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
