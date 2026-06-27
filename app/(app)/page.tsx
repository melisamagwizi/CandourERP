import Link from "next/link";
import { sql } from "drizzle-orm";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { MODULES } from "@/modules";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await requireAuth();

  const counts = await withTenant(session.tenantId, async (tx) => {
    const [a] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.accounts);
    const [p] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.products);
    const [i] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.invoices);
    return { customers: a.n, products: p.n, invoices: i.n };
  });

  const steps = [
    { label: "Add your company details", done: true, href: undefined },
    { label: "Add your first customer", done: counts.customers > 0, href: "/customers" },
    { label: "Add your first product or service", done: counts.products > 0, href: "/products" },
    { label: "Create your first invoice", done: counts.invoices > 0, href: "/invoices/new" },
  ];
  const completed = steps.filter((x) => x.done).length;

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>Welcome to Candour</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>Capture your base information, then grow into each module.</p>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <strong style={{ fontSize: 15 }}>Get set up</strong>
          <span style={{ fontSize: 13, color: "#5f6b7a" }}>{completed} of {steps.length} done</span>
        </div>
        {steps.map((step) => (
          <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0", borderBottom: "0.5px solid #eef2f6" }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
              border: "1.5px solid " + (step.done ? "#1d9e75" : "#cbd5e0"),
              background: step.done ? "#1d9e75" : "transparent", color: "#fff",
              fontSize: 12, textAlign: "center", lineHeight: "16px" }}>{step.done ? "✓" : ""}</span>
            <span style={{ flex: 1, fontSize: 14, color: step.done ? "#5f6b7a" : "#1f2933" }}>{step.label}</span>
            {step.href && !step.done && <Link href={step.href} style={{ fontSize: 13, color: "#185fa5" }}>Start →</Link>}
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 16, margin: "1.5rem 0 0.75rem" }}>Modules</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {MODULES.map((m) => {
          const body = (
            <div style={{ ...card, margin: 0, height: "100%", opacity: m.status === "soon" ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 14 }}>{m.name}</strong>
                {m.status === "available"
                  ? <span style={pill("#0f6e56", "#e1f5ee")}>ready</span>
                  : <span style={pill("#888780", "#f1efe8")}>soon</span>}
              </div>
              <div style={{ fontSize: 13, color: "#5f6b7a", marginTop: 4 }}>{m.desc}</div>
            </div>
          );
          return m.status === "available" && m.href
            ? <Link key={m.slug} href={m.href} style={{ textDecoration: "none", color: "inherit" }}>{body}</Link>
            : <div key={m.slug}>{body}</div>;
        })}
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12,
  padding: "1.1rem 1.25rem", marginTop: 16,
};
const pill = (color: string, bg: string): React.CSSProperties => ({
  fontSize: 11, padding: "2px 8px", borderRadius: 20, background: bg, color,
});
