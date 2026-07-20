"use client";

import { useRef } from "react";

export default function SelectForm({
  hidden, name, value, options, action,
}: {
  hidden: Record<string, string>;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={ref}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <select name={name} defaultValue={value} onChange={() => ref.current?.requestSubmit()}
        style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #e8e6e1", fontSize: 12, color: "#6b675f", background: "#fff" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </form>
  );
}
