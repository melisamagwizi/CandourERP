import type { CSSProperties } from "react";

export const input: CSSProperties = {
  padding: "9px 11px", borderRadius: 8, border: "0.5px solid #d9e2ec", fontSize: 14, color: "#1f2933",
};
export const card: CSSProperties = {
  background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1rem 1.25rem",
};
export const primaryBtn: CSSProperties = {
  padding: "9px 16px", borderRadius: 8, border: "none", background: "#185fa5", color: "#fff", fontWeight: 500, cursor: "pointer",
};
export const rowStyle: CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "11px 0", borderTop: "0.5px solid #eef2f6",
};
export const money = (m: number) => "$" + (m / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
