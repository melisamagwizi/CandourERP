import { desc, eq } from "drizzle-orm";
import SubmitButton from "@/components/SubmitButton";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createDeal, moveDeal, setFollowUp } from "@/data/actions";
import StageSelect from "@/components/StageSelect";
import DateSubmit from "@/components/DateSubmit";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { key: "lead", label: "New" }, { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" }, { key: "won", label: "Won" },
] as const;

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
const input: React.CSSProperties = { padding: "9px 11px", borderRadius: 10, border: "1px solid #e8e6e1", fontSize: 14, color: "#141414" };
const TEMP: Record<string, { bg: string; fg: string; label: string }> = {
  hot: { bg: "#faece7", fg: "#993c1d", label: "Hot" },
  warm: { bg: "#faeeda", fg: "#854f0b", label: "Warm" },
  cold: { bg: "#f1efe8", fg: "#5f5e5a", label: "Cold" },
};

export default async function SalesPage() {
  const session = await requireAuth();
  const today = new Date().toISOString().slice(0, 10);

  const { deals, accounts } = await withTenant(session.tenantId, async (tx) => {
    const deals = await tx.select({
      id: s.opportunities.id, name: s.opportunities.name, valueMinor: s.opportunities.valueMinor,
      stage: s.opportunities.stage, source: s.opportunities.source, nextFollowUpAt: s.opportunities.nextFollowUpAt,
      updatedAt: s.opportunities.updatedAt, customer: s.accounts.name,
    }).from(s.opportunities).leftJoin(s.accounts, eq(s.accounts.id, s.opportunities.accountId))
      .orderBy(desc(s.opportunities.createdAt));
    const accounts = await tx.select({ id: s.accounts.id, name: s.accounts.name }).from(s.accounts);
    return { deals, accounts };
  });

  const weighted = deals.filter((d) => d.stage !== "lost" && d.stage !== "won").reduce((sum, d) => sum + d.valueMinor, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Sales pipeline</h1>
          <p style={{ color: "#6b675f", marginTop: 0 }}>Move a deal to <strong>Won</strong> to auto-invoice and convert the lead to a customer.</p>
        </div>
        <span style={{ fontSize: 13, color: "#6b675f" }}>Open pipeline: <strong style={{ color: "#141414" }}>{money(weighted)}</strong></span>
      </div>

      <form action={createDeal} style={{ display: "flex", gap: 8, flexWrap: "wrap",
        background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1rem 1.25rem", margin: "16px 0" }}>
        <input aria-label="Deal name" name="name" required placeholder="Deal name" style={{ ...input, flex: 2, minWidth: 160 }} />
        <select name="accountId" style={{ ...input, flex: 1, minWidth: 140 }}>
          <option value="">No customer</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input aria-label="Value" name="value" type="number" step="0.01" min="0" placeholder="Value" style={{ ...input, width: 120 }} />
        <SubmitButton style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "#141414", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add deal</SubmitButton>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {COLUMNS.map((col) => {
          const items = deals.filter((d) => d.stage === col.key);
          return (
            <div key={col.key} style={{ background: "#f1f4f8", borderRadius: 14, padding: 10, minHeight: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: col.key === "won" ? "#0f6e56" : "#6b675f", marginBottom: 8, fontWeight: 500 }}>
                <span>{col.label}</span><span>{items.length}</span>
              </div>
              {items.map((d) => {
                const days = (Date.now() - new Date(d.updatedAt).getTime()) / 86400_000;
                const open = d.stage !== "won" && d.stage !== "lost";
                const temp = !open ? null : days > 14 ? "cold" : (d.valueMinor > 0 && days < 3 ? "hot" : "warm");
                const rotting = open && ((d.nextFollowUpAt && d.nextFollowUpAt <= today) || (!d.nextFollowUpAt && days > 7));
                return (
                  <div key={d.id} style={{ background: col.key === "won" ? "#e1f5ee" : "#fff",
                    border: "1px solid " + (rotting ? "#EF9F27" : col.key === "won" ? "#9fe1cb" : "#e8e6e1"),
                    borderLeft: rotting ? "3px solid #EF9F27" : undefined,
                    borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</span>
                      {temp && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, background: TEMP[temp].bg, color: TEMP[temp].fg }}>{TEMP[temp].label}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b675f" }}>{d.customer ?? "—"} · {money(d.valueMinor)}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "4px 0" }}>
                      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: d.source === "storefront" ? "#e6f1fb" : "#f1efe8", color: d.source === "storefront" ? "#185fa5" : "#5f5e5a" }}>{d.source}</span>
                      {rotting && <span style={{ fontSize: 10, color: "#854f0b" }}>⏰ follow up</span>}
                    </div>
                    {open && <DateSubmit dealId={d.id} value={d.nextFollowUpAt} action={setFollowUp} />}
                    <div style={{ marginTop: 6 }}><StageSelect dealId={d.id} stage={d.stage} action={moveDeal} /></div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
