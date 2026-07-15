"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, TrendingUp, Users, Package, FileText, Wallet, FolderKanban,
  CalendarCheck, UserRound, Banknote, Boxes, Archive, Target, LogOut,
} from "lucide-react";

type Item = { href: string; label: string; slug: string | null; icon: React.ComponentType<{ size?: number }> };
type Group = { label: string | null; items: Item[] };

const NAV: Group[] = [
  { label: null, items: [{ href: "/dashboard", label: "Home", slug: null, icon: Home }] },
  { label: "Sell", items: [
    { href: "/sales", label: "Pipeline", slug: "sales", icon: TrendingUp },
    { href: "/customers", label: "Customers", slug: "crm", icon: Users },
    { href: "/products", label: "Products", slug: "products", icon: Package },
  ]},
  { label: "Money", items: [
    { href: "/invoices", label: "Invoices", slug: "billing", icon: FileText },
    { href: "/finance", label: "Finance", slug: "finance", icon: Wallet },
  ]},
  { label: "Deliver", items: [
    { href: "/projects", label: "Projects", slug: "projects", icon: FolderKanban },
    { href: "/operations", label: "Operations", slug: "operations", icon: CalendarCheck },
  ]},
  { label: "People", items: [
    { href: "/hrm", label: "People", slug: "hrm", icon: UserRound },
    { href: "/payroll", label: "Payroll", slug: "payroll", icon: Banknote },
  ]},
  { label: "Stock & assets", items: [
    { href: "/stock", label: "Stock", slug: "stock", icon: Boxes },
    { href: "/assets", label: "Assets", slug: "assets", icon: Archive },
  ]},
  { label: "Direction", items: [
    { href: "/strategy", label: "Strategy", slug: "strategy", icon: Target },
  ]},
];

function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="24" cy="24" r="16.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M31 15.5a11 11 0 1 0 0 17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 13.5v21M17.5 24h13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Sidebar({
  enabledSlugs, tenantName, userName, logout,
}: {
  enabledSlugs: string[] | null;
  tenantName: string;
  userName: string;
  logout: () => Promise<void>;
}) {
  const pathname = usePathname();
  const visible = (item: Item) => item.slug === null || enabledSlugs === null || enabledSlugs.includes(item.slug);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length > 0);
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-card md:flex">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 pt-6 pb-4 text-ink no-underline">
          <Mark />
          <span className="text-[15px] font-semibold tracking-[0.18em]">CANDOUR</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((g, gi) => (
            <div key={gi} className="mt-3 first:mt-1">
              {g.label && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-mute">{g.label}</div>
              )}
              {g.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}
                    className={`mb-0.5 flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] no-underline transition-colors ${
                      active ? "bg-ink font-medium text-white" : "text-ink-2 hover:bg-paper"
                    }`}>
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <div className="truncate text-[13px] font-medium">{tenantName}</div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-[12px] text-mute">{userName}</span>
            <form action={logout}>
              <button type="submit" title="Sign out" aria-label="Sign out"
                className="flex cursor-pointer items-center gap-1 rounded-lg border-0 bg-transparent p-1.5 text-mute hover:bg-paper hover:text-ink">
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-card md:hidden">
        {[
          { href: "/dashboard", label: "Home", icon: Home },
          { href: "/sales", label: "Sell", icon: TrendingUp },
          { href: "/invoices", label: "Money", icon: FileText },
          { href: "/projects", label: "Deliver", icon: FolderKanban },
          { href: "/finance", label: "Finance", icon: Wallet },
        ].map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] no-underline ${active ? "font-semibold text-ink" : "text-mute"}`}>
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
