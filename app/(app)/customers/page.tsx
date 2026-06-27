import { desc } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createCustomer } from "@/data/actions";

export const dynamic = "force-dynamic";

const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};

export default async function CustomersPage() {
  const session = await requireAuth();
  const rows = await withTenant(session.tenantId, (tx) =>
    tx.select().from(s.accounts).orderBy(desc(s.accounts.createdAt)),
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Customers</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Your companies and who to bill.</p>

      <form action={createCustomer} style={{ display: "flex", gap: 8, flexWrap: "wrap",
        background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 16 }}>
        <input name="name" required placeholder="Company name" style={{ ...input, flex: 2, minWidth: 160 }} />
        <input name="billingEmail" type="email" placeholder="Billing email" style={{ ...input, flex: 2, minWidth: 160 }} />
        <input name="whatsapp" placeholder="WhatsApp number" style={{ ...input, flex: 1, minWidth: 130 }} />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none",
          background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add</button>
      </form>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No customers yet — add your first above.</div>}
        {rows.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span style={{ fontWeight: 500 }}>{c.name}</span>
            <span style={{ fontSize: 13, color: "#5f6b7a" }}>{c.billingEmail ?? "—"}{c.whatsapp ? ` · ${c.whatsapp}` : ""}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
