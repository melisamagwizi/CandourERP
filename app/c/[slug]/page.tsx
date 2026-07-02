import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import LeadForm from "@/components/LeadForm";

export const dynamic = "force-dynamic";

const money = (m: number, ccy: string) => `${ccy} ${(m / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.slug, slug));
  return { title: tenant ? `${tenant.name} — get started` : "Not found", description: tenant?.mission ?? "" };
}

export default async function Storefront({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.slug, slug));
  if (!tenant) notFound();

  const products = await withTenant(tenant.id, (tx) => tx.select().from(s.products).orderBy(asc(s.products.name)));
  const services = products.filter((p) => p.type === "service");
  const goods = products.filter((p) => p.type === "product");
  const items = products.map((p) => p.name);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
      <header style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "#185fa5", color: "#fff", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 600, margin: "0 auto 14px" }}>
          {tenant.name.slice(0, 1).toUpperCase()}
        </div>
        <h1 style={{ fontSize: 30, margin: "0 0 8px" }}>{tenant.name}</h1>
        {tenant.mission && <p style={{ fontSize: 17, color: "#5f6b7a", margin: 0 }}>{tenant.mission}</p>}
      </header>

      {(services.length > 0 || goods.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24, marginBottom: 32 }}>
          {services.length > 0 && (
            <section>
              <h2 style={{ fontSize: 15, color: "#5f6b7a", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Services</h2>
              {services.map((p) => (
                <div key={p.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ color: "#185fa5", fontWeight: 500, whiteSpace: "nowrap" }}>{money(p.unitPriceMinor, p.currency)}{p.isRecurring ? "/mo" : ""}</span>
                </div>
              ))}
            </section>
          )}
          {goods.length > 0 && (
            <section>
              <h2 style={{ fontSize: 15, color: "#5f6b7a", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>Products</h2>
              {goods.map((p) => (
                <div key={p.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ color: "#185fa5", fontWeight: 500, whiteSpace: "nowrap" }}>{money(p.unitPriceMinor, p.currency)}</span>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 16, padding: "1.75rem", maxWidth: 460, margin: "0 auto" }}>
        <h2 style={{ fontSize: 20, margin: "0 0 4px", textAlign: "center" }}>Get started</h2>
        <p style={{ fontSize: 14, color: "#5f6b7a", margin: "0 0 18px", textAlign: "center" }}>Leave your details and we&apos;ll reach out.</p>
        <LeadForm slug={tenant.slug} items={items} />
      </section>

      <p style={{ textAlign: "center", fontSize: 12, color: "#8a809e", marginTop: 28 }}>Powered by Candour</p>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 10, padding: "11px 14px", marginBottom: 8,
};
