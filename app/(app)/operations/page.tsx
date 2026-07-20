import { desc, eq, isNull } from "drizzle-orm";
import SubmitButton from "@/components/SubmitButton";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createTask, toggleTask, createMeeting, createObjective } from "@/data/actions";

export const dynamic = "force-dynamic";

const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 10, border: "1px solid #e8e6e1", fontSize: 14, color: "#141414",
};
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1rem 1.25rem" };
const addBtn: React.CSSProperties = { padding: "9px 14px", borderRadius: 10, border: "none", background: "#141414", color: "#fff", fontWeight: 500, cursor: "pointer" };

export default async function OperationsPage() {
  const session = await requireAuth();

  const data = await withTenant(session.tenantId, async (tx) => {
    const tasks = await tx.select().from(s.tasks).where(isNull(s.tasks.projectId)).orderBy(desc(s.tasks.createdAt)).limit(30);
    const objectives = await tx.select().from(s.objectives).orderBy(desc(s.objectives.createdAt));
    const meetings = await tx.select({
      id: s.meetings.id, title: s.meetings.title, startsAt: s.meetings.startsAt, kpi: s.objectives.name,
    }).from(s.meetings).leftJoin(s.objectives, eq(s.objectives.id, s.meetings.objectiveId))
      .orderBy(desc(s.meetings.startsAt)).limit(20);
    return { tasks, objectives, meetings };
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Operations &amp; meetings</h1>
      <p style={{ color: "#6b675f", marginTop: 0 }}>Run the day-to-day — and tie every meeting to a goal.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 16 }}>

        {/* Tasks */}
        <section style={card}>
          <strong style={{ fontSize: 15 }}>Tasks</strong>
          <form action={createTask} style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
            <input aria-label="New task" name="title" required placeholder="New task" style={{ ...input, flex: 1 }} />
            <SubmitButton style={addBtn}>Add</SubmitButton>
          </form>
          {data.tasks.length === 0 && <div style={{ color: "#6b675f", fontSize: 13 }}>No tasks yet.</div>}
          {data.tasks.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: "1px solid #f1efec" }}>
              <form action={toggleTask}>
                <input type="hidden" name="taskId" value={t.id} />
                <button type="submit" aria-label="Toggle done" style={{ width: 19, height: 19, borderRadius: "50%",
                  border: "1.5px solid " + (t.status === "done" ? "#1d9e75" : "#d6d3cc"),
                  background: t.status === "done" ? "#1d9e75" : "#fff", color: "#fff", cursor: "pointer", fontSize: 11 }}>{t.status === "done" ? "✓" : ""}</button>
              </form>
              <span style={{ fontSize: 14, textDecoration: t.status === "done" ? "line-through" : "none",
                color: t.status === "done" ? "#6b675f" : "#141414" }}>{t.title}</span>
            </div>
          ))}
        </section>

        {/* Goals / KPIs */}
        <section style={card}>
          <strong style={{ fontSize: 15 }}>Goals &amp; KPIs</strong>
          <form action={createObjective} style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
            <input aria-label="Objective" name="name" required placeholder="Objective" style={{ ...input, flex: 2 }} />
            <input aria-label="Target" name="target" placeholder="Target" style={{ ...input, flex: 1, minWidth: 70 }} />
            <SubmitButton style={addBtn}>Add</SubmitButton>
          </form>
          {data.objectives.length === 0 && <div style={{ color: "#6b675f", fontSize: 13 }}>Add a goal so meetings can link to it.</div>}
          {data.objectives.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: "1px solid #f1efec", fontSize: 14 }}>
              <span>{o.name}</span><span style={{ color: "#6b675f", fontSize: 13 }}>{o.target ?? "—"}</span>
            </div>
          ))}
        </section>

        {/* Meetings */}
        <section style={{ ...card, gridColumn: "1 / -1" }}>
          <strong style={{ fontSize: 15 }}>Meetings</strong>
          <form action={createMeeting} style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 12px" }}>
            <input aria-label="Meeting title" name="title" required placeholder="Meeting title" style={{ ...input, flex: 2, minWidth: 160 }} />
            <input name="startsAt" type="datetime-local" style={{ ...input }} />
            <select name="objectiveId" style={{ ...input, flex: 1, minWidth: 160 }} required>
              <option value="">Link to a goal…</option>
              {data.objectives.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <SubmitButton style={addBtn}>Schedule</SubmitButton>
          </form>
          {data.meetings.length === 0 && <div style={{ color: "#6b675f", fontSize: 13 }}>No meetings scheduled.</div>}
          {data.meetings.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "1px solid #f1efec" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: "#6b675f" }}>{m.startsAt ? new Date(m.startsAt).toLocaleString() : "No date"}</div>
              </div>
              {m.kpi && <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: "#e6f1fb", color: "#185fa5" }}>◎ {m.kpi}</span>}
            </div>
          ))}
        </section>

      </div>
    </div>
  );
}
