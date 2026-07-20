import Link from "next/link";
import { eq } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createInvoice } from "@/data/actions";
import NewInvoiceForm from "@/components/NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const session = await requireAuth();

  const { accounts, products } = await withTenant(session.tenantId, async (tx) => {
    const accounts = await tx.select({ id: s.accounts.id, name: s.accounts.name }).from(s.accounts);
    const products = await tx
      .select({ id: s.products.id, name: s.products.name, unitPriceMinor: s.products.unitPriceMinor, rateBps: s.taxCodes.rateBps })
      .from(s.products)
      .leftJoin(s.taxCodes, eq(s.taxCodes.id, s.products.taxCodeId));
    return { accounts, products };
  });

  if (accounts.length === 0 || products.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: 22 }}>New invoice</h1>
        <p style={{ color: "#6b675f" }}>
          First add at least one{" "}
          {accounts.length === 0 && <Link href="/customers" style={{ color: "#185fa5" }}>customer</Link>}
          {accounts.length === 0 && products.length === 0 && " and one "}
          {products.length === 0 && <Link href="/products" style={{ color: "#185fa5" }}>product or service</Link>}
          , then come back to bill them.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 16px" }}>New invoice</h1>
      <NewInvoiceForm
        accounts={accounts}
        products={products.map((p) => ({ ...p, rateBps: p.rateBps ?? 0 }))}
        action={createInvoice}
      />
    </div>
  );
}
