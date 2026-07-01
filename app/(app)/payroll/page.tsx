import { desc, eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { runPayroll } from "@/data/actions";
import { input, card, primaryBtn, money } from "@/ui";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const session = await requireAuth();
  const { runs, activeCount, slipsByRun } = await withTenant(session.tenantId, async (tx) => {
    const runs = await tx.select().from(s.payRuns).orderBy(desc(s.payRuns.createdAt)).limit(6);
    const active = await tx.select().from(s.employees).where(eq(s.employees.status, "active"));
    const slipsByRun: Record<string, { name: string; gross: number; ded: number; net: number }[]> = {};
    for (const r of runs) {
      const slips = await tx.select().from(s.payslips).where(eq(s.payslips.payRunId, r.id));
      slipsByRun[r.id] = slips.map((p) => ({ name: p.employeeName ?? "—", gross: p.grossMinor, ded: p.deductionsMinor, net: p.netMinor }));
    }
    return { runs, activeCount: active.length, slipsByRun };
  });

  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Payroll</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Run pay for your team and generate payslips.</p>

      <form action={runPayroll} style={{ display: "flex", gap: 8, alignItems: "center", ...card, margin: "16px 0" }}>
        <input name="period" defaultValue={thisMonth} placeholder="2026-07" style={{ ...input, width: 130 }} />
        <button type="submit" style={primaryBtn} disabled={activeCount === 0}>Run payroll ({activeCount} active)</button>
        <span style={{ fontSize: 12, color: "#8a809e" }}>Deductions are an estimate; statutory country packs come later.</span>
      </form>

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
