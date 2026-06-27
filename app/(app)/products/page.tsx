import { desc } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createProduct } from "@/data/actions";

export const dynamic = "force-dynamic";

const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};

export default async function ProductsPage() {
  const session = await requireAuth();
  const rows = await withTenant(session.tenantId, (tx) =>
    tx.select().from(s.products).orderBy(desc(s.products.createdAt)),
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Products &amp; services</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Your price book — what you sell, and for how much.</p>

      <form action={createProduct} style={{ display: "flex", gap: 8, flexWrap: "wrap",
        background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 16 }}>
        <input name="code" required placeholder="Code (SVC-001)" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input name="name" required placeholder="Name" style={{ ...input, flex: 2, minWidth: 160 }} />
        <select name="type" style={{ ...input, flex: 1, minWidth: 110 }}>
          <option value="service">Service</option>
          <option value="product">Product</option>
        </select>
        <input name="price" type="number" step="0.01" min="0" required placeholder="Price" style={{ ...input, width: 110 }} />
        <button type="submit" style={{ padding: "9px 16px", borderRadius: 8, border: "none",
          background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add</button>
      </form>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#5f6b7a" }}>No items yet — add your first above.</div>}
        {rows.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 1.25rem", borderTop: "0.5px solid #eef2f6" }}>
            <span><span style={{ fontWeight: 500 }}>{p.name}</span> <span style={{ fontSize: 12, color: "#888" }}>· {p.code}</span></span>
            <span style={{ fontSize: 13, color: "#5f6b7a" }}>{p.type}</span>
            <span style={{ fontWeight: 500 }}>${(p.unitPriceMinor / 100).toFixed(2)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
