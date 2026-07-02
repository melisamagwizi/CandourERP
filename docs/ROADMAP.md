# Candour — Product Brain (living roadmap)

The single place where nothing falls through the cracks. Update as we go.

## 1. North star
Run your whole business in one **light** app. Lead with the founder's real
bottleneck. For our design-partner founder that bottleneck is **demand
generation** (access to markets / getting sign-ups), not back-office.

## 2. Founder / design-partner profile
- **Business:** services / consulting **+ retainers + products** (a mix)
- **Team:** 2–5 people, no IT
- **#1 pain:** *access to markets and getting people to sign up* → top-of-funnel
- **Implication:** front-office (get customers) matters more than more back-office

## 3. Product philosophy
Light for the entrepreneur · opinionated defaults · progressive disclosure ·
grows-with-you · mobile- & WhatsApp-first · plain language · calm UI.

## 4. What's built (ready)
- **13 business modules:** CRM, Products & Services, Billing, Finance, Sales,
  Projects, Operations & Meetings, Strategy, HRM, Payroll, Stock, Assets
- **Cash loop end-to-end:** lead → pipeline → win→auto-invoice → send
  (PDF/WhatsApp/email) → mark paid → cash position in Finance
- **Onboarding:** founder **discovery wizard** → auto-drafts Strategy
  (vision/mission/KPIs from the goal)
- **Demand gen:** public **storefront `/c/[slug]`** → sign-ups become
  CRM leads + pipeline deals; dashboard **ShareLink** (copy / WhatsApp)
- Marketing landing page, trial checkout, self-serve signup, auth (sessions)

## 5. Architecture — solid vs debt
**Solid (hard-to-change, done right):** Postgres RLS multi-tenancy (proven),
money in integer minor units, one typed Drizzle schema, business logic
extracted + smoke-tested, shared engines (tasks, catalogue), gapless numbering.
**Debt (mostly additive, not structural):**
- RBAC exists in schema but **not enforced** (everyone = owner)
- **Audit log table unwired** (nothing writes to it)
- **No committed test suite / CI** (used throwaway smoke scripts)
- **Input validation ad-hoc** (no Zod layer)
- Self-rolled auth (no MFA / reset / rate-limit)
- deal→won→invoice spans 2 transactions (consistency seam)
- Not deployed (local Postgres); no observability
- A few N+1 query patterns

## 6. Outstanding (by category)
- **Depth in ready modules:** recurring invoices, dunning, credit notes;
  quotes/forecasting; cash-flow **runway/forecast**, budgets, reconciliation;
  timesheets→billing, Gantt; meeting minutes/approvals; real payroll tax packs
- **Platform tools (still preview):** Reporting, Documents, Workflow, Search,
  Notifications
- **Channels:** mobile apps; **automated** WhatsApp/email send (currently
  wa.me/mailto only); AI copilot
- **Payments:** Stripe (trial doesn't bill; no online invoice payment)
- **Integrations:** M365/Google, calendars, social, Stripe/PayPal/Paynow/
  Ecocash/OneMoney, banks, Power BI, QuickBooks/Sage/Xero
- **Prod-readiness:** managed hosting (Vercel+Neon), backups, tests+CI,
  monitoring, rate-limiting, WCAG, i18n
- **Security:** field-level encryption (payroll/bank), webhook verification,
  step-up auth, dep/secret scanning
- **Storefront:** anti-spam / rate-limit on the public write

## 7. Brainstorm — ideas (mind-map)
**Personalisation**
- Goal-driven dashboard + "needs your attention" feed (← building now)
- Company branding (logo, colour → app + invoices/PDF)
- Industry-tailored terminology, module order, seed data (we capture industry)
- Role-aware experience (owner vs sales vs employee) — needs RBAC

**Demand generation (founder's #1 pain)**
- Public storefront + lead capture ✅ (done)
- Marketing broadcast to contacts (WhatsApp/email)
- Referral link (customers bring customers)
- Booking/calendar for consults; online product orders/checkout
- Lead-source analytics; simple landing/campaign pages

**Intelligence**
- AI copilot over own data ("who owes me?", proactive nudges, draft actions)
- Cash-flow runway/forecast; profitability per client; smart reminders

**Growth / monetisation**
- Stripe subscription billing; module-based pricing/licensing
- Country packs (payroll/tax), starting Zimbabwe/SADC

## 8. Prioritised roadmap (recommendation)
1. Goal-driven personalised dashboard (in progress)
2. Harden: Zod validation + RBAC enforcement + audit wiring + tests + deploy
3. Marketing broadcast + referral (extend demand-gen wedge)
4. Stripe (make trial bill + invoice payment links)
5. AI copilot; cash-flow forecast; branding
6. Platform tools (Reporting first), mobile, integrations, country packs

## 9. Open decisions
- WhatsApp provider (Meta Cloud API vs BSP e.g. 360dialog) for automated send
- First payroll country pack (Zimbabwe/SADC?)
- Subscription pricing/tiering; hosting choice (Vercel+Neon assumed)
- Real logo (placeholder SVG in use — drop PNG into /public)
