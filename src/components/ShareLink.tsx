"use client";

import { useState } from "react";

export default function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  if (!slug) return null;
  const path = `/c/${slug}`;
  const fullUrl = () => `${window.location.origin}${path}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(fullUrl()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const share = () => window.open(`https://wa.me/?text=${encodeURIComponent("Get started with us: " + fullUrl())}`, "_blank");

  return (
    <section style={{ background: "#e6f1fb", border: "1px solid #b5d4f4", borderRadius: 14, padding: "1rem 1.25rem", margin: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 500, color: "#185fa5" }}>Your public sign-up page</div>
          <code style={{ fontSize: 13, color: "#0c447c" }}>{path}</code>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={copy} style={btn}>{copied ? "Copied ✓" : "Copy link"}</button>
          <button onClick={share} style={{ ...btn, borderColor: "#9fe1cb", background: "#e1f5ee", color: "#0f6e56" }}>Share on WhatsApp</button>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#185fa5", margin: "8px 0 0" }}>
        Share this link anywhere — every sign-up lands as a lead in your Sales pipeline.
      </p>
    </section>
  );
}

const btn: React.CSSProperties = {
  padding: "7px 12px", borderRadius: 10, border: "1px solid #b5d4f4", background: "#fff",
  color: "#185fa5", fontSize: 13, fontWeight: 500, cursor: "pointer",
};
