import { desc, eq, sql } from "drizzle-orm";
import SubmitButton from "@/components/SubmitButton";
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
      status: s.leaveRequests.status, who: s.employees.name, employeeId: s.leaveRequests.employeeId,
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
      <p style={{ color: "#6b675f", marginTop: 0 }}>Your team and their leave.</p>

      <form action={createEmployee} style={{ display: "flex", gap: 8, flexWrap: "wrap", ...card, margin: "16px 0" }}>
        <input aria-label="Full name" name="name" required placeholder="Full name" style={{ ...input, flex: 2, minWidth: 150 }} />
        <input aria-label="Job title" name="title" placeholder="Job title" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input aria-label="Department" name="department" placeholder="Department" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input aria-label="Monthly salary" name="salary" type="number" step="0.01" min="0" placeholder="Monthly salary" style={{ ...input, width: 130 }} />
        <input aria-label="Leave days/yr (21)" name="entitlement" type="number" min="0" placeholder="Leave days/yr (21)" style={{ ...input, width: 140 }} />
        <SubmitButton style={primaryBtn}>Add employee</SubmitButton>
      </form>

      <section style={{ ...card, padding: 0, marginBottom: 20 }}>
        {employees.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#6b675f" }}>No employees yet.</div>}
        {employees.map((e) => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "1px solid #f1efec" }}>
            <span style={{ fontWeight: 500 }}>{e.name}<span style={{ fontSize: 12, color: "#8a867e" }}>{e.title ? ` · ${e.title}` : ""}</span></span>
            <span style={{ fontSize: 13, color: "#6b675f" }}>
              {e.department ?? "—"} · <span style={{ color: (e.leaveEntitlementDays - (usedByEmp.get(e.id) ?? 0)) <= 0 ? "#a32d2d" : "#6b675f" }}>
                {e.leaveEntitlementDays - (usedByEmp.get(e.id) ?? 0)} of {e.leaveEntitlementDays}d leave left</span>
            </span>
            <span style={{ fontSize: 12, color: "#6b675f", textTransform: "capitalize" }}>{e.status.replace("_", " ")}</span>
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
          <SubmitButton style={primaryBtn}>Request</SubmitButton>
        </form>
      )}
      <section style={{ ...card, padding: 0 }}>
        {leave.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#6b675f" }}>No leave requests.</div>}
        {leave.map((l) => (
          <div key={l.id} style={{ display: "grid", gridTemplateColumns: "1.5fr auto auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "1px solid #f1efec" }}>
            <span>{l.who ?? "—"} <span style={{ fontSize: 12, color: "#8a867e" }}>· {l.type}, {l.days}d</span></span>
            <span style={{ fontSize: 12, color: leaveColor[l.status], textTransform: "capitalize" }}>{l.status}</span>
            {l.status === "pending" ? (() => {
              const emp = employees.find((e) => e.id === l.employeeId);
              const remaining = emp ? emp.leaveEntitlementDays - (usedByEmp.get(emp.id) ?? 0) : 0;
              const overBalance = l.type !== "unpaid" && l.days > remaining;
              return (
                <>
                  {overBalance
                    ? <span style={{ fontSize: 12, color: "#854f0b" }} title={`Only ${remaining} day(s) left`}>exceeds balance ({remaining}d left)</span>
                    : <form action={decideLeave}><input type="hidden" name="leaveId" value={l.id} /><input type="hidden" name="decision" value="approved" />
                        <SubmitButton style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #1d9e75", background: "#e1f5ee", color: "#0f6e56", cursor: "pointer" }}>Approve</SubmitButton></form>}
                  <form action={decideLeave}><input type="hidden" name="leaveId" value={l.id} /><input type="hidden" name="decision" value="rejected" />
                    <SubmitButton style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid #e2b4b4", background: "#fff", color: "#a32d2d", cursor: "pointer" }}>Reject</SubmitButton></form>
                </>
              );
            })() : <><span /><span /></>}
          </div>
        ))}
      </section>
    </div>
  );
}
