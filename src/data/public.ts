"use server";

import { eq } from "drizzle-orm";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";

export type LeadState = { ok: boolean; error: string | null };

/**
 * Public lead capture from a business's shareable storefront (/c/[slug]).
 * Unauthenticated — the tenant is identified only by the slug in the URL,
 * and RLS scopes every write to that one tenant. Creates an account +
 * contact + a pipeline opportunity so the lead lands in the founder's CRM.
 */
export async function captureLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const interest = String(formData.get("interest") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!slug || !name || !contact) return { ok: false, error: "Please add your name and how to reach you." };

  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.slug, slug));
  if (!tenant) return { ok: false, error: "This page is no longer available." };

  const isEmail = contact.includes("@");
  try {
    await withTenant(tenant.id, async (tx) => {
      const [acct] = await tx.insert(s.accounts).values({
        tenantId: tenant.id, name, isCustomer: false,
        billingEmail: isEmail ? contact : null,
        whatsapp: isEmail ? null : contact,
      }).returning();

      await tx.insert(s.contacts).values({
        tenantId: tenant.id, accountId: acct.id, name,
        email: isEmail ? contact : null, phone: isEmail ? null : contact,
      });

      let valueMinor = 0;
      if (interest) {
        const prods = await tx.select().from(s.products);
        valueMinor = prods.find((p) => p.name === interest)?.unitPriceMinor ?? 0;
      }
      const base = interest ? `Enquiry: ${interest}` : "Website enquiry";
      await tx.insert(s.opportunities).values({
        tenantId: tenant.id, accountId: acct.id,
        name: message ? `${base} — ${message.slice(0, 80)}` : base,
        valueMinor, currency: tenant.baseCurrency, stage: "lead",
      });
    });
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  return { ok: true, error: null };
}
