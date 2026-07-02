"use client";

import { useActionState } from "react";
import { captureLead, type LeadState } from "@/data/public";

const initial: LeadState = { ok: false, error: null };
const input: React.CSSProperties = {
  display: "block", width: "100%", boxSizing: "border-box", marginTop: 4,
  padding: "10px 12px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};
const label: React.CSSProperties = { fontSize: 13, color: "#5f6b7a", display: "block", marginBottom: 12 };

export default function LeadForm({ slug, items }: { slug: string; items: string[] }) {
  const [state, action, pending] = useActionState(captureLead, initial);

  if (state.ok) {
    return (
      <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
        <div style={{ fontSize: 32 }}>✅</div>
        <p style={{ fontSize: 16, fontWeight: 500, margin: "8px 0 0" }}>Thanks — we&apos;ll be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <label style={label}>Your name
        <input name="name" required placeholder="Jane Doe" style={input} />
      </label>
      <label style={label}>Email or WhatsApp number
        <input name="contact" required placeholder="you@email.com or +263…" style={input} />
      </label>
      {items.length > 0 && (
        <label style={label}>What are you interested in?
          <select name="interest" style={input} defaultValue="">
            <option value="">Not sure yet / general enquiry</option>
            {items.map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </label>
      )}
      <label style={label}>Message (optional)
        <textarea name="message" rows={3} placeholder="Tell us a bit about what you need…" style={{ ...input, resize: "vertical" }} />
      </label>
      {state.error && <p style={{ color: "#a32d2d", fontSize: 13 }}>{state.error}</p>}
      <button type="submit" disabled={pending} style={{ width: "100%", marginTop: 6, padding: "13px",
        borderRadius: 10, border: "none", background: "#185fa5", color: "#fff", fontWeight: 600, fontSize: 15,
        cursor: "pointer", opacity: pending ? 0.7 : 1 }}>
        {pending ? "Sending…" : "Get started"}
      </button>
    </form>
  );
}
