import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createTask, toggleTask, logTime, billProjectTime } from "@/data/actions";

export const dynamic = "force-dynamic";

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
const input: React.CSSProperties = { padding: "9px 11px", borderRadius: 10, border: "1px solid #e8e6e1", fontSize: 14, color: "#141414" };
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
        <span style={{ fontSize: 13, color: "#6b675f" }}>{project.status.replace("_", " ")}</span>
      </div>

      <section style={{ background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1rem 1.25rem", marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: "#6b675f" }}>Budget {money(project.budgetMinor)} · Logged <strong style={{ color: overBudget ? "#a32d2d" : "#141414" }}>{money(logged)}</strong>{overBudget ? " · over budget" : ""}</span>
          <span style={{ color: "#6b675f" }}>Unbilled: <strong>{money(unbilled)}</strong></span>
        </div>
        {project.budgetMinor > 0 && (
          <div style={{ height: 8, background: "#f1efec", borderRadius: 4 }}>
            <div style={{ width: pct + "%", height: "100%", background: overBudget ? "#e24b4a" : "#185fa5", borderRadius: 4 }} />
          </div>
        )}
        {unbilled > 0 && project.accountId && (
          <form action={billProjectTime} style={{ marginTop: 10 }}>
            <input type="hidden" name="projectId" value={project.id} />
            <SubmitButton style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid #1d9e75", background: "#e1f5ee", color: "#0f6e56", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Bill {money(unbilled)} of time →
            </SubmitButton>
          </form>
        )}
      </section>

      <h2 style={{ fontSize: 15, margin: "1.5rem 0 0.5rem" }}>Tasks</h2>
      <form action={createTask} style={{ display: "flex", gap: 8, flexWrap: "wrap", background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: 12 }}>
        <input type="hidden" name="projectId" value={project.id} />
        <input aria-label="New task" name="title" required placeholder="New task" style={{ ...input, flex: 2, minWidth: 160 }} />
        <input aria-label="Assignee" name="assignee" placeholder="Assignee" style={{ ...input, flex: 1, minWidth: 110 }} />
        <input name="dueOn" type="date" style={{ ...input }} />
        <SubmitButton style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "#141414", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add</SubmitButton>
      </form>
      <section style={{ background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, overflow: "hidden" }}>
        {tasks.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#6b675f" }}>No tasks yet.</div>}
        {tasks.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 1.25rem", borderTop: "1px solid #f1efec" }}>
            <form action={toggleTask}><input type="hidden" name="taskId" value={t.id} /><input type="hidden" name="projectId" value={project.id} />
              <button type="submit" aria-label="Toggle done" style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid " + (t.status === "done" ? "#1d9e75" : "#d6d3cc"), background: t.status === "done" ? "#1d9e75" : "#fff", color: "#fff", cursor: "pointer", fontSize: 12, lineHeight: "16px" }}>{t.status === "done" ? "✓" : ""}</button></form>
            <span style={{ flex: 1, fontSize: 14, textDecoration: t.status === "done" ? "line-through" : "none", color: t.status === "done" ? "#6b675f" : "#141414" }}>{t.title}</span>
            {t.assignee && <span style={{ fontSize: 12, color: "#6b675f" }}>{t.assignee}</span>}
            {t.dueOn && <span style={{ fontSize: 12, color: t.status !== "done" && t.dueOn < new Date().toISOString().slice(0, 10) ? "#a32d2d" : "#6b675f" }}>{t.dueOn}</span>}
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 15, margin: "1.5rem 0 0.5rem" }}>Time &amp; billing</h2>
      <form action={logTime} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: 12 }}>
        <input type="hidden" name="projectId" value={project.id} />
        <input aria-label="What you did" name="description" placeholder="What you did" style={{ ...input, flex: 2, minWidth: 150 }} />
        <input aria-label="Hours" name="hours" type="number" step="0.25" min="0" placeholder="Hours" style={{ ...input, width: 80 }} />
        <input aria-label="$/hr" name="rate" type="number" step="0.01" min="0" placeholder="$/hr" style={{ ...input, width: 80 }} />
        <label style={{ fontSize: 13, color: "#6b675f", display: "flex", gap: 5, alignItems: "center" }}><input type="checkbox" name="billable" defaultChecked /> billable</label>
        <SubmitButton style={{ padding: "9px 16px", borderRadius: 10, border: "none", background: "#141414", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Log</SubmitButton>
      </form>
      <section style={{ background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, overflow: "hidden" }}>
        {entries.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#6b675f" }}>No time logged yet.</div>}
        {entries.map((e) => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center", padding: "10px 1.25rem", borderTop: "1px solid #f1efec", fontSize: 13 }}>
            <span>{e.description ?? "Time"}</span>
            <span style={{ color: "#6b675f" }}>{(e.minutes / 60).toFixed(1)}h</span>
            <span style={{ fontSize: 11, color: e.invoiceId ? "#0f6e56" : e.billable ? "#854f0b" : "#6b675f" }}>{e.invoiceId ? "invoiced" : e.billable ? "unbilled" : "non-billable"}</span>
            <span style={{ fontWeight: 500, textAlign: "right" }}>{money(val(e.minutes, e.rateMinor))}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
