import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { startTrial } from "@/data/actions";

export const dynamic = "force-dynamic";

const PLAN = { name: "Candour Pro", price: "$29/mo", trialDays: 7 };

const field: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", marginTop: 6, padding: "10px 12px",
  borderRadius: 10, border: "1px solid #e8e6e1", fontSize: 14, color: "#141414", background: "#fff",
};
const labelStyle: React.CSSProperties = { fontSize: 13, color: "#6b675f", fontWeight: 500 };

export default async function StartTrialPage() {
  const session = await requireAuth();
  const [tenant] = await db.select().from(s.tenants).where(eq(s.tenants.id, session.tenantId));
  const [first, ...rest] = session.name.split(" ");

  return (
    <main style={{ minHeight: "100vh", background: "#fafaf8", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 36, alignItems: "start" }}>

        {/* Left — confirm details + start trial */}
        <form action={startTrial} style={{ background: "#fff", borderRadius: 16,
          border: "1px solid #e8e6e1", padding: "1.75rem 1.75rem 2rem" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ flex: 1 }}><span style={labelStyle}>First name</span>
              <input defaultValue={first} style={field} readOnly />
            </label>
            <label style={{ flex: 1 }}><span style={labelStyle}>Last name</span>
              <input defaultValue={rest.join(" ")} placeholder="—" style={field} readOnly />
            </label>
          </div>
          <label style={{ display: "block", marginTop: 14 }}><span style={labelStyle}>Email</span>
            <input defaultValue={session.email} style={field} readOnly />
          </label>
          <label style={{ display: "block", marginTop: 14 }}><span style={labelStyle}>Discount code</span>
            <input name="discount" placeholder="Optional" style={field} />
          </label>

          <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 10, background: "#f7f6f3",
            border: "1px solid #e8e6e1", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 20 }} aria-hidden="true">🔒</span>
            <div style={{ fontSize: 13, color: "#6b675f" }}>
              <strong style={{ color: "#141414" }}>No card needed today.</strong> Billing is handled securely
              by Stripe and only starts after your {PLAN.trialDays}-day trial.
            </div>
          </div>

          <button type="submit" style={{ width: "100%", marginTop: 18, padding: "13px",
            borderRadius: 10, border: "none", background: "#141414", color: "#fff",
            fontWeight: 600, fontSize: 15, cursor: "pointer" }}>
            Start my free trial
          </button>
        </form>

        {/* Right — value props + plan summary */}
        <div style={{ padding: "0.5rem 0.25rem" }}>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "0 0 18px", color: "#16111f" }}>
            Run your whole business with Candour — start free for {PLAN.trialDays} days.
          </h1>
          <h2 style={{ fontSize: 19, margin: "0 0 16px", color: "#16111f" }}>100% NO-RISK FREE TRIAL</h2>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            {["Cancel anytime, hassle-free",
              `Pay nothing for the first ${PLAN.trialDays} days`,
              "Every ready module included — CRM, invoicing and more"].map((t) => (
              <li key={t} style={{ display: "flex", gap: 10, fontSize: 15, color: "#2c2738" }}>
                <span style={{ color: "#1d9e75", fontWeight: 700 }}>✓</span>{t}
              </li>
            ))}
          </ul>

          <div style={{ background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1.1rem 1.25rem" }}>
            <div style={{ fontSize: 13, color: "#6b675f", marginBottom: 6 }}>Plan</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontSize: 18 }}>{PLAN.name}</strong>
              <strong style={{ fontSize: 18 }}>$0 due today</strong>
            </div>
            <div style={{ fontSize: 13, color: "#6b675f", marginTop: 4 }}>
              {tenant?.name} · {PLAN.price} after the trial
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
