import { asc, eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { recordStockMovement } from "@/data/actions";
import { input, card, primaryBtn } from "@/ui";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const session = await requireAuth();
  const items = await withTenant(session.tenantId, (tx) =>
    tx.select().from(s.products).where(eq(s.products.isStockable, true)).orderBy(asc(s.products.name)),
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Stock control</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Quantities for your stockable products. Mark items stockable in Products.</p>

      {items.length === 0 && (
        <div style={{ ...card, marginTop: 16, color: "#5f6b7a" }}>
          No stockable products yet. In Products &amp; Services, set an item&apos;s type to <strong>Product</strong>.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {items.map((p) => {
          const low = p.reorderLevel > 0 && p.stockQty <= p.reorderLevel;
          return (
            <div key={p.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 500 }}>{p.name} <span style={{ fontSize: 12, color: "#888" }}>· {p.code}</span></div>
                <div style={{ fontSize: 13, color: low ? "#a32d2d" : "#5f6b7a" }}>
                  In stock: <strong>{p.stockQty}</strong>{low ? " · low, reorder" : ""}
                </div>
              </div>
              <form action={recordStockMovement} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="hidden" name="productId" value={p.id} />
                <input name="delta" type="number" required placeholder="+/- qty" style={{ ...input, width: 90 }} />
                <input name="reason" placeholder="Reason" style={{ ...input, width: 130 }} />
                <button type="submit" style={primaryBtn}>Record</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
