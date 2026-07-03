import { asc, eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { recordStockMovement, updateStockSettings } from "@/data/actions";
import { input, card, primaryBtn } from "@/ui";

export const dynamic = "force-dynamic";

const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function StockPage() {
  const session = await requireAuth();
  const items = await withTenant(session.tenantId, (tx) =>
    tx.select().from(s.products).where(eq(s.products.isStockable, true)).orderBy(asc(s.products.name)),
  );

  const valuation = items.reduce((sum, p) => sum + Math.max(0, p.stockQty) * (p.costPriceMinor ?? 0), 0);
  const lowCount = items.filter((p) => p.reorderLevel > 0 && p.stockQty <= p.reorderLevel).length;
  const missingCost = items.some((p) => !p.costPriceMinor);

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Stock control</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Invoicing a product deducts stock automatically. Mark items stockable in Products.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, margin: "16px 0" }}>
        <div style={{ background: "#f6f8fa", borderRadius: 10, padding: "1rem" }}>
          <div style={{ fontSize: 13, color: "#5f6b7a" }}>Inventory value (at cost)</div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{money(valuation)}</div>
          {missingCost && <div style={{ fontSize: 11, color: "#854f0b" }}>Some items have no cost price set</div>}
        </div>
        <div style={{ background: lowCount ? "#fcebeb" : "#f6f8fa", borderRadius: 10, padding: "1rem" }}>
          <div style={{ fontSize: 13, color: lowCount ? "#a32d2d" : "#5f6b7a" }}>Items low on stock</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: lowCount ? "#a32d2d" : "#1f2933" }}>{lowCount}</div>
        </div>
      </div>

      {items.length === 0 && (
        <div style={{ ...card, color: "#5f6b7a" }}>
          No stockable products yet. In Products &amp; Services, set an item&apos;s type to <strong>Product</strong>.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((p) => {
          const low = p.reorderLevel > 0 && p.stockQty <= p.reorderLevel;
          return (
            <div key={p.id} style={{ ...card }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.name} <span style={{ fontSize: 12, color: "#888" }}>· {p.code}</span></div>
                  <div style={{ fontSize: 13, color: low ? "#a32d2d" : "#5f6b7a" }}>
                    In stock: <strong>{p.stockQty}</strong>{low ? ` · at/below reorder level (${p.reorderLevel}) — reorder` : ""}
                    {p.costPriceMinor ? ` · worth ${money(Math.max(0, p.stockQty) * p.costPriceMinor)}` : ""}
                  </div>
                </div>
                <form action={recordStockMovement} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="hidden" name="productId" value={p.id} />
                  <input name="delta" type="number" required placeholder="+/- qty" style={{ ...input, width: 90 }} />
                  <input name="reason" placeholder="Reason" style={{ ...input, width: 120 }} />
                  <button type="submit" style={primaryBtn}>Record</button>
                </form>
              </div>
              <form action={updateStockSettings} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "0.5px solid #eef2f6" }}>
                <input type="hidden" name="productId" value={p.id} />
                <label style={{ fontSize: 12, color: "#5f6b7a" }}>Reorder at
                  <input name="reorderLevel" type="number" min="0" defaultValue={p.reorderLevel} style={{ ...input, width: 70, marginLeft: 6 }} />
                </label>
                <label style={{ fontSize: 12, color: "#5f6b7a" }}>Cost price $
                  <input name="cost" type="number" step="0.01" min="0" defaultValue={p.costPriceMinor ? (p.costPriceMinor / 100).toFixed(2) : ""} style={{ ...input, width: 90, marginLeft: 6 }} />
                </label>
                <button type="submit" style={{ padding: "6px 12px", borderRadius: 8, border: "0.5px solid #d9e2ec", background: "#fff", color: "#185fa5", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Save</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
