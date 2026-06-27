// Single registry of Candour modules, used by the dashboard shell.
// "available" modules have working capture screens; "soon" are planned.
export type ModuleStatus = "available" | "soon";

export interface ModuleDef {
  slug: string;
  name: string;
  desc: string;
  href?: string;
  status: ModuleStatus;
}

export const MODULES: ModuleDef[] = [
  { slug: "crm",        name: "Customers",            desc: "Contacts & companies",   href: "/customers", status: "available" },
  { slug: "products",   name: "Products & Services",  desc: "Your price book",        href: "/products",  status: "available" },
  { slug: "billing",    name: "Billing",              desc: "Invoices & payments",    href: "/invoices",  status: "available" },
  { slug: "finance",    name: "Finance",              desc: "Cash, budgets, position",                    status: "soon" },
  { slug: "sales",      name: "Sales",                desc: "Leads & pipeline",                           status: "soon" },
  { slug: "projects",   name: "Projects",             desc: "Tasks & delivery",                           status: "soon" },
  { slug: "stock",      name: "Stock Control",        desc: "Inventory levels",                           status: "soon" },
  { slug: "assets",     name: "Assets",               desc: "Equipment & lifecycle",                      status: "soon" },
  { slug: "marketing",  name: "Marketing",            desc: "Campaigns & segments",                       status: "soon" },
  { slug: "operations", name: "Operations & Meetings", desc: "Tasks, meetings, KPIs link",                status: "soon" },
  { slug: "strategy",   name: "Strategy",             desc: "Vision, SOPs, KPIs",                         status: "soon" },
  { slug: "hrm",        name: "People (HRM)",         desc: "Employees & leave",                          status: "soon" },
  { slug: "payroll",    name: "Payroll",              desc: "Pay runs & payslips",                        status: "soon" },
];
