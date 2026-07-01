import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createProject } from "@/data/actions";

export const dynamic = "force-dynamic";

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { maximumFractionDigits: 0 });
const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};

export default async function ProjectsPage() {
  const session = await requireAuth();

  const { projects, accounts } = await withTenant(session.tenantId, async (tx) => {
    const projects = await tx.select({
      id: s.projects.id, name: s.projects.name, status: s.projects.status,
      budgetMinor: s.projects.budgetMinor, customer: s.accounts.name,
      open: sql<number>`(select count(*) from tasks where tasks.project_id = ${s.projects.id} and tasks.status <> 'done')::int`,
    }).from(s.projects).leftJoin(s.accounts, eq(s.accounts.id, s.projects.accountId))
      .orderBy(desc(s.projects.createdAt));
    const accounts = await tx.select({ id: s.accounts.id, name: s.accounts.name }).from(s.accounts);
    return { projects, accounts };
  });

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Projects</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Plan and deliver work for your clients.</p>

      <form action={createProject} style={{ display: "flex", gap: 8, flexWrap: "wrap",
        background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", margin: "16px 0" }}>
        <input name="name" required placeholder="Project name" style={{ ...input, flex: 2, minWidth: 160 }} />
        <select name="accountId" style={{ ...input, flex: 1, minWidth: 140 }}>
          <option value="">Internal / no client</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input name="budget" type="number" step="0.01" min="0" placeholder="Budget" style={{ ...input, width: 120 }} />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none",
          background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add project</button>
      </form>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden" }}>
        {projects.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No projects yet — add your first above.</div>}
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto",
            gap: 12, alignItems: "center", padding: "12px 1.25rem", borderTop: "0.5px solid #eef2f6",
            textDecoration: "none", color: "inherit" }}>
            <span style={{ fontWeight: 500, color: "#185fa5" }}>{p.name}</span>
            <span style={{ fontSize: 13, color: "#5f6b7a" }}>{p.customer ?? "Internal"}</span>
            <span style={{ fontSize: 12, color: "#5f6b7a" }}>{p.open} open</span>
            <span style={{ fontSize: 13, textAlign: "right" }}>{money(p.budgetMinor)}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
