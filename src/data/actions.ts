"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { requireAuth } from "@/auth/current";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";

/* ------------------------------ Strategy ------------------------------ */
export async function updateStrategy(formData: FormData) {
  const { tenantId } = await requireAuth();
  const vision = String(formData.get("vision") ?? "").trim() || null;
  const mission = String(formData.get("mission") ?? "").trim() || null;
  await db.update(s.tenants).set({ vision, mission }).where(eq(s.tenants.id, tenantId));
  revalidatePath("/strategy");
}

export async function setObjectiveStatus(formData: FormData) {
  const { tenantId } = await requireAuth();
  const objectiveId = String(formData.get("objectiveId") ?? "");
  const status = String(formData.get("status") ?? "") as "on_track" | "at_risk" | "behind";
  if (!objectiveId || !["on_track", "at_risk", "behind"].includes(status)) return;
  await withTenant(tenantId, (tx) => tx.update(s.objectives).set({ status }).where(eq(s.objectives.id, objectiveId)));
  revalidatePath("/strategy");
}

/* -------------------------------- HRM --------------------------------- */
export async function createEmployee(formData: FormData) {
  const { tenantId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const email = String(formData.get("email") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim() || null;
  const department = String(formData.get("department") ?? "").trim() || null;
  const salaryMinor = Math.round((parseFloat(String(formData.get("salary") ?? "0")) || 0) * 100);
  await withTenant(tenantId, (tx) => tx.insert(s.employees).values({ tenantId, name, email, title, department, salaryMinor }));
  revalidatePath("/hrm");
  revalidatePath("/payroll");
}

export async function requestLeave(formData: FormData) {
  const { tenantId } = await requireAuth();
  const employeeId = String(formData.get("employeeId") ?? "");
  if (!employeeId) return;
  const type = String(formData.get("type") ?? "annual");
  const startDate = String(formData.get("startDate") ?? "") || null;
  const endDate = String(formData.get("endDate") ?? "") || null;
  const days = Math.max(1, parseInt(String(formData.get("days") ?? "1")) || 1);
  await withTenant(tenantId, (tx) => tx.insert(s.leaveRequests).values({ tenantId, employeeId, type, startDate, endDate, days }));
  revalidatePath("/hrm");
}

export async function decideLeave(formData: FormData) {
  const { tenantId } = await requireAuth();
  const leaveId = String(formData.get("leaveId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  if (!leaveId || !["approved", "rejected"].includes(decision)) return;
  await withTenant(tenantId, (tx) => tx.update(s.leaveRequests).set({ status: decision }).where(eq(s.leaveRequests.id, leaveId)));
  revalidatePath("/hrm");
}

/* ------------------------------ Payroll ------------------------------- */
export async function runPayroll(formData: FormData) {
  const { tenantId } = await requireAuth();
  const period = String(formData.get("period") ?? "").trim() || new Date().toISOString().slice(0, 7);
  await withTenant(tenantId, async (tx) => {
    const emps = await tx.select().from(s.employees).where(eq(s.employees.status, "active"));
    if (emps.length === 0) return;
    const [run] = await tx.insert(s.payRuns).values({ tenantId, period, status: "draft" }).returning();
    let gross = 0, net = 0;
    const slips = emps.map((e) => {
      const g = e.salaryMinor;
      const d = Math.round(g * 0.15); // placeholder estimated deductions (statutory packs to come)
      gross += g; net += g - d;
      return { tenantId, payRunId: run.id, employeeId: e.id, employeeName: e.name, grossMinor: g, deductionsMinor: d, netMinor: g - d };
    });
    await tx.insert(s.payslips).values(slips);
    await tx.update(s.payRuns).set({ grossMinor: gross, netMinor: net }).where(eq(s.payRuns.id, run.id));
  });
  revalidatePath("/payroll");
}

/* -------------------------------- Stock ------------------------------- */
export async function recordStockMovement(formData: FormData) {
  const { tenantId } = await requireAuth();
  const productId = String(formData.get("productId") ?? "");
  const delta = parseInt(String(formData.get("delta") ?? "0")) || 0;
  if (!productId || delta === 0) return;
  const reason = String(formData.get("reason") ?? "").trim() || null;
  await withTenant(tenantId, async (tx) => {
    await tx.insert(s.stockMovements).values({ tenantId, productId, delta, reason });
    await tx.update(s.products).set({ stockQty: sql`${s.products.stockQty} + ${delta}` }).where(eq(s.products.id, productId));
  });
  revalidatePath("/stock");
}

/* ------------------------------- Assets ------------------------------- */
export async function createAsset(formData: FormData) {
  const { tenantId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const category = String(formData.get("category") ?? "").trim() || null;
  const serialNo = String(formData.get("serialNo") ?? "").trim() || null;
  const assignedTo = String(formData.get("assignedTo") ?? "").trim() || null;
  const acquisitionMinor = Math.round((parseFloat(String(formData.get("acquisition") ?? "0")) || 0) * 100);
  await withTenant(tenantId, (tx) => tx.insert(s.assets).values({ tenantId, name, category, serialNo, assignedTo, acquisitionMinor }));
  revalidatePath("/assets");
}

export async function updateAssetStatus(formData: FormData) {
  const { tenantId } = await requireAuth();
  const assetId = String(formData.get("assetId") ?? "");
  const status = String(formData.get("status") ?? "") as "in_use" | "in_repair" | "retired" | "disposed";
  if (!assetId || !["in_use", "in_repair", "retired", "disposed"].includes(status)) return;
  await withTenant(tenantId, (tx) => tx.update(s.assets).set({ status }).where(eq(s.assets.id, assetId)));
  revalidatePath("/assets");
}
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
    tx.insert(s.opportunities).values({ tenantId, name, accountId, valueMinor, stage: "lead", source: "manual" }),
  );
  revalidatePath("/sales");
}

export async function setFollowUp(formData: FormData) {
  const { tenantId } = await requireAuth();
  const dealId = String(formData.get("dealId") ?? "");
  const date = String(formData.get("date") ?? "") || null;
  if (!dealId) return;
  await withTenant(tenantId, (tx) =>
    tx.update(s.opportunities).set({ nextFollowUpAt: date, updatedAt: new Date() }).where(eq(s.opportunities.id, dealId)),
  );
  revalidatePath("/sales");
  revalidatePath("/dashboard");
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
    // Rule: winning a deal converts the lead's account into a customer.
    if (won && deal.accountId) {
      await tx.update(s.accounts).set({ isCustomer: true }).where(eq(s.accounts.id, deal.accountId));
    }
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

export async function createProject(formData: FormData) {
  const { tenantId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const accountId = String(formData.get("accountId") ?? "") || null;
  const budgetMinor = Math.round((parseFloat(String(formData.get("budget") ?? "0")) || 0) * 100);
  await withTenant(tenantId, (tx) =>
    tx.insert(s.projects).values({ tenantId, name, accountId, budgetMinor }),
  );
  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function createTask(formData: FormData) {
  const { tenantId } = await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const projectId = String(formData.get("projectId") ?? "") || null;
  const assignee = String(formData.get("assignee") ?? "").trim() || null;
  const dueOn = String(formData.get("dueOn") ?? "") || null;
  await withTenant(tenantId, (tx) =>
    tx.insert(s.tasks).values({ tenantId, title, projectId, assignee, dueOn }),
  );
  revalidatePath("/operations");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function toggleTask(formData: FormData) {
  const { tenantId } = await requireAuth();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;
  const projectId = String(formData.get("projectId") ?? "");
  await withTenant(tenantId, async (tx) => {
    const [t] = await tx.select().from(s.tasks).where(eq(s.tasks.id, taskId));
    if (!t) return;
    await tx.update(s.tasks).set({ status: t.status === "done" ? "todo" : "done" }).where(eq(s.tasks.id, taskId));
  });
  revalidatePath("/operations");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createObjective(formData: FormData) {
  const { tenantId } = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const target = String(formData.get("target") ?? "").trim() || null;
  await withTenant(tenantId, (tx) => tx.insert(s.objectives).values({ tenantId, name, target }));
  revalidatePath("/operations");
}

export async function createMeeting(formData: FormData) {
  const { tenantId } = await requireAuth();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const startsRaw = String(formData.get("startsAt") ?? "");
  const startsAt = startsRaw ? new Date(startsRaw) : null;
  const objectiveId = String(formData.get("objectiveId") ?? "") || null;
  await withTenant(tenantId, (tx) => tx.insert(s.meetings).values({ tenantId, title, startsAt, objectiveId }));
  revalidatePath("/operations");
}

export async function enableModule(formData: FormData) {
  const { tenantId } = await requireAuth();
  const slug = String(formData.get("slug") ?? "");
  if (!slug) return;
  const [t] = await db.select({ mods: s.tenants.enabledModules }).from(s.tenants).where(eq(s.tenants.id, tenantId));
  const current = t?.mods ?? [];
  if (!current.includes(slug)) {
    await db.update(s.tenants).set({ enabledModules: [...current, slug] }).where(eq(s.tenants.id, tenantId));
  }
  revalidatePath("/dashboard");
}

export async function disableModule(formData: FormData) {
  const { tenantId } = await requireAuth();
  const slug = String(formData.get("slug") ?? "");
  if (!slug) return;
  const [t] = await db.select({ mods: s.tenants.enabledModules }).from(s.tenants).where(eq(s.tenants.id, tenantId));
  const current = t?.mods ?? [];
  await db.update(s.tenants).set({ enabledModules: current.filter((m) => m !== slug) }).where(eq(s.tenants.id, tenantId));
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
