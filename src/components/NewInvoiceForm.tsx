"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";

type Account = { id: string; name: string };
type Product = { id: string; name: string; unitPriceMinor: number; rateBps: number };
type Line = { productId: string; qty: number };

const money = (m: number) => "$" + (m / 100).toFixed(2);
const input: React.CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};

export default function NewInvoiceForm({
  accounts, products, action,
}: {
  accounts: Account[];
  products: Product[];
  action: (formData: FormData) => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([{ productId: products[0]?.id ?? "", qty: 1 }]);
  const pmap = new Map(products.map((p) => [p.id, p]));

  const calc = lines.map((l) => {
    const p = pmap.get(l.productId);
    const total = p ? p.unitPriceMinor * l.qty : 0;
    const tax = p ? Math.round((total * p.rateBps) / 10000) : 0;
    return { total, tax };
  });
  const subtotal = calc.reduce((a, c) => a + c.total, 0);
  const taxTotal = calc.reduce((a, c) => a + c.tax, 0);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines([...lines, { productId: products[0]?.id ?? "", qty: 1 }]);
  const removeLine = (i: number) => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : lines);

  const valid = lines.filter((l) => l.productId && l.qty > 0);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 620 }}>
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="lines" value={JSON.stringify(valid)} />

      <label style={{ fontSize: 13, color: "#5f6b7a" }}>Customer
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ ...input, display: "block", width: "100%", marginTop: 4 }}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>

      <div style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem" }}>
        <div style={{ fontSize: 13, color: "#5f6b7a", marginBottom: 8 }}>Items (from your price book)</div>
        {lines.map((l, i) => {
          const p = pmap.get(l.productId);
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })} style={{ ...input, flex: 1 }}>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" min="1" value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(1, parseInt(e.target.value) || 1) })} style={{ ...input, width: 64 }} />
              <span style={{ width: 90, textAlign: "right", fontSize: 14 }}>{money((p?.unitPriceMinor ?? 0) * l.qty)}</span>
              <button type="button" onClick={() => removeLine(i)} aria-label="Remove line"
                style={{ border: "none", background: "transparent", color: "#a32d2d", cursor: "pointer", fontSize: 16, width: 24 }}>×</button>
            </div>
          );
        })}
        <button type="button" onClick={addLine} style={{ border: "none", background: "transparent", color: "#185fa5", cursor: "pointer", fontSize: 14, padding: "4px 0" }}>+ Add item</button>
      </div>

      <div style={{ background: "#f6f8fa", borderRadius: 12, padding: "11px 14px", fontSize: 14, maxWidth: 280, alignSelf: "flex-end", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#5f6b7a" }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#5f6b7a" }}><span>Tax</span><span>{money(taxTotal)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 500, borderTop: "0.5px solid #d9e2ec", marginTop: 4, paddingTop: 6 }}><span>Total</span><span>{money(subtotal + taxTotal)}</span></div>
      </div>

      <SubmitButton disabled={valid.length === 0} style={{ alignSelf: "flex-start", padding: "10px 18px",
        borderRadius: 8, border: "none", background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer",
        opacity: valid.length === 0 ? 0.5 : 1 }}>
        Create invoice
      </SubmitButton>
    </form>
  );
}
