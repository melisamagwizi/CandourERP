import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Single pooled client. Reused across hot reloads in dev.
const globalForDb = globalThis as unknown as { client?: postgres.Sql };
export const client = globalForDb.client ?? postgres(connectionString, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });

/**
 * Runs `fn` inside a transaction scoped to one tenant. It sets
 * `app.tenant_id` for the transaction so Postgres RLS filters every
 * query automatically. All app data access should go through this.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx as unknown as typeof db);
  });
}

export { schema };
