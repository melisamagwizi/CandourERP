import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { db, withTenant } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { businessModules, platformModules } from "@/modules";
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
    const [prj] = await tx.select({ active: sql<number>`count(*) filter (where ${s.projects.status} = 'active')::int` }).from(s.projects);
    const [lv] = await tx.select({ pending: sql<number>`count(*) filter (where ${s.leaveRequests.status} = 'pending')::int` }).from(s.leaveRequests);
    const [obj] = await tx.select({ risk: sql<number>`count(*) filter (where ${s.objectives.status} <> 'on_track')::int` }).from(s.objectives);
    const [txn] = await tx.select({ inflow: sql<number>`coalesce(sum(${s.transactions.amountMinor}) filter (where ${s.transactions.type} = 'inflow' and ${s.transactions.occurredAt} >= date_trunc('month', now())), 0)::bigint` }).from(s.transactions);
    return {
      customers: Number(acc.n), products: Number(prod.n), lowStock: Number(prod.low),
      leads: Number(opp.leads), pipeline: Number(opp.pipeline), followUp: Number(opp.followUp),
      invoices: Number(inv.n), unpaidN: Number(inv.unpaidN), unpaid: Number(inv.unpaid), overdue: Number(inv.overdue),
      openTasks: Number(tsk.open), overdueTasks: Number(tsk.overdue), activeProjects: Number(prj.active),
      pendingLeave: Number(lv.pending), atRisk: Number(obj.risk), inflow: Number(txn.inflow),
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

  const cockpit = [
    { label: "Revenue this month", value: money(d.inflow), href: "/finance", tone: "" },
    { label: "Pipeline value", value: money(d.pipeline), href: "/sales", tone: "" },
    { label: "Active projects", value: String(d.activeProjects), href: "/projects", tone: "" },
    { label: "Invoices overdue", value: String(d.overdue), href: "/invoices", tone: d.overdue > 0 ? "text-bad" : "" },
    { label: "Tasks overdue", value: String(d.overdueTasks), href: "/operations", tone: d.overdueTasks > 0 ? "text-warn" : "" },
  ];

  const attention = [
    d.overdue > 0 && { icon: "🔴", text: `${d.overdue} invoice(s) overdue — chase them`, href: "/invoices" },
    d.unpaidN > 0 && { icon: "💰", text: `You're owed ${money(d.unpaid)} across ${d.unpaidN} invoice(s)`, href: "/invoices" },
    d.followUp > 0 && { icon: "⏰", text: `${d.followUp} lead(s) need follow-up`, href: "/sales" },
    d.leads > 0 && { icon: "✨", text: `${d.leads} lead(s) in your pipeline`, href: "/sales" },
    d.pendingLeave > 0 && { icon: "🌿", text: `${d.pendingLeave} leave request(s) awaiting approval`, href: "/hrm" },
    d.lowStock > 0 && { icon: "📦", text: `${d.lowStock} product(s) low on stock`, href: "/stock" },
    d.overdueTasks > 0 && { icon: "📌", text: `${d.overdueTasks} task(s) overdue`, href: "/operations" },
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
      <p className="m-0 text-[13px] text-mute">
        Hi {session.name} · your goal is to {GOAL_TEXT[goal] ?? "grow your business"}
      </p>
      <h1 className="mt-1 mb-5 text-[26px] font-semibold tracking-tight">CEO cockpit</h1>

      <div className="mb-4 grid gap-3 md:grid-cols-[1.25fr_1fr]">
        <Link href={hero.href} className="block rounded-card bg-ink p-6 text-white no-underline transition-opacity hover:opacity-90">
          <div className="text-[13px] text-white/70">{hero.label}</div>
          <div className="my-1 text-[38px] font-semibold leading-tight tracking-tight">{hero.value}</div>
          <div className="text-[13px] text-white/70">{hero.sub} →</div>
        </Link>

        <section className="rounded-card border border-line bg-card p-5">
          <div className="text-[14px] font-semibold">Needs your attention</div>
          {attention.length === 0 && <div className="mt-2 text-[13px] text-mute">You&apos;re all caught up 🎉</div>}
          <div className="mt-1">
            {attention.slice(0, 6).map((a) => (
              <Link key={a.text} href={a.href} className="flex items-center gap-2 py-1.5 text-[13px] text-ink no-underline hover:text-accent">
                <span>{a.icon}</span><span className="flex-1">{a.text}</span><span className="text-accent">→</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {cockpit.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-card border border-line bg-card p-4 no-underline transition-colors hover:border-ink/30">
            <div className="text-[12px] text-mute">{c.label}</div>
            <div className={`mt-1 text-[21px] font-semibold tracking-tight text-ink ${c.tone}`}>{c.value}</div>
          </Link>
        ))}
      </div>

      {goal === "customers" && <ShareLink slug={tenant?.slug ?? ""} />}

      {!setupDone && (
        <section className="mt-4 rounded-card border border-line bg-card p-5">
          <div className="text-[15px] font-semibold">Finish setting up</div>
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2.5 border-b border-line/60 py-2 last:border-b-0">
              <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[11px] text-white ${step.done ? "border-ok bg-ok" : "border-line bg-transparent"}`}>
                {step.done ? "✓" : ""}
              </span>
              <span className={`flex-1 text-[14px] ${step.done ? "text-mute" : "text-ink"}`}>{step.label}</span>
              {!step.done && <Link href={step.href} className="text-[13px] text-accent no-underline">Start →</Link>}
            </div>
          ))}
        </section>
      )}

      {goal !== "customers" && <div className="mt-4"><ShareLink slug={tenant?.slug ?? ""} /></div>}

      <h2 className="mt-7 mb-3 text-[15px] font-semibold">Your modules</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {yours.map((m) => (
          <div key={m.slug} className="rounded-card border border-line bg-card p-4 transition-colors hover:border-ink/30">
            <div className="flex items-center justify-between">
              <Link href={m.status === "available" && m.href ? m.href : `/modules/${m.slug}`} className="text-[14px] font-medium text-ink no-underline">{m.name}</Link>
              <form action={disableModule}><input type="hidden" name="slug" value={m.slug} />
                <button type="submit" aria-label="Remove module" className="cursor-pointer rounded border-0 bg-transparent px-2 py-0.5 text-[15px] text-mute hover:text-bad">×</button></form>
            </div>
            <Link href={m.status === "available" && m.href ? m.href : `/modules/${m.slug}`} className="mt-1 block text-[12px] text-mute no-underline">{m.desc}</Link>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <>
          <h2 className="mt-6 mb-3 text-[15px] font-semibold">Add modules <span className="font-normal text-mute">· switch on what you need</span></h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {available.map((m) => (
              <div key={m.slug} className="rounded-card border border-dashed border-line bg-paper p-4">
                <div className="text-[14px] font-medium">{m.name}</div>
                <div className="mt-0.5 mb-2.5 text-[12px] text-mute">{m.desc}</div>
                <form action={enableModule}><input type="hidden" name="slug" value={m.slug} />
                  <button type="submit" className="cursor-pointer rounded-lg border border-line bg-card px-3 py-1 text-[12px] font-medium text-ink hover:border-ink/40">+ Add</button></form>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-7 text-[12px] text-mute">
        Platform tools (coming soon):{" "}
        {platformModules.map((m, i) => (
          <span key={m.slug}>
            {i > 0 && " · "}
            <Link href={`/modules/${m.slug}`} className="text-mute underline decoration-line underline-offset-2 hover:text-ink">{m.name}</Link>
          </span>
        ))}
      </p>
    </div>
  );
}
