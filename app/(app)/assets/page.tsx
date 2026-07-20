import { desc } from "drizzle-orm";
import SubmitButton from "@/components/SubmitButton";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { createAsset, updateAssetStatus } from "@/data/actions";
import { input, card, primaryBtn, money } from "@/ui";
import SelectForm from "@/components/SelectForm";

export const dynamic = "force-dynamic";

const STATUS = [
  { value: "in_use", label: "In use" },
  { value: "in_repair", label: "In repair" },
  { value: "retired", label: "Retired" },
  { value: "disposed", label: "Disposed" },
];

export default async function AssetsPage() {
  const session = await requireAuth();
  const assets = await withTenant(session.tenantId, (tx) => tx.select().from(s.assets).orderBy(desc(s.assets.createdAt)));

  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Assets</h1>
      <p style={{ color: "#6b675f", marginTop: 0 }}>Your equipment — who has it and where it stands.</p>

      <form action={createAsset} style={{ display: "flex", gap: 8, flexWrap: "wrap", ...card, margin: "16px 0" }}>
        <input aria-label="Asset name" name="name" required placeholder="Asset name" style={{ ...input, flex: 2, minWidth: 150 }} />
        <input aria-label="Category" name="category" placeholder="Category" style={{ ...input, flex: 1, minWidth: 110 }} />
        <input aria-label="Serial no." name="serialNo" placeholder="Serial no." style={{ ...input, flex: 1, minWidth: 110 }} />
        <input aria-label="Assigned to" name="assignedTo" placeholder="Assigned to" style={{ ...input, flex: 1, minWidth: 110 }} />
        <input aria-label="Cost" name="acquisition" type="number" step="0.01" min="0" placeholder="Cost" style={{ ...input, width: 100 }} />
        <SubmitButton style={primaryBtn}>Add asset</SubmitButton>
      </form>

      <section style={{ ...card, padding: 0 }}>
        {assets.length === 0 && <div style={{ padding: "1rem 1.25rem", color: "#6b675f" }}>No assets yet.</div>}
        {assets.map((a) => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto auto", gap: 12, alignItems: "center", padding: "11px 1.25rem", borderTop: "1px solid #f1efec" }}>
            <span style={{ fontWeight: 500 }}>{a.name}<span style={{ fontSize: 12, color: "#8a867e" }}>{a.category ? ` · ${a.category}` : ""}</span></span>
            <span style={{ fontSize: 13, color: "#6b675f" }}>{a.assignedTo ?? "Unassigned"}</span>
            <span style={{ fontSize: 13 }}>{money(a.acquisitionMinor)}</span>
            <SelectForm hidden={{ assetId: a.id }} name="status" value={a.status} action={updateAssetStatus} options={STATUS} />
          </div>
        ))}
      </section>
    </div>
  );
}
