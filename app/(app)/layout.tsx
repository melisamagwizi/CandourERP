import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requireAuth } from "@/auth/current";
import { logout } from "@/auth/actions";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const [tenant] = await db
    .select({ name: s.tenants.name, enabledModules: s.tenants.enabledModules })
    .from(s.tenants).where(eq(s.tenants.id, session.tenantId));

  return (
    <div>
      <Sidebar
        enabledSlugs={tenant?.enabledModules ?? null}
        tenantName={tenant?.name ?? "Candour"}
        userName={session.name}
        logout={logout}
      />
      <main className="md:pl-60">
        <div className="mx-auto max-w-5xl px-5 py-7 pb-24 md:px-8 md:pb-10">{children}</div>
      </main>
    </div>
  );
}
