import type { CSSProperties } from "react";

// Shared inline styles aligned to the "ink on paper" design tokens
// (see app/globals.css). Pages that still use inline styles pull from
// here so the whole app restyles from one place.
export const input: CSSProperties = {
  padding: "9px 11px", borderRadius: 10, border: "1px solid #e8e6e1",
  fontSize: 14, color: "#141414", background: "#fff",
};
export const card: CSSProperties = {
  background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14, padding: "1rem 1.25rem",
};
export const primaryBtn: CSSProperties = {
  padding: "9px 16px", borderRadius: 10, border: "none", background: "#141414",
  color: "#fff", fontWeight: 500, fontSize: 14, cursor: "pointer",
};
export const rowStyle: CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "11px 0", borderTop: "1px solid #f1efec",
};
export const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
