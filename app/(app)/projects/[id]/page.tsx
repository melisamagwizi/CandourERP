import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createTask, toggleTask, logTime, billProjectTime } from "@/data/actions";

export const dynamic = "force-dynamic";

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
const input: React.CSSProperties = { padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933" };
const val = (mins: number, rate: number) => Math.round((mins / 60) * rate);

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const data = await withTenant(session.tenantId, async (tx) => {
    const [project] = await tx.select().from(s.projects).where(eq(s.projects.id, id));
    if (!project) return null;
    const tasks = await tx.select().from(s.tasks).where(eq(s.tasks.projectId, id)).orderBy(desc(s.tasks.createdAt));
    const entries = await tx.select().from(s.timeEntries).where(eq(s.timeEntries.projectId, id)).orderBy(desc(s.timeEntries.createdAt));
    return { project, tasks, entries };
  });
  if (!data) notFound();
  const { project, tasks, entries } = data;

  const logged = entries.filter((e) => e.billable).reduce((sum, e) => sum + val(e.minutes, e.rateMinor), 0);
  const unbilled = entries.filter((e) => e.billable && !e.invoiceId).reduce((sum, e) => sum + val(e.minutes, e.rateMinor), 0);
  const overBudget = project.budgetMinor > 0 && logged > project.budgetMinor;
  const pct = project.budgetMinor > 0 ? Math.min(100, Math.round((logged / project.budgetMinor) * 100)) : 0;

  return (
    <div style={{ maxWidth: 680 }}>
      <Link href="/projects" style={{ fontSize: 13, color: "#185fa5", textDecoration: "none" }}>← All projects</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 4px" }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>{project.name}</h1>
        <span style={{ fontSize: 13, color: "#5f6b7a" }}>{project.status.replace("_", " ")}</span>
      </div>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: "#5f6b7a" }}>Budget {money(project.budgetMinor)} · Logged <strong style={{ color: overBudget ? "#a32d2d" : "#1f2933" }}>{money(logged)}</strong>{overBudget ? " · over budget" : ""}</span>
          <span style={{ color: "#5f6b7a" }}>Unbilled: <strong>{money(unbilled)}</strong></span>
        </div>
        {project.budgetMinor > 0 && (
          <div style={{ height: 8, background: "#eef2f6", borderRadius: 4 }}>
            <div style={{ width: pct + "%", height: "100%", background: overBudget ? "#e24b4a" : "#185fa5", borderRadius: 4 }} />
          </div>
        )}
        {unbilled > 0 && project.accountId && (
          <form action={billProjectTime} style={{ marginTop: 10 }}>
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid #1d9e75", background: "#e1f5ee", color: "#0f6e56", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Bill {money(unbilled)} of time →
            </button>
          </form>
        )}
      </section>

      <h2 style={{ fontSize: 15, margin: "1.5rem 0 0.5rem" }}>Tasks</h2>
      <form action={createTask} style={{ display: "flex", gap: 8, flexWrap: "wrap", background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 12 }}>
        <input type="hidden" name="projectId" value={project.id} />
        <input name="title" required placeholder="New task" style={{ ...input, flex: 2, minWidth: 160 }} />
        <input name="assignee" placeholder="Assignee" style={{ ...input, flex: 1, minWidth: 110 }} />
        <input name="dueOn" type="date" style={{ ...input }} />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add</button>
      </form>
      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden" }}>
        {tasks.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No tasks yet.</div>}
        {tasks.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <form action={toggleTask}><input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="projectId" value={project.id} />
              <button type="submit" aria-label="Toggle done" style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid " + (t.status === "done" ? "#1d9e75" : "#cbd5e0"), background: t.status === "done" ? "#1d9e75" : "#fff", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: "16px" }}>{t.status === "done" ? "✓" : ""}</button></form>
            <span style={{ flex: 1, fontSize: 14, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? "#8a809e" : "#1f2933" }}>{t.title}</span>
            {t.assignee && <span style={{ fontSize: 12, color: "#5f6b7a" }}>{t.assignee}</span>}
            {t.dueOn && <span style={{ fontSize: 12, color: t.status !== "done" && t.dueOn < new Date().toISOString().slice(0, 10) ? "#a32d2d" : "#5f6b7a" }}>{t.dueOn}</span>}
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 15, margin: "1.5rem 0 0.5rem" }}>Time &amp; billing</h2>
      <form action={logTime} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 12 }}>
        <input type="hidden" name="projectId" value={project.id} />
        <input name="description" placeholder="What you did" style={{ ...input, flex: 2, minWidth: 150 }} />
        <input name="hours" type="number" step="0.25" min="0" placeholder="Hours" style={{ ...input, width: 80 }} />
        <input name="rate" type="number" step="0.01" min="0" placeholder="$/hr" style={{ ...input, width: 80 }} />
        <label style={{ fontSize: 13, color: "#5f6b7a", display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" name="billable" defaultChecked /> billable</label>
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Log</button>
      </form>
      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden" }}>
        {entries.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No time logged yet.</div>}
        {entries.map((e) => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center", padding: "10px 1.25rem", borderTop: "0.5px solid #eef2f6", fontSize: 13 }}>
            <span>{e.description ?? "Time"}</span>
            <span style={{ color: "#5f6b7a" }}>{(e.minutes / 60).toFixed(1)}h</span>
            <span style={{ fontSize: 11, color: e.invoiceId ? "#0f6e56" : e.billable ? "#854f0b" : "#8a809e" }}>{e.invoiceId ? "invoiced" : e.billable ? "unbilled" : "non-billable"}</span>
            <span style={{ fontWeight: 500, textAlign: "right" }}>{money(val(e.minutes, e.rateMinor))}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
