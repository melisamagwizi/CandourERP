import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { eq, sql } from "drizzle-orm";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { businessModules, platformModules, type ModuleDef } from "@/modules";
import { money } from "@/ui";
import { enableModule, disableModule } from "@/data/actions";
import ShareLink from "@/components/ShareLink";

export const dynamic = "force-dynamic";

const GOAL_TEXT: Record<string, string> = {
  customers: "reach more customers", revenue: "grow your revenue",
  cashflow: "improve your cash flow", launch: "launch your new offering", team: "build your team",
};

export default async function Dashboard() {
  const session = await requireAuth();
  const [tenant] = await db.select({ slug: s.tenants.slug, goal: s.tenants.goal, enabledModules: s.tenants.enabledModules }).from(s.tenants).where(eq(s.tenants.id, session.tenantId));
  const goal = tenant?.goal ?? "customers";

  const d = await withTenant(session.tenantId, async (tx) => {
    const [acc] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.accounts);
    const [prod] = await tx.select({ n: sql<number>`count(*)::int`, low: sql<number>`count(*) filter (where ${s.products.isStockable} and ${s.products.reorderLevel} > 0 and ${s.products.stockQty} <= ${s.products.reorderLevel})::int` }).from(s.products);
    const [opp] = await tx.select({
      leads: sql<number>`count(*) filter (where ${s.opportunities.stage} = 'lead')::int`,
      pipeline: sql<number>`coalesce(sum(${s.opportunities.valueMinor}) filter (where ${s.opportunities.stage} not in ('won','lost')), 0)::bigint`,
      followUp: sql<number>`count(*) filter (where ${s.opportunities.stage} not in ('won','lost') and ((${s.opportunities.nextFollowUpAt} is not null and ${s.opportunities.nextFollowUpAt} <= current_date) or (${s.opportunities.nextFollowUpAt} is null and ${s.opportunities.updatedAt} < now() - interval '7 days')))::int`,
    }).from(s.opportunities);
    const [inv] = await tx.select({ n: sql<number>`count(*)::int`, unpaidN: sql<number>`count(*) filter (where ${s.invoices.status} not in ('paid','void'))::int`, unpaid: sql<number>`coalesce(sum(${s.invoices.totalMinor}) filter (where ${s.invoices.status} not in ('paid','void')), 0)::bigint`, overdue: sql<number>`count(*) filter (where ${s.invoices.status} not in ('paid','void') and ${s.invoices.dueDate} is not null and ${s.invoices.dueDate} < current_date)::int` }).from(s.invoices);
    const [tsk] = await tx.select({ open: sql<number>`count(*) filter (where ${s.tasks.status} <> 'done')::int`, overdue: sql<number>`count(*) filter (where ${s.tasks.status} <> 'done' and ${s.tasks.dueOn} is not null and ${s.tasks.dueOn} < current_date)::int` }).from(s.tasks);
    const [lv] = await tx.select({ pending: sql<number>`count(*) filter (where ${s.leaveRequests.status} = 'pending')::int` }).from(s.leaveRequests);
    const [obj] = await tx.select({ risk: sql<number>`count(*) filter (where ${s.objectives.status} <> 'on_track')::int` }).from(s.objectives);
    const [txn] = await tx.select({ inflow: sql<number>`coalesce(sum(${s.transactions.amountMinor}) filter (where ${s.transactions.type} = 'inflow' and ${s.transactions.occurredAt} >= date_trunc('month', now())), 0)::bigint` }).from(s.transactions);
    return {
      customers: Number(acc.n), products: Number(prod.n), lowStock: Number(prod.low),
      leads: Number(opp.leads), pipeline: Number(opp.pipeline), followUp: Number(opp.followUp),
      invoices: Number(inv.n), unpaidN: Number(inv.unpaidN), unpaid: Number(inv.unpaid), overdue: Number(inv.overdue),
      openTasks: Number(tsk.open), overdueTasks: Number(tsk.overdue), pendingLeave: Number(lv.pending), atRisk: Number(obj.risk), inflow: Number(txn.inflow),
    };
  });

  const HERO: Record<string, { label: string; value: string; sub: string; href: string }> = {
    customers: { label: "New leads to follow up", value: String(d.leads), sub: `Pipeline worth ${money(d.pipeline)}`, href: "/sales" },
    revenue: { label: "Money in this month", value: money(d.inflow), sub: `Pipeline worth ${money(d.pipeline)}`, href: "/finance" },
    cashflow: { label: "You're owed", value: money(d.unpaid), sub: `${d.unpaidN} unpaid invoice(s)`, href: "/invoices" },
    launch: { label: "Open pipeline", value: money(d.pipeline), sub: `${d.leads} new lead(s)`, href: "/sales" },
    team: { label: "Open tasks", value: String(d.openTasks), sub: `${d.pendingLeave} leave to review`, href: "/operations" },
  };
  const hero = HERO[goal] ?? HERO.customers;

  const attention = [
    d.overdue > 0 && { icon: "🔴", text: `${d.overdue} invoice(s) overdue — chase them`, href: "/invoices" },
    d.unpaidN > 0 && { icon: "💰", text: `You're owed ${money(d.unpaid)} across ${d.unpaidN} invoice(s)`, href: "/invoices" },
    d.followUp > 0 && { icon: "⏰", text: `${d.followUp} lead(s) need follow-up`, href: "/sales" },
    d.leads > 0 && { icon: "✨", text: `${d.leads} lead(s) in your pipeline`, href: "/sales" },
    d.pendingLeave > 0 && { icon: "🌿", text: `${d.pendingLeave} leave request(s) awaiting approval`, href: "/hrm" },
    d.lowStock > 0 && { icon: "📦", text: `${d.lowStock} product(s) low on stock`, href: "/stock" },
    d.overdueTasks > 0 && { icon: "📌", text: `${d.overdueTasks} task(s) overdue`, href: "/operations" },
    d.openTasks > 0 && { icon: "✅", text: `${d.openTasks} open task(s)`, href: "/operations" },
    d.atRisk > 0 && { icon: "🎯", text: `${d.atRisk} KPI(s) need attention`, href: "/strategy" },
  ].filter(Boolean) as { icon: string; text: string; href: string }[];

  const steps = [
    { label: "Add your first customer", done: d.customers > 0, href: "/customers" },
    { label: "Add your first product or service", done: d.products > 0, href: "/products" },
    { label: "Create your first invoice", done: d.invoices > 0, href: "/invoices/new" },
  ];
  const setupDone = steps.every((x) => x.done);

  const enabledSlugs = tenant?.enabledModules ?? businessModules.map((m) => m.slug);
  const yours = businessModules.filter((m) => enabledSlugs.includes(m.slug));
  const available = businessModules.filter((m) => !enabledSlugs.includes(m.slug));

  return (
    <div>
      <p style={{ color: "#5f6b7a", margin: "0 0 4px", fontSize: 14 }}>Hi {session.name} · your goal is to {GOAL_TEXT[goal] ?? "grow your business"}</p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 12, marginBottom: 16 }}>
        <Link href={hero.href} style={{ textDecoration: "none", background: "#185fa5", color: "#fff", borderRadius: 14, padding: "1.25rem 1.5rem", display: "block" }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{hero.label}</div>
          <div style={{ fontSize: 34, fontWeight: 600, margin: "4px 0" }}>{hero.value}</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>{hero.sub} →</div>
        </Link>
        <section style={{ background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 14, padding: "1rem 1.25rem" }}>
          <strong style={{ fontSize: 14 }}>Needs your attention</strong>
          {attention.length === 0 && <div style={{ color: "#5f6b7a", fontSize: 13, marginTop: 8 }}>You&apos;re all caught up 🎉</div>}
          {attention.map((a) => (
            <Link key={a.text} href={a.href} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 13, color: "#1f2933", textDecoration: "none" }}>
              <span>{a.icon}</span><span style={{ flex: 1 }}>{a.text}</span><span style={{ color: "#185fa5" }}>→</span>
            </Link>
          ))}
        </section>
      </div>

      {goal === "customers" && <ShareLink slug={tenant?.slug ?? ""} />}

      {!setupDone && (
        <section style={card}>
          <strong style={{ fontSize: 15 }}>Finish setting up</strong>
          {steps.map((step) => (
            <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid #eef2f6" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: "1.5px solid " + (step.done ? "#1d9e75" : "#cbd5e0"), background: step.done ? "#1d9e75" : "transparent", color: "#fff", fontSize: 12, textAlign: "center", lineHeight: "16px" }}>{step.done ? "✓" : ""}</span>
              <span style={{ flex: 1, fontSize: 14, color: step.done ? "#5f6b7a" : "#1f2933" }}>{step.label}</span>
              {!step.done && <Link href={step.href} style={{ fontSize: 13, color: "#185fa5" }}>Start →</Link>}
            </div>
          ))}
        </section>
      )}

      {goal !== "customers" && <div style={{ marginTop: 16 }}><ShareLink slug={tenant?.slug ?? ""} /></div>}

      <h2 style={{ fontSize: 16, margin: "1.5rem 0 0.75rem" }}>Your modules</h2>
      <div style={grid}>
        {yours.map((m) => {
          const href = m.status === "available" && m.href ? m.href : `/modules/${m.slug}`;
          return (
            <div key={m.slug} style={{ ...card, margin: 0, opacity: m.status === "soon" ? 0.7 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Link href={href} style={{ fontSize: 14, fontWeight: 500, color: "#1f2933", textDecoration: "none" }}>{m.name}</Link>
                <form action={disableModule}><input type="hidden" name="slug" value={m.slug} />
                  <button type="submit" aria-label="Remove module" style={{ border: "none", background: "transparent", padding: "4px 10px", color: "#6f6685", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button></form>
              </div>
              <Link href={href} style={{ fontSize: 13, color: "#5f6b7a", textDecoration: "none", display: "block", marginTop: 4 }}>{m.desc}</Link>
            </div>
          );
        })}
      </div>

      {available.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, margin: "1.75rem 0 0.75rem" }}>Add modules <span style={{ fontSize: 13, color: "#6f6685", fontWeight: 400 }}>· switch on what you need, when you need it</span></h2>
          <div style={grid}>
            {available.map((m) => (
              <div key={m.slug} style={{ ...card, margin: 0, background: "#f6f8fa" }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: "#5f6b7a", margin: "2px 0 8px" }}>{m.desc}</div>
                <form action={enableModule}><input type="hidden" name="slug" value={m.slug} />
                  <SubmitButton style={{ fontSize: 13, padding: "5px 12px", borderRadius: 8, border: "0.5px solid #185fa5", background: "#fff", color: "#185fa5", fontWeight: 500, cursor: "pointer" }}>+ Add</SubmitButton></form>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 16, margin: "1.75rem 0 0.75rem" }}>Platform tools</h2>
      <ModuleGrid mods={platformModules} />
    </div>
  );
}

function ModuleGrid({ mods }: { mods: ModuleDef[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
      {mods.map((m) => {
        const href = m.status === "available" && m.href ? m.href : `/modules/${m.slug}`;
        return (
          <Link key={m.slug} href={href} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ ...card, margin: 0, height: "100%", opacity: m.status === "soon" ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 14 }}>{m.name}</strong>
                {m.status === "available" ? <span style={pill("#0f6e56", "#e1f5ee")}>ready</span> : <span style={pill("#888780", "#f1efe8")}>soon</span>}
              </div>
              <div style={{ fontSize: 13, color: "#5f6b7a", marginTop: 4 }}>{m.desc}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "0.5px solid #d9e2ec", borderRadius: 12, padding: "1.1rem 1.25rem", marginTop: 16 };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 };
const pill = (color: string, bg: string): React.CSSProperties => ({ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: bg, color });
