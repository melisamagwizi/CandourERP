"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/auth/current";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import { createInvoiceFor, createInvoiceFromDeal, markInvoicePaidFor } from "./billing";

const STAGES = ["lead", "qualified", "proposal", "won", "lost"] as const;
type Stage = (typeof STAGES)[number];

export async function createDeal(formData: FormData) {
  const { tenantId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const accountId = String(formData.get("accountId") ?? "") || null;
  const valueMinor = Math.round((parseFloat(String(formData.get("value") ?? "0")) || 0) * 100);

  await withTenant(tenantId, (tx) =>
    tx.insert(s.opportunities).values({ tenantId, name, accountId, valueMinor, stage: "lead" }),
  );
  revalidatePath("/sales");
}

export async function moveDeal(formData: FormData) {
  const { tenantId } = await requireAuth();
  const dealId = String(formData.get("dealId") ?? "");
  const stage = String(formData.get("stage") ?? "") as Stage;
  if (!dealId || !STAGES.includes(stage)) return;

  const newlyWon = await withTenant(tenantId, async (tx) => {
    const [deal] = await tx.select().from(s.opportunities).where(eq(s.opportunities.id, dealId));
    if (!deal) return false;
    const won = stage === "won" && deal.stage !== "won";
    await tx.update(s.opportunities).set({ stage, updatedAt: new Date() }).where(eq(s.opportunities.id, dealId));
    return won;
  });

  // Winning a deal auto-creates a draft invoice.
  if (newlyWon) await createInvoiceFromDeal(tenantId, dealId);
  revalidatePath("/sales");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function markInvoiceSent(formData: FormData) {
  const { tenantId } = await requireAuth();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;
  await withTenant(tenantId, (tx) =>
    tx.update(s.invoices).set({ status: "sent" })
      .where(and(eq(s.invoices.id, invoiceId), eq(s.invoices.status, "draft"))),
  );
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function markInvoicePaid(formData: FormData) {
  const { tenantId } = await requireAuth();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) return;

  await markInvoicePaidFor(tenantId, invoiceId);
  revalidatePath("/invoices");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function createExpense(formData: FormData) {
  const { tenantId } = await requireAuth();
  const amountMinor = Math.round((parseFloat(String(formData.get("amount") ?? "0")) || 0) * 100);
  if (amountMinor <= 0) return;
  const category = String(formData.get("category") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  await withTenant(tenantId, (tx) =>
    tx.insert(s.transactions).values({ tenantId, type: "expense", amountMinor, category, description }),
  );
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

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
