import "dotenv/config";
import { db, withTenant, client } from "./index";
import * as s from "./schema";
import { hashPassword } from "../auth/password";

// Minimal demo data: one tenant with an owner, a tax code, a customer,
// a price-book item, and a draft invoice — the cash loop end to end.
async function main() {
  const [tenant] = await db.insert(s.tenants)
    .values({ name: "Demo Co", slug: "demo", baseCurrency: "USD" })
    .returning();

  const [user] = await db.insert(s.users)
    .values({ email: "owner@demo.test", name: "Thandi",
      passwordHash: await hashPassword("candour123") })
    .returning();

  await withTenant(tenant.id, async (tx) => {
    const [role] = await tx.insert(s.roles)
      .values({ tenantId: tenant.id, name: "Owner", isSystem: true }).returning();

    await tx.insert(s.memberships)
      .values({ tenantId: tenant.id, userId: user.id, roleId: role.id });
    await tx.insert(s.rolePermissions)
      .values({ roleId: role.id, permission: "*.*.*" });

    const [vat] = await tx.insert(s.taxCodes)
      .values({ tenantId: tenant.id, name: "VAT 15%", rateBps: 1500, isDefault: true })
      .returning();

    const [acct] = await tx.insert(s.accounts)
      .values({ tenantId: tenant.id, name: "Acme Ltd", billingEmail: "billing@acme.test" })
      .returning();

    const [prod] = await tx.insert(s.products)
      .values({ tenantId: tenant.id, code: "SVC-001", name: "Consulting retainer",
        type: "service", unitPriceMinor: 250000, currency: "USD", taxCodeId: vat.id,
        isRecurring: true })
      .returning();

    const subtotal = 250000;
    const tax = Math.round(subtotal * vat.rateBps / 10000);
    const [inv] = await tx.insert(s.invoices)
      .values({ tenantId: tenant.id, accountId: acct.id, number: "INV-0001",
        status: "draft", currency: "USD",
        subtotalMinor: subtotal, taxMinor: tax, totalMinor: subtotal + tax })
      .returning();

    await tx.insert(s.invoiceLines)
      .values({ tenantId: tenant.id, invoiceId: inv.id, productId: prod.id,
        description: prod.name, qty: 1, unitPriceMinor: subtotal, taxCodeId: vat.id,
        lineTotalMinor: subtotal });

    // INV-0001 is taken, so the next generated number starts at 2.
    await tx.insert(s.sequences)
      .values({ tenantId: tenant.id, docType: "invoice", prefix: "INV-", nextValue: 2 });

    console.log(`✓ seeded tenant ${tenant.slug} with invoice ${inv.number} ($${(inv.totalMinor / 100).toFixed(2)})`);
  });
}

await main();
await client.end();
