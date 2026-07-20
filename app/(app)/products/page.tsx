import { desc } from "drizzle-orm";
import SubmitButton from "@/components/SubmitButton";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createProduct } from "@/data/actions";

export const dynamic = "force-dynamic";

const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 10, border: "1px solid #e8e6e1", fontSize: 14, color: "#141414",
};

export default async function ProductsPage() {
  const session = await requireAuth();
  const rows = await withTenant(session.tenantId, (tx) =>
    tx.select().from(s.products).orderBy(desc(s.products.createdAt)),
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Products &amp; services</h1>
      <p style={{ color: "#6b675f", marginTop: 0 }}>Your price book — what you sell, and for how much.</p>

      <form action={createProduct} style={{ display: "flex", gap: 8, flexWrap: "wrap",
        background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: 16 }}>
        <input aria-label="Code (SVC-001)" name="code" required placeholder="Code (SVC-001)" style={{ ...input, flex: 1, minWidth: 120 }} />
        <input aria-label="Name" name="name" required placeholder="Name" style={{ ...input, flex: 2, minWidth: 160 }} />
        <select name="type" style={{ ...input, flex: 1, minWidth: 110 }}>
          <option value="service">Service</option>
          <option value="product">Product</option>
        </select>
        <input aria-label="Price" name="price" type="number" step="0.01" min="0" required placeholder="Price" style={{ ...input, width: 110 }} />
        <SubmitButton style={{ padding: "9px 16px", borderRadius: 10, border: "none",
          background: "#141414", color: "#fff", fontWeight: 500, cursor: "pointer" }}>Add</SubmitButton>
      </form>

      <section style={{ background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#6b675f" }}>No items yet — add your first above.</div>}
        {rows.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 1.25rem", borderTop: "1px solid #f1efec" }}>
            <span><span style={{ fontWeight: 500 }}>{p.name}</span> <span style={{ fontSize: 12, color: "#8a867e" }}>· {p.code}</span></span>
            <span style={{ fontSize: 13, color: "#6b675f" }}>{p.type}</span>
            <span style={{ fontWeight: 500 }}>${(p.unitPriceMinor / 100).toFixed(2)}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
