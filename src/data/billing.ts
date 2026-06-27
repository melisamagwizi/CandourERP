import { and, eq, inArray } from "drizzle-orm";
import { withTenant } from "../db";
import * as s from "../db/schema";

export type DraftLine = { productId: string; qty: number };

/**
 * Creates a draft invoice for a tenant. Totals and tax are computed
 * server-side from the price book (never trusted from the client), and the
 * invoice number is drawn atomically from the tenant's sequence.
 */
export async function createInvoiceFor(tenantId: string, accountId: string, rawLines: DraftLine[]) {
  const lines = rawLines.filter((l) => l.productId && l.qty > 0);
  if (!accountId || lines.length === 0) return null;

  return withTenant(tenantId, async (tx) => {
    const ids = lines.map((l) => l.productId);
    const prods = await tx.select().from(s.products).where(inArray(s.products.id, ids));
    const pmap = new Map(prods.map((p) => [p.id, p]));
    const taxes = await tx.select().from(s.taxCodes);
    const rateOf = new Map(taxes.map((t) => [t.id, t.rateBps]));
    const [tenant] = await tx.select().from(s.tenants).where(eq(s.tenants.id, tenantId));
    const currency = tenant?.baseCurrency ?? "USD";

    let subtotal = 0, taxTotal = 0;
    const lineRows: (typeof s.invoiceLines.$inferInsert)[] = [];
    for (const l of lines) {
      const p = pmap.get(l.productId);
      if (!p) continue;
      const lineTotal = p.unitPriceMinor * l.qty;
      const lineTax = p.taxCodeId ? Math.round((lineTotal * (rateOf.get(p.taxCodeId) ?? 0)) / 10000) : 0;
      subtotal += lineTotal;
      taxTotal += lineTax;
      lineRows.push({ tenantId, invoiceId: "", productId: p.id, description: p.name,
        qty: l.qty, unitPriceMinor: p.unitPriceMinor, taxCodeId: p.taxCodeId, lineTotalMinor: lineTotal });
    }
    if (lineRows.length === 0) return null;

    const [seq] = await tx.select().from(s.sequences)
      .where(and(eq(s.sequences.tenantId, tenantId), eq(s.sequences.docType, "invoice"))).for("update");
    const prefix = seq?.prefix ?? "INV-";
    const next = seq?.nextValue ?? 1;
    if (seq) {
      await tx.update(s.sequences).set({ nextValue: next + 1 })
        .where(and(eq(s.sequences.tenantId, tenantId), eq(s.sequences.docType, "invoice")));
    } else {
      await tx.insert(s.sequences).values({ tenantId, docType: "invoice", prefix, nextValue: next + 1 });
    }
    const number = prefix + String(next).padStart(4, "0");

    const [inv] = await tx.insert(s.invoices).values({
      tenantId, accountId, number, status: "draft", currency,
      issueDate: new Date().toISOString().slice(0, 10),
      subtotalMinor: subtotal, taxMinor: taxTotal, totalMinor: subtotal + taxTotal,
    }).returning();
    await tx.insert(s.invoiceLines).values(lineRows.map((r) => ({ ...r, invoiceId: inv.id })));

    return { id: inv.id, number, totalMinor: subtotal + taxTotal };
  });
}
