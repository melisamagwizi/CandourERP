import "dotenv/config";
import postgres from "postgres";
import { TENANT_TABLES } from "./schema";

// Enables row-level security on every tenant-scoped table and adds a
// policy that constrains all reads and writes to the current tenant,
// taken from the `app.tenant_id` setting that withTenant() configures.
const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

for (const table of TENANT_TABLES) {
  await sql.unsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  await sql.unsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`);
  await sql.unsafe(`DROP POLICY IF EXISTS tenant_isolation ON ${table};`);
  await sql.unsafe(`
    CREATE POLICY tenant_isolation ON ${table}
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  `);
  console.log(`✓ RLS on ${table}`);
}

console.log("✓ row-level security applied");
await sql.end();
