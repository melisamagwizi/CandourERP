"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button with a built-in pending state: disables itself and swaps
 * its label while the surrounding form's server action is running, which
 * prevents double submissions (duplicate invoices, payments, pay runs).
 */
export default function SubmitButton({
  children, pendingText = "Saving…", style, disabled,
}: {
  children: React.ReactNode;
  pendingText?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending}
      style={{ ...style, opacity: pending ? 0.6 : 1, cursor: pending ? "wait" : (style?.cursor ?? "pointer") }}>
      {pending ? pendingText : children}
    </button>
  );
}
