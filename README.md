# Candour ERP

The light, all-in-one platform that runs an entrepreneur's business.
Multi-tenant SaaS · Next.js + Drizzle + PostgreSQL.

## Stack
- **Web:** Next.js 15 (App Router) + React 19 + TypeScript
- **Data:** local PostgreSQL via Drizzle ORM (`postgres-js` driver)
- **Tenancy:** Postgres Row-Level Security — every query scoped by `app.tenant_id`

## One-time database setup
The app connects as a **non-superuser** role so RLS is actually enforced.
Run this once as the `postgres` superuser:

```sql
CREATE ROLE candour_app LOGIN PASSWORD 'devpass';
CREATE DATABASE candour OWNER candour_app;
```

Copy `.env.example` to `.env` (already provided for local dev). Adjust the
password if you used a different one.

## Build it up
```bash
npm install
npm run db:generate   # generate SQL migration from the schema
npm run db:setup      # migrate + apply RLS + seed demo data
npm run dev           # http://localhost:3000
```

`db:setup` runs three steps you can also run individually:
`db:migrate`, `db:rls`, `db:seed`.

## How tenant isolation works
All data access goes through `withTenant(tenantId, tx => …)` in
`src/db/index.ts`, which opens a transaction and sets `app.tenant_id`.
RLS policies (see `src/db/apply-rls.ts`) constrain every read and write to
that tenant. Because `candour_app` is not a superuser and policies use
`FORCE ROW LEVEL SECURITY`, cross-tenant access is impossible.

## Roadmap (Phase 1 — the cash loop)
CRM → Sales → Product & Services → Billing → Finance. Schema for the
foundation + billing core is in `src/db/schema.ts`; remaining modules
follow the same conventions.
