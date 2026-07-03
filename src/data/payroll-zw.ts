// Simplified Zimbabwe monthly payroll statutory calculation (USD).
// ILLUSTRATIVE ONLY — verify PAYE bands, NSSA rate/ceiling and AIDS levy
// against current ZIMRA tables before using for real payroll.

// Monthly PAYE bands: tax = gross*rate - deduct  (the standard ZIMRA form).
const PAYE_BANDS = [
  { upTo: 100, rate: 0, deduct: 0 },
  { upTo: 300, rate: 0.20, deduct: 20 },
  { upTo: 1000, rate: 0.25, deduct: 35 },
  { upTo: 2000, rate: 0.30, deduct: 85 },
  { upTo: 3000, rate: 0.35, deduct: 185 },
  { upTo: Infinity, rate: 0.40, deduct: 485 },
];

const NSSA_RATE = 0.045;        // employee contribution
const NSSA_CEILING = 700;       // insurable earnings cap (monthly USD)
const AIDS_LEVY_RATE = 0.03;    // levied on PAYE

export type ZimStatutory = { paye: number; aidsLevy: number; nssa: number; total: number };

/** All amounts in and out are minor units (cents). */
export function computeZimStatutory(grossMinor: number): ZimStatutory {
  const gross = grossMinor / 100;
  const band = PAYE_BANDS.find((b) => gross <= b.upTo)!;
  const paye = Math.max(0, gross * band.rate - band.deduct);
  const aidsLevy = paye * AIDS_LEVY_RATE;
  const nssa = Math.min(gross, NSSA_CEILING) * NSSA_RATE;
  const toMinor = (n: number) => Math.round(n * 100);
  const p = toMinor(paye), a = toMinor(aidsLevy), n = toMinor(nssa);
  return { paye: p, aidsLevy: a, nssa: n, total: p + a + n };
}
