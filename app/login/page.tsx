"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/auth/actions";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <main style={{ maxWidth: 380, margin: "0 auto", padding: "5rem 1.5rem" }}>
      <h1 style={{ color: "#185fa5", marginBottom: 4 }}>Candour ERP</h1>
      <p style={{ color: "#5f6b7a", marginTop: 0, marginBottom: 24 }}>Sign in to your workspace.</p>

      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontSize: 13, color: "#5f6b7a" }}>
          Email
          <input name="email" type="email" required autoComplete="email" defaultValue="owner@demo.test"
            style={inputStyle} />
        </label>
        <label style={{ fontSize: 13, color: "#5f6b7a" }}>
          Password
          <input name="password" type="password" required autoComplete="current-password"
            style={inputStyle} />
        </label>

        {state.error && (
          <p style={{ color: "#a32d2d", fontSize: 13, margin: 0 }}>{state.error}</p>
        )}

        <button type="submit" disabled={pending}
          style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, border: "none",
            background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer",
            opacity: pending ? 0.7 : 1 }}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box", marginTop: 4,
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec",
  fontSize: 14, color: "#1f2933",
};
