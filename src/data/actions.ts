"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/auth/current";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import { createInvoiceFor } from "./billing";

export async function startTrial() {
  const { tenantId } = await requireAuth();
  const trialEndsAt = new Date(Date.now() + 7 * 86400_000);
  await db.update(s.tenants).set({ plan: "trialing", trialEndsAt }).where(eq(s.tenants.id, tenantId));
  redirect("/dashboard");
}

export async function createCustomer(formData: FormData) {
  const { tenantId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const billingEmail = String(formData.get("billingEmail") ?? "").trim() || null;
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;

  await withTenant(tenantId, (tx) =>
    tx.insert(s.accounts).values({ tenantId, name, billingEmail, whatsapp }),
  );
  revalidatePath("/customers");
  revalidatePath("/dashboard");
}

export async function createProduct(formData: FormData) {
  const { tenantId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  if (!name || !code) return;
  const type = String(formData.get("type")) === "product" ? "product" : "service";
  const unitPriceMinor = Math.round((parseFloat(String(formData.get("price") ?? "0")) || 0) * 100);

  await withTenant(tenantId, async (tx) => {
    const [tax] = await tx.select().from(s.taxCodes).where(eq(s.taxCodes.isDefault, true));
    await tx.insert(s.products).values({
      tenantId, code, name, type, unitPriceMinor, currency: "USD", taxCodeId: tax?.id,
    });
  });
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export async function createInvoice(formData: FormData) {
  const { tenantId } = await requireAuth();
  const accountId = String(formData.get("accountId") ?? "");
  let lines: { productId: string; qty: number }[] = [];
  try { lines = JSON.parse(String(formData.get("lines") ?? "[]")); } catch {}
  if (!accountId || lines.length === 0) return;

  await createInvoiceFor(tenantId, accountId, lines);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}
