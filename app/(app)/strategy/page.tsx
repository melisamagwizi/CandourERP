import { desc, eq } from "drizzle-orm";
import SubmitButton from "@/components/SubmitButton";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { updateStrategy, setObjectiveStatus, createObjective } from "@/data/actions";
import { input, card, primaryBtn } from "@/ui";
import SelectForm from "@/components/SelectForm";

export const dynamic = "force-dynamic";

const RAG: Record<string, { bg: string; fg: string; label: string }> = {
  on_track: { bg: "#e1f5ee", fg: "#0f6e56", label: "On track" },
  at_risk: { bg: "#faeeda", fg: "#854f0b", label: "At risk" },
  behind: { bg: "#fcebeb", fg: "#a32d2d", label: "Behind" },
};

export default async function StrategyPage() {
  const session = await requireAuth();
  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.id, session.tenantId));
  const objectives = await withTenant(session.tenantId, (tx) => tx.select().from(s.objectives).orderBy(desc(s.objectives.createdAt)));

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Strategy</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Where you&apos;re headed, and how you&apos;ll know you&apos;re winning.</p>

      <form action={updateStrategy} style={{ ...card, marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ fontSize: 13, color: "#5f6b7a" }}>Vision
          <textarea name="vision" defaultValue={tenant?.vision ?? ""} rows={2} placeholder="Where the business is going…" style={{ ...input, width: "100%", boxSizing: "border-box", marginTop: 4, resize: "vertical" }} />
        </label>
        <label style={{ fontSize: 13, color: "#5f6b7a" }}>Mission
          <textarea name="mission" defaultValue={tenant?.mission ?? ""} rows={2} placeholder="Why you exist and who you serve…" style={{ ...input, width: "100%", boxSizing: "border-box", marginTop: 4, resize: "vertical" }} />
        </label>
        <SubmitButton style={{ ...primaryBtn, alignSelf: "flex-start" }}>Save</SubmitButton>
      </form>

      <h2 style={{ fontSize: 16, margin: "1.5rem 0 0.5rem" }}>KPIs &amp; objectives</h2>
      <form action={createObjective} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input aria-label="Objective" name="name" required placeholder="Objective" style={{ ...input, flex: 2 }} />
        <input aria-label="Target" name="target" placeholder="Target" style={{ ...input, flex: 1, minWidth: 90 }} />
        <SubmitButton style={primaryBtn}>Add</SubmitButton>
      </form>

      <section style={{ ...card, padding: 0 }}>
        {objectives.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>Add your first objective above.</div>}
        {objectives.map((o) => {
          const rag = RAG[o.status];
          return (
            <div key={o.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
              <span style={{ fontWeight: 500 }}>{o.name}</span>
              <span style={{ fontSize: 13, color: "#5f6b7a" }}>{o.target ?? "—"}</span>
              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: rag.bg, color: rag.fg }}>{rag.label}</span>
              <SelectForm hidden={{ objectiveId: o.id }} name="status" value={o.status} action={setObjectiveStatus}
                options={[{ value: "on_track", label: "On track" }, { value: "at_risk", label: "At risk" }, { value: "behind", label: "Behind" }]} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
