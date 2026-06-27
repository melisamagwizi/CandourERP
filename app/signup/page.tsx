"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signup, type SignupState } from "@/auth/signup";

const initial: SignupState = { error: null };

const input: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box", marginTop: 4,
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};
const label: React.CSSProperties = { fontSize: 13, color: "#5f6b7a", display: "block", marginBottom: 10 };

const STEPS = ["Your business", "Your login", "Quick start"];

export default function SignupWizard() {
  const [state, action, pending] = useActionState(signup, initial);
  const [step, setStep] = useState(1);
  const [v, setV] = useState({
    company: "", currency: "USD", industry: "Consulting / Agency",
    name: "", email: "", password: "",
    itemName: "", itemType: "service", itemPrice: "",
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV({ ...v, [k]: e.target.value });

  const step1ok = v.company.trim().length > 0;
  const step2ok = v.name.trim().length > 0 && /\S+@\S+\.\S+/.test(v.email) && v.password.length >= 6;

  return (
    <main style={{ maxWidth: 460, margin: "0 auto", padding: "3.5rem 1.5rem" }}>
      <h1 style={{ color: "#185fa5", marginBottom: 4 }}>Set up Candour</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0, marginBottom: 20 }}>
        Step {step} of 3 · {STEPS[step - 1]}
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < step ? "#185fa5" : "#e2e8f0" }} />
        ))}
      </div>

      <form action={action}>
        {/* Step 1 — business */}
        <div style={{ display: step === 1 ? "block" : "none" }}>
          <label style={label}>Company name
            <input name="company" value={v.company} onChange={set("company")} placeholder="Candour Business" style={input} />
          </label>
          <label style={label}>What kind of business?
            <select name="industry" value={v.industry} onChange={(e) => {
              const product = ["Retail / Shop", "Hospitality"].includes(e.target.value);
              setV({ ...v, industry: e.target.value, itemType: product ? "product" : "service" });
            }} style={input}>
              <option>Consulting / Agency</option>
              <option>Retail / Shop</option>
              <option>Trades &amp; Services</option>
              <option>Hospitality</option>
              <option>Other</option>
            </select>
          </label>
          <label style={label}>Currency
            <input name="currency" value={v.currency} onChange={set("currency")} maxLength={3} style={{ ...input, width: 110 }} />
          </label>
        </div>

        {/* Step 2 — account */}
        <div style={{ display: step === 2 ? "block" : "none" }}>
          <label style={label}>Your name
            <input name="name" value={v.name} onChange={set("name")} placeholder="Jane Doe" style={input} />
          </label>
          <label style={label}>Work email
            <input name="email" type="email" value={v.email} onChange={set("email")} placeholder="you@company.com" style={input} />
          </label>
          <label style={label}>Password
            <input name="password" type="password" value={v.password} onChange={set("password")} placeholder="At least 6 characters" style={input} />
          </label>
        </div>

        {/* Step 3 — optional first item */}
        <div style={{ display: step === 3 ? "block" : "none" }}>
          <p style={{ fontSize: 14, color: "#5f6b7a", marginTop: 0 }}>
            Add one thing you sell to get a head start. You can skip this and add more later.
          </p>
          <label style={label}>Name of product or service
            <input name="itemName" value={v.itemName} onChange={set("itemName")} placeholder="e.g. Consulting retainer" style={input} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ ...label, flex: 1 }}>Type
              <select name="itemType" value={v.itemType} onChange={set("itemType")} style={input}>
                <option value="service">Service</option>
                <option value="product">Product</option>
              </select>
            </label>
            <label style={{ ...label, flex: 1 }}>Price ({v.currency})
              <input name="itemPrice" type="number" step="0.01" min="0" value={v.itemPrice} onChange={set("itemPrice")} placeholder="0.00" style={input} />
            </label>
          </div>
        </div>

        {state.error && <p style={{ color: "#a32d2d", fontSize: 13 }}>{state.error}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          {step > 1
            ? <button type="button" onClick={() => setStep(step - 1)} style={btnGhost}>Back</button>
            : <span />}

          {step < 3 && (
            <button type="button" disabled={(step === 1 && !step1ok) || (step === 2 && !step2ok)}
              onClick={() => setStep(step + 1)}
              style={{ ...btnPrimary, opacity: (step === 1 && !step1ok) || (step === 2 && !step2ok) ? 0.5 : 1 }}>
              Continue
            </button>
          )}

          {step === 3 && (
            <button type="submit" disabled={pending} style={{ ...btnPrimary, opacity: pending ? 0.7 : 1 }}>
              {pending ? "Creating your workspace…" : "Finish & enter Candour"}
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

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 8, border: "none", background: "#185fa5",
  color: "#fff", fontWeight: 500, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  padding: "10px 18px", borderRadius: 8, border: "0.5px solid #d9e2ec",
  background: "#fff", color: "#1f2933", cursor: "pointer",
};
