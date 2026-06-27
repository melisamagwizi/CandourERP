"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type SignupState } from "@/auth/signup";

const initial: SignupState = { error: null };

const input: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box", marginTop: 4,
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec",
  fontSize: 14, color: "#1f2933",
};
const label: React.CSSProperties = { fontSize: 13, color: "#5f6b7a" };

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, initial);

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ color: "#185fa5", marginBottom: 4 }}>Start your company on Candour</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0, marginBottom: 24 }}>
        Create your workspace and capture your business details.
      </p>

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={label}>Company name
          <input name="company" required placeholder="Candour Business" style={input} />
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ ...label, flex: 2 }}>Your name
            <input name="name" required placeholder="Jane Doe" style={input} />
          </label>
          <label style={{ ...label, flex: 1 }}>Currency
            <input name="currency" defaultValue="USD" maxLength={3} style={input} />
          </label>
        </div>
        <label style={label}>Work email
          <input name="email" type="email" required autoComplete="email" placeholder="you@company.com" style={input} />
        </label>
        <label style={label}>Password
          <input name="password" type="password" required autoComplete="new-password" placeholder="At least 6 characters" style={input} />
        </label>

        {state.error && <p style={{ color: "#a32d2d", fontSize: 13, margin: 0 }}>{state.error}</p>}

        <button type="submit" disabled={pending}
          style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, border: "none",
            background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer", opacity: pending ? 0.7 : 1 }}>
          {pending ? "Creating your workspace…" : "Create company"}
        </button>
      </form>

      <p style={{ fontSize: 13, color: "#5f6b7a", marginTop: 20 }}>
        Already have a workspace? <Link href="/login" style={{ color: "#185fa5" }}>Sign in</Link>
      </p>
    </main>
  );
}
