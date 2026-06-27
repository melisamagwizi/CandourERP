"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { verifyPassword } from "./password";
import { createSession, destroySession } from "./session";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  // Resolve the user's active workspace (membership lives outside tenant RLS).
  const [member] = await db
    .select()
    .from(s.memberships)
    .where(and(eq(s.memberships.userId, user.id), eq(s.memberships.status, "active")));
  if (!member) return { error: "This account has no active workspace." };

  await createSession(user.id, member.tenantId);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
