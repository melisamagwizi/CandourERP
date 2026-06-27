import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

const COOKIE = "candour_session";
const TTL_DAYS = 7;

export async function createSession(userId: string, tenantId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86400_000);
  await db.insert(s.sessions).values({ token, userId, tenantId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ uid: s.users.id, name: s.users.name, email: s.users.email, tenantId: s.sessions.tenantId })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(and(eq(s.sessions.token, token), gt(s.sessions.expiresAt, new Date())));
  return row ? { userId: row.uid, name: row.name, email: row.email, tenantId: row.tenantId } : null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(s.sessions).where(eq(s.sessions.token, token));
  jar.delete(COOKIE);
}
