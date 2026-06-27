import {
  pgTable, uuid, text, bigint, integer, boolean, timestamp, date,
  jsonb, pgEnum, uniqueIndex, index, primaryKey,
} from "drizzle-orm/pg-core";

// Shared timestamps used across business tables.
const ts = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ----------------------------- Foundation ----------------------------- */

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  baseCurrency: text("base_currency").notNull().default("USD"),
  industry: text("industry"),
  plan: text("plan").notNull().default("trial"),
  status: text("status").notNull().default("active"),
  ...ts,
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  ...ts,
});

// Server-side sessions. Part of the identity layer, so NOT under tenant
// RLS — it is looked up by token before any tenant context exists.
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  status: text("status").notNull().default("active"),
}, (t) => ({ uq: uniqueIndex("uq_member").on(t.tenantId, t.userId) }));

export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permission: text("permission").notNull(), // module.action.scope
}, (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permission] }) }));

export const taxCodes = pgTable("tax_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rateBps: integer("rate_bps").notNull(), // 1500 = 15%
  isDefault: boolean("is_default").notNull().default(false),
});

export const sequences = pgTable("sequences", {
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  docType: text("doc_type").notNull(),
  prefix: text("prefix").notNull().default(""),
  nextValue: integer("next_value").notNull().default(1),
}, (t) => ({ pk: primaryKey({ columns: [t.tenantId, t.docType] }) }));

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  action: text("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ byTenant: index("idx_audit_tenant").on(t.tenantId, t.at) }));

/* ------------------------------- CRM ---------------------------------- */

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isCustomer: boolean("is_customer").notNull().default(true),
  billingEmail: text("billing_email"),
  whatsapp: text("whatsapp"),
  whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
  ...ts,
}, (t) => ({ byTenant: index("idx_accounts_tenant").on(t.tenantId) }));

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsappOptIn: boolean("whatsapp_opt_in").notNull().default(false),
  ...ts,
});

/* ----------------------- Product & Services --------------------------- */

export const productType = pgEnum("product_type", ["product", "service"]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  type: productType("type").notNull().default("service"),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
  currency: text("currency").notNull().default("USD"),
  taxCodeId: uuid("tax_code_id").references(() => taxCodes.id),
  costPriceMinor: bigint("cost_price_minor", { mode: "number" }),
  isStockable: boolean("is_stockable").notNull().default(false),
  isRecurring: boolean("is_recurring").notNull().default(false),
  ...ts,
}, (t) => ({ uq: uniqueIndex("uq_product_code").on(t.tenantId, t.code) }));

/* ------------------------------ Billing ------------------------------- */

export const invoiceStatus = pgEnum("invoice_status",
  ["draft", "sent", "paid", "partial", "overdue", "void"]);

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  number: text("number").notNull(),
  status: invoiceStatus("status").notNull().default("draft"),
  issueDate: date("issue_date"),
  dueDate: date("due_date"),
  currency: text("currency").notNull().default("USD"),
  subtotalMinor: bigint("subtotal_minor", { mode: "number" }).notNull().default(0),
  taxMinor: bigint("tax_minor", { mode: "number" }).notNull().default(0),
  totalMinor: bigint("total_minor", { mode: "number" }).notNull().default(0),
  ...ts,
}, (t) => ({ uq: uniqueIndex("uq_inv_number").on(t.tenantId, t.number) }));

export const invoiceLines = pgTable("invoice_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  description: text("description").notNull(),
  qty: integer("qty").notNull().default(1),
  unitPriceMinor: bigint("unit_price_minor", { mode: "number" }).notNull(),
  taxCodeId: uuid("tax_code_id").references(() => taxCodes.id),
  lineTotalMinor: bigint("line_total_minor", { mode: "number" }).notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  method: text("method"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tables that carry tenant_id and must have RLS enabled (used by apply-rls).
export const TENANT_TABLES = [
  "roles", "tax_codes", "sequences", "audit_events",
  "accounts", "contacts", "products", "invoices", "invoice_lines", "payments",
] as const;
