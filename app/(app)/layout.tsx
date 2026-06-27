import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { logout } from "@/auth/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.id, session.tenantId));

  return (
    <div>
      <header style={{ background: "#fff", borderBottom: "0.5px solid #d9e2ec" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "12px 1.5rem",
          display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ fontWeight: 600, color: "#185fa5", textDecoration: "none" }}>Candour</Link>
          <nav style={{ display: "flex", gap: 16, flex: 1, fontSize: 14 }}>
            <Link href="/" style={navLink}>Home</Link>
            <Link href="/customers" style={navLink}>Customers</Link>
            <Link href="/products" style={navLink}>Products</Link>
          </nav>
          <span style={{ fontSize: 13, color: "#5f6b7a" }}>{tenant?.name} · {session.name}</span>
          <form action={logout}>
            <button type="submit" style={{ padding: "6px 11px", borderRadius: 8,
              border: "0.5px solid #d9e2ec", background: "#fff", cursor: "pointer", fontSize: 13 }}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "2rem 1.5rem" }}>{children}</main>
    </div>
  );
}

const navLink: React.CSSProperties = { color: "#1f2933", textDecoration: "none" };
