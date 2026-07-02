import { and, eq, inArray, sql } from "drizzle-orm";
import { withTenant } from "../db";
import * as s from "../db/schema";

export type DraftLine = { productId: string; qty: number };

// Atomic, gapless invoice number from the tenant's sequence.
async function nextInvoiceNumber(tx: any, tenantId: string): Promise<string> {
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
  return prefix + String(next).padStart(4, "0");
}

/**
 * Creates a draft invoice for a tenant. Totals and tax are computed
 * server-side from the price book (never trusted from the client).
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

    const number = await nextInvoiceNumber(tx, tenantId);
    const [inv] = await tx.insert(s.invoices).values({
      tenantId, accountId, number, status: "draft", currency,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
      subtotalMinor: subtotal, taxMinor: taxTotal, totalMinor: subtotal + taxTotal,
    }).returning();
    await tx.insert(s.invoiceLines).values(lineRows.map((r) => ({ ...r, invoiceId: inv.id })));
    return { id: inv.id, number, totalMinor: subtotal + taxTotal };
  });
}

/** Creates a draft invoice from a won deal: one line for the deal value, default tax applied. */
export async function createInvoiceFromDeal(tenantId: string, dealId: string) {
  return withTenant(tenantId, async (tx) => {
    const [deal] = await tx.select().from(s.opportunities).where(eq(s.opportunities.id, dealId));
    if (!deal || !deal.accountId) return null;
    const [tax] = await tx.select().from(s.taxCodes).where(eq(s.taxCodes.isDefault, true));
    const subtotal = deal.valueMinor ?? 0;
    const taxMinor = tax ? Math.round((subtotal * tax.rateBps) / 10000) : 0;

    const number = await nextInvoiceNumber(tx, tenantId);
    const [inv] = await tx.insert(s.invoices).values({
      tenantId, accountId: deal.accountId, number, status: "draft", currency: deal.currency,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
      subtotalMinor: subtotal, taxMinor, totalMinor: subtotal + taxMinor,
    }).returning();
    await tx.insert(s.invoiceLines).values({
      tenantId, invoiceId: inv.id, description: deal.name, qty: 1,
      unitPriceMinor: subtotal, taxCodeId: tax?.id, lineTotalMinor: subtotal,
    });
    return { id: inv.id, number };
  });
}

/** Records a (possibly partial) payment: posts a cash inflow and sets status paid/partial. */
export async function recordPaymentFor(tenantId: string, invoiceId: string, amountMinor: number) {
  if (amountMinor <= 0) return null;
  return withTenant(tenantId, async (tx) => {
    const [inv] = await tx.select().from(s.invoices).where(eq(s.invoices.id, invoiceId));
    if (!inv || inv.status === "void") return null;

    const [pay] = await tx.insert(s.payments)
      .values({ tenantId, invoiceId, amountMinor, method: "manual" }).returning();
    await tx.insert(s.transactions).values({
      tenantId, type: "inflow", amountMinor, currency: inv.currency,
      category: "Sales", description: `Invoice ${inv.number}`, paymentId: pay.id,
    });

    const [{ paid }] = await tx.select({ paid: sql<number>`coalesce(sum(${s.payments.amountMinor}), 0)::bigint` })
      .from(s.payments).where(eq(s.payments.invoiceId, invoiceId));
    const status = Number(paid) >= inv.totalMinor ? "paid" : "partial";
    await tx.update(s.invoices).set({ status }).where(eq(s.invoices.id, invoiceId));
    return { status, paid: Number(paid), total: inv.totalMinor };
  });
}

/** Marks an invoice paid: records the outstanding payment and posts a cash inflow to Finance. */
export async function markInvoicePaidFor(tenantId: string, invoiceId: string) {
  return withTenant(tenantId, async (tx) => {
    const [inv] = await tx.select().from(s.invoices).where(eq(s.invoices.id, invoiceId));
    if (!inv || inv.status === "paid" || inv.status === "void") return null;

    const [{ paid }] = await tx
      .select({ paid: sql<number>`coalesce(sum(${s.payments.amountMinor}), 0)::bigint` })
      .from(s.payments).where(eq(s.payments.invoiceId, invoiceId));
    const outstanding = inv.totalMinor - Number(paid);

    if (outstanding > 0) {
      const [pay] = await tx.insert(s.payments)
        .values({ tenantId, invoiceId, amountMinor: outstanding, method: "manual" }).returning();
      await tx.insert(s.transactions).values({
        tenantId, type: "inflow", amountMinor: outstanding, currency: inv.currency,
        category: "Sales", description: `Invoice ${inv.number}`, paymentId: pay.id,
      });
    }
    await tx.update(s.invoices).set({ status: "paid" }).where(eq(s.invoices.id, invoiceId));
    return { number: inv.number, amountMinor: outstanding };
  });
}
