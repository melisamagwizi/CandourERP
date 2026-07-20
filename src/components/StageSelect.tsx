"use client";

import { useRef } from "react";

const STAGES: { value: string; label: string }[] = [
  { value: "lead", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export default function StageSelect({
  dealId, stage, action,
}: {
  dealId: string;
  stage: string;
  action: (formData: FormData) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={ref}>
      <input type="hidden" name="dealId" value={dealId} />
      <select name="stage" defaultValue={stage} onChange={() => ref.current?.requestSubmit()}
        style={{ width: "100%", marginTop: 8, padding: "5px 8px", borderRadius: 6,
          border: "1px solid #e8e6e1", fontSize: 12, color: "#6b675f", background: "#fff" }}>
        {STAGES.map((st) => <option key={st.value} value={st.value}>Move to: {st.label}</option>)}
      </select>
    </form>
  );
}
