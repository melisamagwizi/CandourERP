import { db, withTenant } from "@/db";
import * as s from "@/db/schema";

export const dynamic = "force-dynamic";

async function getData() {
  const tenants = await db.select().from(s.tenants);
  if (tenants.length === 0) return { ready: true, tenant: null, invoices: [] };
  const tenant = tenants[0];
  const invoices = await withTenant(tenant.id, (tx) =>
    tx.select().from(s.invoices),
  );
  return { ready: true, tenant, invoices };
}

export default async function Home() {
  let state: Awaited<ReturnType<typeof getData>> | null = null;
  let error: string | null = null;
  try {
    state = await getData();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1 style={{ color: "#185fa5", marginBottom: 4 }}>Candour ERP</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Foundation is live. Cash loop next.</p>

      {error && (
        <pre style={{ background: "#fcebeb", padding: 16, borderRadius: 8, color: "#a32d2d", whiteSpace: "pre-wrap" }}>
          Database not ready yet. Run the setup in the README.
          {"\n\n"}{error}
        </pre>
      )}

      {state?.tenant && (
        <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
          <div style={{ fontSize: 13, color: "#5f6b7a" }}>Tenant</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>{state.tenant.name}</div>
          <div style={{ fontSize: 13, color: "#5f6b7a" }}>Invoices (tenant-scoped via RLS)</div>
          {state.invoices.length === 0 && <div>No invoices yet — run <code>npm run db:seed</code>.</div>}
          {state.invoices.map((inv) => (
            <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #eef2f6" }}>
              <span>{inv.number}</span>
              <span style={{ color: "#5f6b7a" }}>{inv.status}</span>
              <span style={{ fontWeight: 500 }}>${(inv.totalMinor / 100).toFixed(2)}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
