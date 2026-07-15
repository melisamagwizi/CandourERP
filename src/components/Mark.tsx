/**
 * The Candour mark — a vector recreation of the brand monogram:
 * double outer ring, inner coin circle, centre bar, and four maze-hooks
 * with 180° rotational symmetry. Draws in currentColor so it works as
 * ink on light surfaces and white on dark ones.
 * (If a designer-exported original lands in /public/brand, swap it here.)
 */
export default function Mark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="currentColor"
      className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="46" strokeWidth="4.5" />
      <circle cx="50" cy="50" r="38" strokeWidth="3" />
      <circle cx="50" cy="50" r="28" strokeWidth="4.5" />
      <path d="M22 50 H78" strokeWidth="4.5" />
      <path d="M50 50 V34 H37 V42 H44" strokeWidth="4" />
      <path d="M50 50 V66 H63 V58 H56" strokeWidth="4" />
      <path d="M52 30 a15 15 0 0 1 14 15 h-8" strokeWidth="4" />
      <path d="M48 70 a15 15 0 0 1 -14 -15 h8" strokeWidth="4" />
    </svg>
  );
}
