import { db } from "@/db";
import * as s from "@/db/schema";
import { runDueRecurringFor } from "@/data/billing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily automation, triggered by Vercel Cron (see vercel.json).
 * Generates invoices for every tenant's due recurring schedules —
 * each tenant is processed inside its own RLS context.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" automatically.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tenants = await db.select({ id: s.tenants.id }).from(s.tenants);
  let invoicesCreated = 0;
  for (const t of tenants) {
    try {
      invoicesCreated += await runDueRecurringFor(t.id);
    } catch (e) {
      console.error(`cron: recurring failed for tenant ${t.id}:`, e);
    }
  }
  return Response.json({ ok: true, tenants: tenants.length, invoicesCreated });
}
