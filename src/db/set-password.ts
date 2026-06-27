import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, client } from "./index";
import * as s from "./schema";
import { hashPassword } from "../auth/password";

// Usage: tsx src/db/set-password.ts [email] [password]
const email = (process.argv[2] ?? "owner@demo.test").toLowerCase();
const password = process.argv[3] ?? "candour123";

const rows = await db.update(s.users)
  .set({ passwordHash: await hashPassword(password) })
  .where(eq(s.users.email, email))
  .returning();

console.log(rows.length ? `✓ password set for ${email}` : `✗ no user ${email}`);
await client.end();
