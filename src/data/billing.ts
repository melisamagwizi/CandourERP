import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { withTenant } from "../db";
import * as s from "../db/schema";

function advanceCadence(dateStr: string, cadence: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + (cadence === "annual" ? 12 : cadence === "quarterly" ? 3 : 1));
  return d.toISOString().slice(0, 10);
}

/** Generates invoices for a tenant's due recurring schedules. Returns how many were created. */
export async function runDueRecurringFor(tenantId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const due = await withTenant(tenantId, (tx) =>
    tx.select().from(s.recurringSchedules)
      .where(and(eq(s.recurringSchedules.active, true), lte(s.recurringSchedules.nextRunOn, today))),
  );
  let created = 0;
  for (const sch of due) {
    if (!sch.productId) continue;
    const inv = await createInvoiceFor(tenantId, sch.accountId, [{ productId: sch.productId, qty: sch.qty }]);
    if (inv) created++;
    const next = advanceCadence(sch.nextRunOn, sch.cadence);
    await withTenant(tenantId, (tx) =>
      tx.update(s.recurringSchedules).set({ nextRunOn: next }).where(eq(s.recurringSchedules.id, sch.id)),
    );
  }
  return created;
}

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

    // Rule: invoicing a stockable product decrements inventory, with a movement trail.
    for (const l of lines) {
      const p = pmap.get(l.productId);
      if (p?.isStockable) {
        await tx.insert(s.stockMovements).values({ tenantId, productId: p.id, delta: -l.qty, reason: `Invoice ${number}` });
        await tx.update(s.products).set({ stockQty: sql`${s.products.stockQty} - ${l.qty}` }).where(eq(s.products.id, p.id));
      }
    }
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

/** Creates a draft invoice from free-text lines (e.g. billed timesheets), with default tax. */
export async function createInvoiceAdhoc(tenantId: string, accountId: string, lines: { description: string; qty: number; unitPriceMinor: number }[]) {
  if (!accountId || lines.length === 0) return null;
  return withTenant(tenantId, async (tx) => {
    const [tax] = await tx.select().from(s.taxCodes).where(eq(s.taxCodes.isDefault, true));
    const rate = tax?.rateBps ?? 0;
    const [tenant] = await tx.select().from(s.tenants).where(eq(s.tenants.id, tenantId));
    let subtotal = 0, taxTotal = 0;
    const rows = lines.map((l) => {
      const lineTotal = l.unitPriceMinor * l.qty;
      subtotal += lineTotal;
      taxTotal += Math.round((lineTotal * rate) / 10000);
      return { tenantId, invoiceId: "", description: l.description, qty: l.qty, unitPriceMinor: l.unitPriceMinor, taxCodeId: tax?.id, lineTotalMinor: lineTotal };
    });
    const number = await nextInvoiceNumber(tx, tenantId);
    const [inv] = await tx.insert(s.invoices).values({
      tenantId, accountId, number, status: "draft", currency: tenant?.baseCurrency ?? "USD",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10),
      subtotalMinor: subtotal, taxMinor: taxTotal, totalMinor: subtotal + taxTotal,
    }).returning();
    await tx.insert(s.invoiceLines).values(rows.map((r) => ({ ...r, invoiceId: inv.id })));
    return { id: inv.id, number, totalMinor: subtotal + taxTotal };
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
