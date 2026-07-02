"use client";

import { useRef } from "react";

export default function DateSubmit({
  dealId, value, action,
}: {
  dealId: string;
  value: string | null;
  action: (formData: FormData) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={ref}>
      <input type="hidden" name="dealId" value={dealId} />
      <input type="date" name="date" defaultValue={value ?? ""} onChange={() => ref.current?.requestSubmit()}
        style={{ padding: "3px 6px", borderRadius: 6, border: "0.5px solid #d9e2ec", fontSize: 11, color: "#5f6b7a", width: "100%", boxSizing: "border-box" }} />
    </form>
  );
}
