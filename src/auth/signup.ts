"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import { hashPassword } from "./password";
import { createSession } from "./session";

export type SignupState = { error: string | null };

function slugify(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  return `${base || "co"}-${randomBytes(2).toString("hex")}`;
}

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const company = String(formData.get("company") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase() || "USD";

  if (!company || !name || !email || password.length < 6) {
    return { error: "Fill in every field; password must be at least 6 characters." };
  }

  const [existing] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (existing) return { error: "That email is already registered. Try signing in." };

  // 1. The company becomes a tenant (no RLS on tenants/users — identity layer).
  const [tenant] = await db.insert(s.tenants)
    .values({ name: company, slug: slugify(company), baseCurrency: currency })
    .returning();

  const [user] = await db.insert(s.users)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .returning();

  // 2. Seed the tenant's defaults inside its own RLS context.
  const roleId = await withTenant(tenant.id, async (tx) => {
    const [role] = await tx.insert(s.roles)
      .values({ tenantId: tenant.id, name: "Owner", isSystem: true }).returning();
    await tx.insert(s.rolePermissions).values({ roleId: role.id, permission: "*.*.*" });
    await tx.insert(s.taxCodes)
      .values({ tenantId: tenant.id, name: "No tax", rateBps: 0, isDefault: true });
    await tx.insert(s.sequences)
      .values({ tenantId: tenant.id, docType: "invoice", prefix: "INV-", nextValue: 1 });
    return role.id;
  });

  // 3. Link the owner to the company (memberships sit outside tenant RLS).
  await db.insert(s.memberships)
    .values({ tenantId: tenant.id, userId: user.id, roleId });

  await createSession(user.id, tenant.id);
  redirect("/");
}
