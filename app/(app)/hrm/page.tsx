import { desc, eq, sql } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createEmployee, requestLeave, decideLeave } from "@/data/actions";
import { input, card, primaryBtn, money } from "@/ui";

export const dynamic = "force-dynamic";

const leaveColor: Record<string, string> = { pending: "#854f0b", approved: "#0f6e56", rejected: "#a32d2d" };

export default async function HrmPage() {
  const session = await requireAuth();
  const { employees, leave, usedByEmp } = await withTenant(session.tenantId, async (tx) => {
    const employees = await tx.select().from(s.employees).orderBy(desc(s.employees.createdAt));
    const leave = await tx.select({
      id: s.leaveRequests.id, type: s.leaveRequests.type, days: s.leaveRequests.days,
      status: s.leaveRequests.status, who: s.employees.name,
    }).from(s.leaveRequests).leftJoin(s.employees, eq(s.employees.id, s.leaveRequests.employeeId))
      .orderBy(desc(s.leaveRequests.createdAt)).limit(20);
    const used = await tx.select({
      employeeId: s.leaveRequests.employeeId,
      days: sql<number>`coalesce(sum(${s.leaveRequests.days}), 0)::int`,
    }).from(s.leaveRequests)
      .where(sql`${s.leaveRequests.status} = 'approved' and ${s.leaveRequests.type} <> 'unpaid' and extract(year from ${s.leaveRequests.createdAt}) = extract(year from now())`)
      .groupBy(s.leaveRequests.employeeId);
    const usedByEmp = new Map(used.map((u) => [u.employeeId, Number(u.days)]));
    return { employees, leave, usedByEmp };
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>People</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Your team and their leave.</p>

      <form action={createEmployee} style={{ display: "flex", gap: 8, flexWrap: "wrap", ...card, margin: "16px 0" }}>
        <input name="name" required placeholder="Full name" style={{ ...input, flex: 2, minWidth: 150 }} />
        <input name="title" placeholder="Job title" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input name="department" placeholder="Department" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input name="salary" type="number" step="0.01" min="0" placeholder="Monthly salary" style={{ ...input, width: 130 }} />
        <input name="entitlement" type="number" min="0" placeholder="Leave days/yr (21)" style={{ ...input, width: 140 }} />
        <button type="submit" style={primaryBtn}>Add employee</button>
      </form>

      <section style={{ ...card, padding: 0, marginBottom: 20 }}>
        {employees.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No employees yet.</div>}
        {employees.map((e) => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span style={{ fontWeight: 500 }}>{e.name}<span style={{ fontSize: 12, color: "#888" }}>{e.title ? ` · ${e.title}` : ""}</span></span>
            <span style={{ fontSize: 13, color: "#5f6b7a" }}>
              {e.department ?? "—"} · <span style={{ color: (e.leaveEntitlementDays - (usedByEmp.get(e.id) ?? 0)) <= 0 ? "#a32d2d" : "#5f6b7a" }}>
                {e.leaveEntitlementDays - (usedByEmp.get(e.id) ?? 0)} of {e.leaveEntitlementDays}d leave left</span>
            </span>
            <span style={{ fontSize: 12, color: "#5f6b7a", textTransform: "capitalize" }}>{e.status.replace("_", " ")}</span>
            <span style={{ fontSize: 13, textAlign: "right" }}>{money(e.salaryMinor)}</span>
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Leave requests</h2>
      {employees.length > 0 && (
        <form action={requestLeave} style={{ display: "flex", gap: 8, flexWrap: "wrap", ...card, marginBottom: 12 }}>
          <select name="employeeId" required style={{ ...input, flex: 1, minWidth: 150 }}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select name="type" style={{ ...input }}>
            <option value="annual">Annual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option>
          </select>
          <input name="days" type="number" min="1" defaultValue={1} style={{ ...input, width: 80 }} />
          <button type="submit" style={primaryBtn}>Request</button>
        </form>
      )}
      <section style={{ ...card, padding: 0 }}>
        {leave.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No leave requests.</div>}
        {leave.map((l) => (
          <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1.5fr auto auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span>{l.who ?? "—"} <span style={{ fontSize: 12, color: "#888" }}>· {l.type}, {l.days}d</span></span>
            <span style={{ fontSize: 12, color: leaveColor[l.status], textTransform: "capitalize" }}>{l.status}</span>
            {l.status === "pending" ? (
              <>
                <form action={decideLeave}><input type="hidden" name="leaveId" value={l.id} /><input type="hidden" name="decision" value="approved" />
                  <button type="submit" style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid #1d9e75", background: "#e1f5ee", color: "#0f6e56", cursor: "pointer" }}>Approve</button></form>
                <form action={decideLeave}><input type="hidden" name="leaveId" value={l.id} /><input type="hidden" name="decision" value="rejected" />
                  <button type="submit" style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "0.5px solid #e2b4b4", background: "#fff", color: "#a32d2d", cursor: "pointer" }}>Reject</button></form>
              </>
            ) : <><span /><span /></>}
          </div>
        ))}
      </section>
    </div>
  );
}
