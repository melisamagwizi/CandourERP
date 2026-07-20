"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "@/auth/actions";
import Mark from "@/components/Mark";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <main style={{ maxWidth: 380, margin: "0 auto", padding: "5rem 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
        <Mark size={30} />
        <span style={{ fontWeight: 600, letterSpacing: "0.18em", fontSize: 15 }}>CANDOUR</span>
      </div>
      <h1 style={{ fontSize: 24, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Welcome back</h1>
      <p style={{ color: "#6b675f", marginTop: 0, marginBottom: 24 }}>Sign in to your workspace.</p>

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 13, color: "#6b675f" }}>
          Email
          <input name="email" type="email" required autoComplete="email" defaultValue="owner@demo.test"
            style={inputStyle} />
        </label>
        <label style={{ fontSize: 13, color: "#6b675f" }}>
          Password
          <input name="password" type="password" required autoComplete="current-password"
            style={inputStyle} />
        </label>

        {state.error && (
          <p style={{ color: "#a32d2d", fontSize: 13, margin: 0 }}>{state.error}</p>
        )}

        <button type="submit" disabled={pending}
          style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, border: "none",
            background: "#141414", color: "#fff", fontWeight: 500, cursor: "pointer",
            opacity: pending ? 0.7 : 1 }}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ fontSize: 13, color: "#6b675f", marginTop: 20 }}>
        New here? <Link href="/signup" style={{ color: "#185fa5" }}>Create your company</Link>
      </p>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box", marginTop: 4,
  padding: "9px 11px", borderRadius: 10, border: "1px solid #e8e6e1",
  fontSize: 14, color: "#141414",
};
