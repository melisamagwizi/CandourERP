// Single registry of Candour modules, used by the dashboard and landing.
// "available" modules have working screens; "soon" open a preview page.
export type ModuleStatus = "available" | "soon";

export interface ModuleDef {
  slug: string;
  name: string;
  desc: string;
  href?: string;          // real route for available modules
  status: ModuleStatus;
  planned?: string[];     // preview of capabilities for "soon" modules
}

export const MODULES: ModuleDef[] = [
  { slug: "crm", name: "Customers", desc: "Contacts & companies", href: "/customers", status: "available" },
  { slug: "products", name: "Products & Services", desc: "Your price book", href: "/products", status: "available" },
  { slug: "billing", name: "Billing", desc: "Invoices & payments", href: "/invoices", status: "available" },
  { slug: "finance", name: "Finance", desc: "Cash, budgets, position", status: "soon",
    planned: ["Cash inflows & expenditure tracking", "Budgets vs. actual", "Financial position snapshot", "One-tap financial reports"] },
  { slug: "sales", name: "Sales", desc: "Leads & pipeline", status: "soon",
    planned: ["Pipeline & sales stages", "Quotations & sales orders", "Forecasting & targets", "Win/loss analysis"] },
  { slug: "projects", name: "Projects", desc: "Tasks & delivery", status: "soon",
    planned: ["Tasks, milestones & Gantt", "Timesheets that flow to billing", "Budgets & resource allocation", "Risks, issues & client collaboration"] },
  { slug: "stock", name: "Stock Control", desc: "Inventory levels", status: "soon",
    planned: ["Warehouses & stock movements", "Reorder levels & low-stock alerts", "Barcode/QR & batch tracking", "Stock valuation & reporting"] },
  { slug: "assets", name: "Assets", desc: "Equipment & lifecycle", status: "soon",
    planned: ["Asset register & assignment", "Maintenance & warranty tracking", "Depreciation & lifecycle status", "QR labels & audits"] },
  { slug: "marketing", name: "Marketing", desc: "Campaigns & segments", status: "soon",
    planned: ["Email / SMS / WhatsApp campaigns", "Segments & lead-capture forms", "Drip automation & templates", "ROI & attribution analytics"] },
  { slug: "operations", name: "Operations & Meetings", desc: "Tasks, meetings, KPIs link", status: "soon",
    planned: ["Tasks, checklists & cadences", "Meetings, minutes & action items", "Every meeting linked to a KPI", "Approvals & escalations"] },
  { slug: "strategy", name: "Strategy", desc: "Vision, SOPs, KPIs", status: "soon",
    planned: ["Vision, mission & SOPs", "KPIs, OKRs & scorecards", "Annual & quarterly plans", "Executive dashboards"] },
  { slug: "hrm", name: "People (HRM)", desc: "Employees & leave", status: "soon",
    planned: ["Employee records & org chart", "Leave, attendance & shifts", "Recruitment & onboarding", "Performance & self-service"] },
  { slug: "payroll", name: "Payroll", desc: "Pay runs & payslips", status: "soon",
    planned: ["Salary structures & deductions", "Statutory & tax calculations", "Payslips & bank files", "Approval workflows & full audit"] },
];

export const getModule = (slug: string) => MODULES.find((m) => m.slug === slug);
