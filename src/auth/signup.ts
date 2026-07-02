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

// Turns the founder's discovery answers into a starter Strategy.
function strategyFromDiscovery(company: string, tagline: string, goal: string, target: string) {
  const mission = tagline || "Deliver great work our customers love.";
  const money = target ? "$" + Number(target).toLocaleString() : "our target";
  const map: Record<string, { vision: string; objectives: { name: string; target?: string }[] }> = {
    customers: {
      vision: `Grow ${company} into a recognised name that keeps reaching new customers and markets.`,
      objectives: [{ name: "Grow the customer base" }, { name: "Generate new leads every month", target: "10 / mo" }],
    },
    revenue: {
      vision: `Build ${company} into a business that reaches ${money} in revenue.`,
      objectives: [{ name: `Reach ${money} in revenue`, target: money }, { name: "Keep customers coming back" }],
    },
    cashflow: {
      vision: `Run ${company} with healthy, predictable cash flow.`,
      objectives: [{ name: "Cut overdue invoices to zero" }, { name: "Keep the cash position positive" }],
    },
    launch: {
      vision: `Successfully launch and grow ${company}'s new offering.`,
      objectives: [{ name: "Launch the new product or service" }, { name: "Win the first customers", target: "10" }],
    },
    team: {
      vision: `Build ${company} into a strong team that delivers reliably.`,
      objectives: [{ name: "Hire and onboard key roles" }, { name: "Keep delivery on track" }],
    },
  };
  const picked = map[goal] ?? {
    vision: `Build ${company} into a thriving, well-run business.`,
    objectives: [{ name: "Grow the business" }, { name: "Delight our customers" }],
  };
  return { mission, vision: picked.vision, objectives: picked.objectives };
}

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const company = String(formData.get("company") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase() || "USD";
  const industry = String(formData.get("industry") ?? "").trim() || null;
  const tagline = String(formData.get("tagline") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const target = String(formData.get("target") ?? "").replace(/[^0-9]/g, "");

  if (!company || !name || !email || password.length < 6) {
    return { error: "Fill in every field; password must be at least 6 characters." };
  }
  const [existing] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (existing) return { error: "That email is already registered. Try signing in." };

  const strat = strategyFromDiscovery(company, tagline, goal, target);

  const [tenant] = await db.insert(s.tenants)
    .values({ name: company, slug: slugify(company), baseCurrency: currency, industry, goal, vision: strat.vision, mission: strat.mission })
    .returning();

  const [user] = await db.insert(s.users)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .returning();

  const roleId = await withTenant(tenant.id, async (tx) => {
    const [role] = await tx.insert(s.roles).values({ tenantId: tenant.id, name: "Owner", isSystem: true }).returning();
    await tx.insert(s.rolePermissions).values({ roleId: role.id, permission: "*.*.*" });
    await tx.insert(s.taxCodes).values({ tenantId: tenant.id, name: "No tax", rateBps: 0, isDefault: true });
    await tx.insert(s.sequences).values({ tenantId: tenant.id, docType: "invoice", prefix: "INV-", nextValue: 1 });
    // Populate Strategy from the discovery answers.
    await tx.insert(s.objectives).values(strat.objectives.map((o) => ({ tenantId: tenant.id, name: o.name, target: o.target ?? null })));
    return role.id;
  });

  await db.insert(s.memberships).values({ tenantId: tenant.id, userId: user.id, roleId });
  await createSession(user.id, tenant.id);
  redirect("/start-trial");
}
