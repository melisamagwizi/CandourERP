import { eq } from "drizzle-orm";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { logout } from "@/auth/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await requireAuth();

  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.id, session.tenantId));
  const invoices = await withTenant(session.tenantId, (tx) => tx.select().from(s.invoices));

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ color: "#185fa5", marginBottom: 4 }}>Candour ERP</h1>
          <p style={{ color: "#5f6b7a", marginTop: 0 }}>
            Signed in as {session.name} · {tenant?.name}
          </p>
        </div>
        <form action={logout}>
          <button type="submit" style={{ padding: "7px 12px", borderRadius: 8,
            border: "0.5px solid #d9e2ec", background: "#fff", cursor: "pointer", fontSize: 13 }}>
            Sign out
          </button>
        </form>
      </div>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12,
        padding: "1.25rem 1.5rem", marginTop: 16 }}>
        <div style={{ fontSize: 13, color: "#5f6b7a" }}>Invoices (tenant-scoped via RLS)</div>
        {invoices.length === 0 && <div>No invoices yet.</div>}
        {invoices.map((inv) => (
          <div key={inv.id} style={{ display: "flex", justifyContent: "space-between",
            padding: "8px 0", borderBottom: "0.5px solid #eef2f6" }}>
            <span>{inv.number}</span>
            <span style={{ color: "#5f6b7a" }}>{inv.status}</span>
            <span style={{ fontWeight: 500 }}>${(inv.totalMinor / 100).toFixed(2)}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
