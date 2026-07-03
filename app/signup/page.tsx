"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signup, type SignupState } from "@/auth/signup";
import { businessModules } from "@/modules";

const initial: SignupState = { error: null };

const input: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box", marginTop: 4,
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};
const label: React.CSSProperties = { fontSize: 13, color: "#5f6b7a", display: "block", marginBottom: 12 };

const STEPS = ["Your business", "Your goal", "Your modules", "Your login"];
const GOALS = [
  { value: "customers", label: "Reach more customers / new markets" },
  { value: "revenue", label: "Grow my revenue" },
  { value: "cashflow", label: "Get paid faster / better cash flow" },
  { value: "launch", label: "Launch a new product or service" },
  { value: "team", label: "Build my team" },
];

export default function DiscoveryWizard() {
  const [state, action, pending] = useActionState(signup, initial);
  const [step, setStep] = useState(1);
  const [v, setV] = useState({
    company: "", currency: "USD", industry: "Consulting / Agency", tagline: "",
    goal: "customers", target: "", name: "", email: "", password: "",
  });
  const [mods, setMods] = useState<string[]>(["crm", "products", "billing", "finance", "sales"]);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const toggleMod = (slug: string) => setMods(mods.includes(slug) ? mods.filter((m) => m !== slug) : [...mods, slug]);

  const step1ok = v.company.trim().length > 0;
  const loginOk = v.name.trim().length > 0 && /\S+@\S+\.\S+/.test(v.email) && v.password.length >= 6;

  return (
    <main style={{ maxWidth: 500, margin: "0 auto", padding: "3.5rem 1.5rem" }}>
      <h1 style={{ color: "#185fa5", marginBottom: 4 }}>Let&apos;s set up Candour around your business</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0, marginBottom: 18 }}>Step {step} of 4 · {STEPS[step - 1]}</p>

      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {STEPS.map((_, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < step ? "#185fa5" : "#e2e8f0" }} />)}
      </div>

      <form action={action}>
        <input type="hidden" name="modules" value={JSON.stringify(mods)} />

        {/* Step 1 — business */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          <label style={label}>Company name
            <input name="company" value={v.company} onChange={set("company")} placeholder="Candour Business" style={input} />
          </label>
          <label style={label}>What kind of business?
            <select name="industry" value={v.industry} onChange={set("industry")} style={input}>
              <option>Consulting / Agency</option><option>Retail / Shop</option>
              <option>Trades &amp; Services</option><option>Hospitality</option><option>Other</option>
            </select>
          </label>
          <label style={label}>In one line, what do you do?
            <input name="tagline" value={v.tagline} onChange={set("tagline")} placeholder="We help small firms grow with expert advice" style={input} />
            <span style={{ fontSize: 11, color: "#6f6685" }}>Becomes your mission statement.</span>
          </label>
          <label style={label}>Currency
            <input name="currency" value={v.currency} onChange={set("currency")} maxLength={3} style={{ ...input, width: 110 }} />
          </label>
        </div>

        {/* Step 2 — goal */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          <p style={{ fontSize: 14, color: "#5f6b7a", marginTop: 0 }}>We&apos;ll turn this into your <strong>Strategy</strong> — vision and starter KPIs.</p>
          <label style={label}>What&apos;s your #1 goal right now?
            <select name="goal" value={v.goal} onChange={set("goal")} style={input}>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>
          {v.goal === "revenue"
            ? <label style={label}>Revenue goal (optional)<input name="target" value={v.target} onChange={set("target")} type="number" min="0" placeholder="50000" style={{ ...input, width: 160 }} /></label>
            : <input type="hidden" name="target" value="" />}
        </div>

        {/* Step 3 — modules */}
        <div style={{ display: step === 3 ? "block" : "none" }}>
          <p style={{ fontSize: 14, color: "#5f6b7a", marginTop: 0 }}>Pick what you&apos;ll use now. You can switch any on or off later — no clutter.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {businessModules.map((m) => {
              const on = mods.includes(m.slug);
              return (
                <button type="button" key={m.slug} onClick={() => toggleMod(m.slug)}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: "1.5px solid " + (on ? "#185fa5" : "#e2e8f0"), background: on ? "#e6f1fb" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: on ? "#185fa5" : "#1f2933" }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: on ? "#185fa5" : "#cbd5e0" }}>{on ? "✓" : "+"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6f6685", marginTop: 2 }}>{m.desc}</div>
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "#6f6685", marginTop: 10 }}>{mods.length} selected</p>
        </div>

        {/* Step 4 — account */}
        <div style={{ display: step === 4 ? "block" : "none" }}>
          <label style={label}>Your name<input name="name" value={v.name} onChange={set("name")} placeholder="Jane Doe" style={input} /></label>
          <label style={label}>Work email<input name="email" type="email" value={v.email} onChange={set("email")} placeholder="you@company.com" style={input} /></label>
          <label style={label}>Password<input name="password" type="password" value={v.password} onChange={set("password")} placeholder="At least 6 characters" style={input} /></label>
        </div>

        {state.error && <p style={{ color: "#a32d2d", fontSize: 13 }}>{state.error}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          {step > 1 ? <button type="button" onClick={() => setStep(step - 1)} style={btnGhost}>Back</button> : <span />}
          {step < 4 && (
            <button type="button" disabled={step === 1 && !step1ok} onClick={() => setStep(step + 1)}
              style={{ ...btnPrimary, opacity: step === 1 && !step1ok ? 0.5 : 1 }}>Continue</button>
          )}
          {step === 4 && (
            <button type="submit" disabled={pending || !loginOk} style={{ ...btnPrimary, opacity: pending || !loginOk ? 0.6 : 1 }}>
              {pending ? "Building your workspace…" : "Create company & draft my strategy"}
            </button>
          )}
        </div>
      </form>

      <p style={{ fontSize: 13, color: "#5f6b7a", marginTop: 24 }}>
        Already have a workspace? <Link href="/login" style={{ color: "#185fa5" }}>Sign in</Link>
      </p>
    </main>
  );
}

const btnPrimary: React.CSSProperties = { padding: "10px 18px", borderRadius: 8, border: "none", background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 18px", borderRadius: 8, border: "0.5px solid #d9e2ec", background: "#fff", color: "#1f2933", cursor: "pointer" };
