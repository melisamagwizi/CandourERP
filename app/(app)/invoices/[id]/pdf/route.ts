import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { withTenant } from "@/db";
import * as s from "@/db/schema";
import { getSession } from "@/auth/session";

export const runtime = "nodejs";

const money = (m: number) => "$" + (m / 100).toFixed(2);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const data = await withTenant(session.tenantId, async (tx) => {
    const [inv] = await tx.select().from(s.invoices).where(eq(s.invoices.id, id));
    if (!inv) return null;
    const [acct] = await tx.select().from(s.accounts).where(eq(s.accounts.id, inv.accountId));
    const lines = await tx.select().from(s.invoiceLines).where(eq(s.invoiceLines.invoiceId, id));
    const [tenant] = await tx.select().from(s.tenants).where(eq(s.tenants.id, session.tenantId));
    return { inv, acct, lines, tenant };
  });
  if (!data) return new Response("Not found", { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.13, 0.16);
  const muted = rgb(0.4, 0.42, 0.48);

  let y = 800;
  const text = (t: string, x: number, size = 10, f = font, color = ink) =>
    page.drawText(t, { x, y, size, font: f, color });
  const rule = () => page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.85, 0.88, 0.92) });

  text(data.tenant?.name ?? "Candour", 50, 20, bold, rgb(0.09, 0.37, 0.65));
  text("INVOICE", 468, 20, bold);
  y -= 34; text(`Invoice ${data.inv.number}`, 50, 12, bold); text(`Status: ${data.inv.status}`, 468, 10, font, muted);
  y -= 16; text(`Issue date: ${data.inv.issueDate ?? "—"}`, 50, 10, font, muted);
  y -= 30; text("Bill to", 50, 9, bold, muted);
  y -= 15; text(data.acct?.name ?? "—", 50, 11, bold);
  if (data.acct?.billingEmail) { y -= 13; text(data.acct.billingEmail, 50, 9, font, muted); }

  y -= 34; text("Description", 50, 9, bold, muted); text("Qty", 360, 9, bold, muted); text("Unit", 410, 9, bold, muted); text("Amount", 500, 9, bold, muted);
  y -= 6; rule(); y -= 18;
  for (const l of data.lines) {
    text(l.description.slice(0, 58), 50); text(String(l.qty), 360); text(money(l.unitPriceMinor), 410); text(money(l.lineTotalMinor), 500);
    y -= 18;
  }
  y -= 4; rule();
  y -= 20; text("Subtotal", 410, 10, font, muted); text(money(data.inv.subtotalMinor), 500);
  y -= 16; text("Tax", 410, 10, font, muted); text(money(data.inv.taxMinor), 500);
  y -= 18; text("Total", 410, 13, bold); text(money(data.inv.totalMinor), 500, 13, bold);

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${data.inv.number}.pdf"`,
    },
  });
}
