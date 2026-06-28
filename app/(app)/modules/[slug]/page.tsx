import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireAuth } from "@/auth/current";
import { getModule } from "@/modules";

export const dynamic = "force-dynamic";

export default async function ModulePreview({ params }: { params: Promise<{ slug: string }> }) {
  await requireAuth();
  const { slug } = await params;
  const mod = getModule(slug);
  if (!mod) notFound();
  if (mod.status === "available" && mod.href) redirect(mod.href);

  return (
    <div style={{ maxWidth: 640 }}>
      <Link href="/dashboard" style={{ fontSize: 13, color: "#185fa5", textDecoration: "none" }}>← Back to modules</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0 4px" }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>{mod.name}</h1>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", padding: "3px 9px",
          borderRadius: 999, background: "#f1efe8", color: "#888780" }}>COMING SOON</span>
      </div>
      <p style={{ color: "#5f6b7a", marginTop: 0 }}>{mod.desc}</p>

      <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1.25rem 1.5rem", marginTop: 12 }}>
        <strong style={{ fontSize: 15 }}>What this module will include</strong>
        <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {(mod.planned ?? ["On the roadmap — details coming soon."]).map((p) => (
            <li key={p} style={{ display: "flex", gap: 10, fontSize: 14, color: "#2c2738" }}>
              <span style={{ color: "#185fa5", fontWeight: 700 }}>›</span>{p}
            </li>
          ))}
        </ul>
      </section>

      <p style={{ fontSize: 13, color: "#8a809e", marginTop: 16 }}>
        This module is part of the Candour roadmap and will switch on automatically when it&apos;s ready.
        In the meantime, you can keep capturing your{" "}
        <Link href="/customers" style={{ color: "#185fa5" }}>customers</Link>,{" "}
        <Link href="/products" style={{ color: "#185fa5" }}>products</Link>, and{" "}
        <Link href="/invoices" style={{ color: "#185fa5" }}>invoices</Link>.
      </p>
    </div>
  );
}
