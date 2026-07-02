import { desc, eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { runPayroll, createPayComponent, deletePayComponent } from "@/data/actions";
import { input, card, primaryBtn, money } from "@/ui";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const session = await requireAuth();
  const { runs, activeCount, slipsByRun, comps } = await withTenant(session.tenantId, async (tx) => {
    const runs = await tx.select().from(s.payRuns).orderBy(desc(s.payRuns.createdAt)).limit(6);
    const active = await tx.select().from(s.employees).where(eq(s.employees.status, "active"));
    const slipsByRun: Record<string, { name: string; gross: number; ded: number; net: number }[]> = {};
    for (const r of runs) {
      const slips = await tx.select().from(s.payslips).where(eq(s.payslips.payRunId, r.id));
      slipsByRun[r.id] = slips.map((p) => ({ name: p.employeeName ?? "—", gross: p.grossMinor, ded: p.deductionsMinor, net: p.netMinor }));
    }
    const comps = await tx.select().from(s.payComponents).orderBy(desc(s.payComponents.createdAt));
    return { runs, activeCount: active.length, slipsByRun, comps };
  });

  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Payroll</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Run pay for your team and generate payslips.</p>

      <form action={runPayroll} style={{ display: "flex", gap: 8, alignItems: "center", ...card, margin: "16px 0" }}>
        <input name="period" defaultValue={thisMonth} placeholder="2026-07" style={{ ...input, width: 130 }} />
        <button type="submit" style={primaryBtn} disabled={activeCount === 0}>Run payroll ({activeCount} active)</button>
        <span style={{ fontSize: 12, color: "#8a809e" }}>Pay is calculated from the components below.</span>
      </form>

      <section style={{ ...card, marginBottom: 16 }}>
        <strong style={{ fontSize: 15 }}>Deductions &amp; earnings</strong>
        <p style={{ fontSize: 12, color: "#8a809e", margin: "4px 0 10px" }}>Configure how pay is worked out — e.g. PAYE 15%, pension 5%, or a fixed allowance.</p>
        <form action={createPayComponent} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <input name="name" required placeholder="e.g. PAYE" style={{ ...input, flex: 1, minWidth: 120 }} />
          <select name="kind" style={input}><option value="deduction">Deduction</option><option value="earning">Earning</option></select>
          <select name="method" style={input}><option value="percent">Percent %</option><option value="fixed">Fixed amount</option></select>
          <input name="value" type="number" step="0.01" min="0" placeholder="15" style={{ ...input, width: 90 }} />
          <button type="submit" style={primaryBtn}>Add</button>
        </form>
        {comps.length === 0 && <div style={{ fontSize: 13, color: "#5f6b7a" }}>No components yet — net pay equals gross until you add deductions.</div>}
        {comps.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "0.5px solid #eef2f6", fontSize: 13 }}>
            <span>{c.name} <span style={{ fontSize: 11, color: c.kind === "earning" ? "#0f6e56" : "#a32d2d" }}>· {c.kind}</span></span>
            <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ color: "#5f6b7a" }}>{c.method === "percent" ? `${(c.rateBps ?? 0) / 100}%` : money(c.amountMinor ?? 0)}</span>
              <form action={deletePayComponent}><input type="hidden" name="id" value={c.id} />
                <button type="submit" aria-label="Remove" style={{ border: "none", background: "transparent", color: "#c0b9c9", cursor: "pointer", fontSize: 15 }}>×</button></form>
            </span>
          </div>
        ))}
      </section>

      {runs.length === 0 && <div style={{ ...card, color: "#5f6b7a" }}>No pay runs yet. Add employees in People, then run payroll.</div>}
      {runs.map((r) => (
        <section key={r.id} style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong>{r.period}</strong>
            <span style={{ fontSize: 13, color: "#5f6b7a" }}>Gross {money(r.grossMinor)} · Net {money(r.netMinor)}</span>
          </div>
          {slipsByRun[r.id]?.map((p, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 8, fontSize: 13, padding: "5px 0", borderTop: "0.5px solid #eef2f6" }}>
              <span>{p.name}</span>
              <span style={{ color: "#5f6b7a" }}>Gross {money(p.gross)}</span>
              <span style={{ color: "#a32d2d" }}>−{money(p.ded)}</span>
              <span style={{ fontWeight: 500, textAlign: "right" }}>{money(p.net)}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
