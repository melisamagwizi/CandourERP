// Single registry of Candour modules, used by the dashboard and landing.
// "available" modules have working screens; "soon" open a preview page.
export type ModuleStatus = "available" | "soon";
export type ModuleGroup = "business" | "platform";

export interface ModuleDef {
  slug: string;
  name: string;
  desc: string;
  group: ModuleGroup;
  href?: string;          // real route for available modules
  status: ModuleStatus;
  planned?: string[];     // preview of capabilities for "soon" modules
}

export const MODULES: ModuleDef[] = [
  // --- business modules ---
  { slug: "crm", name: "Customers", desc: "Contacts & companies", group: "business", href: "/customers", status: "available" },
  { slug: "products", name: "Products & Services", desc: "Your price book", group: "business", href: "/products", status: "available" },
  { slug: "billing", name: "Billing", desc: "Invoices & payments", group: "business", href: "/invoices", status: "available" },
  { slug: "finance", name: "Finance", desc: "Cash, expenses, position", group: "business", href: "/finance", status: "available" },
  { slug: "sales", name: "Sales", desc: "Leads & pipeline", group: "business", href: "/sales", status: "available" },
  { slug: "projects", name: "Projects", desc: "Tasks & delivery", group: "business", status: "soon",
    planned: ["Tasks, milestones & Gantt", "Timesheets that flow to billing", "Budgets & resource allocation", "Risks, issues & client collaboration"] },
  { slug: "stock", name: "Stock Control", desc: "Inventory levels", group: "business", status: "soon",
    planned: ["Warehouses & stock movements", "Reorder levels & low-stock alerts", "Barcode/QR & batch tracking", "Stock valuation & reporting"] },
  { slug: "assets", name: "Assets", desc: "Equipment & lifecycle", group: "business", status: "soon",
    planned: ["Asset register & assignment", "Maintenance & warranty tracking", "Depreciation & lifecycle status", "QR labels & audits"] },
  { slug: "marketing", name: "Marketing", desc: "Campaigns & segments", group: "business", status: "soon",
    planned: ["Email / SMS / WhatsApp campaigns", "Segments & lead-capture forms", "Drip automation & templates", "ROI & attribution analytics"] },
  { slug: "operations", name: "Operations & Meetings", desc: "Tasks, meetings, KPIs link", group: "business", status: "soon",
    planned: ["Tasks, checklists & cadences", "Meetings, minutes & action items", "Every meeting linked to a KPI", "Approvals & escalations"] },
  { slug: "strategy", name: "Strategy", desc: "Vision, SOPs, KPIs", group: "business", status: "soon",
    planned: ["Vision, mission & SOPs", "KPIs, OKRs & scorecards", "Annual & quarterly plans", "Executive dashboards"] },
  { slug: "hrm", name: "People (HRM)", desc: "Employees & leave", group: "business", status: "soon",
    planned: ["Employee records & org chart", "Leave, attendance & shifts", "Recruitment & onboarding", "Performance & self-service"] },
  { slug: "payroll", name: "Payroll", desc: "Pay runs & payslips", group: "business", status: "soon",
    planned: ["Salary structures & deductions", "Statutory & tax calculations", "Payslips & bank files", "Approval workflows & full audit"] },

  // --- platform tools ---
  { slug: "reporting", name: "Reporting", desc: "Reports & analytics", group: "platform", status: "soon",
    planned: ["Standard & custom reports", "Drill-down dashboards", "Export to PDF / Excel / CSV", "Power BI integration", "Scheduled delivery"] },
  { slug: "documents", name: "Documents", desc: "Files & e-signatures", group: "platform", status: "soon",
    planned: ["Upload, tag & version files", "Folders & approval routing", "OCR & electronic signatures", "Attach to any record"] },
  { slug: "workflow", name: "Workflow Automation", desc: "Rules & approvals", group: "platform", status: "soon",
    planned: ["Approval workflows", "Conditional logic & business rules", "Auto task creation & escalations", "Low-code configuration"] },
  { slug: "search", name: "Search", desc: "Find anything", group: "platform", status: "soon",
    planned: ["Global search across records", "Advanced filters & saved searches", "Permission-aware results", "Quick actions"] },
  { slug: "notifications", name: "Notifications", desc: "Alerts & reminders", group: "platform", status: "soon",
    planned: ["Email, SMS, WhatsApp & push", "Reminders & escalations", "Configurable templates", "Auditable delivery"] },
];

export const getModule = (slug: string) => MODULES.find((m) => m.slug === slug);
export const businessModules = MODULES.filter((m) => m.group === "business");
export const platformModules = MODULES.filter((m) => m.group === "platform");
