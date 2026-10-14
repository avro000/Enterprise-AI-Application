import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.svg";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  FileCheck2,
  FileText,
  Gauge,
  History,
  Layers,
  Lock,
  PlayCircle,
  Radar,
  RefreshCw,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Workflow,
  XCircle,
} from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";

const AUTH_HREF = "/auth?returnTo=%2Fdashboard";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

const LOOP_STEPS = [
  { step: "01", name: "Detect", desc: "Live event & webhook triggers" },
  { step: "02", name: "Understand", desc: "Cross-system context correlation" },
  { step: "03", name: "Prioritize", desc: "SLA deadline & impact scoring" },
  { step: "04", name: "Recommend", desc: "Grounded playbook synthesis" },
  { step: "05", name: "Authorize", desc: "Human approval & governance" },
  { step: "06", name: "Execute", desc: "Audited write-back to ERP/CRM" },
  { step: "07", name: "Verify", desc: "Closed-loop confirmation" },
];

interface CaseScenario {
  id: string;
  code: string;
  orderNumber: string;
  severity: "critical" | "high" | "medium";
  riskLabel: string;
  title: string;
  policy: string;
  confidence: string;
  sourcesCount: number;
  recommendedAction: string;
  requiredRole: string;
  erpDetails: { customer: string; sku: string; stockout: string; deadline: string };
  citations: string[];
}

const DEMO_CASES: CaseScenario[] = [
  {
    id: "case-1",
    code: "EX-20381",
    orderNumber: "ORD-48321",
    severity: "critical",
    riskLabel: "SLA Breach in 4h",
    title: "Supplier inventory shortage — Priority tier client projected to miss delivery window",
    policy: "Tier-1 accounts require alternative SKU provision within 4 hours of supplier stockout.",
    confidence: "94% Match",
    sourcesCount: 4,
    recommendedAction: "Dispatch pre-approved alternative SKU-904B from secondary fulfillment hub and notify Key Account Director.",
    requiredRole: "Operations Manager",
    erpDetails: {
      customer: "Global BioTech Labs (Tier 1)",
      sku: "SKU-4820A (Primary Lot Shortage: -420 units)",
      stockout: "Confirmed by Supplier EDI feed at 08:14 EST",
      deadline: "SLA penalty activates at 16:00 EST ($14,500 penalty)",
    },
    citations: [
      "Master Services Agreement §8.3 (Tier-1 SLA Penalty Matrix)",
      "Standard Operating Procedure SOP-OPS-04 (Alternative Inventory Allocation)",
      "Supplier Logistics Contract (Apex Supply Co, Schedule B)",
      "SAP ERP Order History ORD-48321",
    ],
  },
  {
    id: "case-2",
    code: "EX-20419",
    orderNumber: "SHP-9104",
    severity: "high",
    riskLabel: "Customs Hold",
    title: "International freight customs documentation mismatch at Port of Rotterdam",
    policy: "Cross-border shipments with HS-Code discrepancies require compliance officer verification before resubmission.",
    confidence: "91% Match",
    sourcesCount: 3,
    recommendedAction: "Generate revised Certificate of Origin with updated tariff classification 8471.60 and submit to Dutch Customs.",
    requiredRole: "Trade Compliance Lead",
    erpDetails: {
      customer: "Nordic Engineering BV",
      sku: "Industrial Telemetry Controller Units (qty 120)",
      stockout: "Container detained at Terminal 4 due to invoice line mismatch",
      deadline: "Demurrage charges begin in 18 hours (€850/day)",
    },
    citations: [
      "EU Import Regulatory Guidelines (Tariff Harmonization 2026)",
      "International Logistics Playbook §14 (Port Clearance Expedites)",
      "Commercial Invoice INV-2026-904",
    ],
  },
  {
    id: "case-3",
    code: "EX-20502",
    orderNumber: "INV-7714",
    severity: "medium",
    riskLabel: "Billing Variance",
    title: "Volume pricing tier discount omitted on recurring enterprise contract renewal",
    policy: "Annual contract renewals exceeding 500 seats automatically qualify for 18% tier-2 volume rebate.",
    confidence: "98% Match",
    sourcesCount: 3,
    recommendedAction: "Apply automated credit memorandum for $3,420 and regenerate corrected invoice for finance review.",
    requiredRole: "Billing Specialist",
    erpDetails: {
      customer: "Meridian Financial Services",
      sku: "Enterprise Cloud Subscription (620 user tier)",
      stockout: "Billing discrepancy flagged during monthly automated reconciliation",
      deadline: "Payment due date in 5 business days",
    },
    citations: [
      "Enterprise Master Pricing Schedule v4.2",
      "Salesforce Account Record ACCT-77142 (Signed Renewal Addendum)",
      "Stripe Billing Ledger Rec-88912",
    ],
  },
];

const ROLES_PERSPECTIVES = [
  {
    id: "manager",
    label: "Operations Manager",
    badge: "Triage & Approvals",
    headline: "Transform reactive crisis management into disciplined closed-loop orchestration.",
    description:
      "Start the day with an intelligent exception triage screen. OpsPilot groups correlated failures, evaluates SLA breach urgency, and presents ready-to-authorize action plans.",
    kpi: "82% reduction in exception triage time",
    deliverables: [
      "Centralized morning command center with real-time severity scoring",
      "Pre-investigated cases with grounded root cause and evidence audit",
      "One-click action approval with built-in compliance guardrails",
      "Automated team dispatch and escalation routing",
    ],
  },
  {
    id: "operator",
    label: "Frontline Operator",
    badge: "Knowledge & Execution",
    headline: "Eliminate the painful 6-tab swivel-chair investigation forever.",
    description:
      "Stop hunting through buried PDFs in SharePoint and fragmented ERP screens. OpsPilot correlates the ERP order, queries the exact contract clause, and drafts the solution for you.",
    kpi: "30+ minutes saved per incident",
    deliverables: [
      "Instant enterprise RAG over manuals, policies, and contracts",
      "Verbatim citations with exact document names and page numbers",
      "Automated draft communications for customers and suppliers",
      "Zero manual data re-entry across disconnected systems",
    ],
  },
  {
    id: "executive",
    label: "COO / Head of Ops",
    badge: "ROI & Compliance",
    headline: "Full operational visibility with zero unvetted autonomy.",
    description:
      "Deploy AI where it protects revenue, without gambling on unchecked agent hallucinations. Every high-risk workflow requires explicit human authorization with a cryptographic audit trail.",
    kpi: "$420,000+ measurable annual labor ROI",
    deliverables: [
      "Rigid risk-tiered autonomy matrix (Routine auto, High-risk signoff)",
      "Tamper-evident audit trail for every query, recommendation, and action",
      "Real-time SLA protection and labor savings telemetry",
      "SOC-2 Type II readiness with strict role-based access control",
    ],
  },
];

const ARCHITECTURE_LAYERS = [
  {
    badge: "Layer 01",
    title: "Enterprise Knowledge Layer",
    subtitle: "RAG & Grounded Vector Intelligence",
    color: "#4e9a6b",
    icon: <BookOpen className="size-5" />,
    description:
      "Ingests and continuously indexes your unstructured operations corpus: Standard Operating Procedures (SOPs), supplier contracts, SLA policies, and compliance manuals.",
    features: [
      "Neon PostgreSQL with pgvector embeddings",
      "Page-level citations on every generated claim",
      "Strict role-based document access control",
      "Zero training on customer enterprise data",
    ],
  },
  {
    badge: "Layer 02",
    title: "Live Enterprise Data Layer",
    subtitle: "Systems of Record Integration",
    color: "#5d94c9",
    icon: <Database className="size-5" />,
    description:
      "Connects to your core business systems without disruptive rip-and-replace. Synchronizes live telemetry from ERP, CRM, WMS, and support desk portals.",
    features: [
      "Real-time webhook and event stream ingestion",
      "Context fusion engine linking tickets to ERP orders",
      "Hybrid keyword + semantic query execution",
      "Sub-second state verification",
    ],
  },
  {
    badge: "Layer 03",
    title: "Governed Action & Audit Layer",
    subtitle: "Human-in-the-Loop Orchestration",
    color: "#c1552e",
    icon: <Workflow className="size-5" />,
    description:
      "Translates verified recommendations into real-world business actions. Low-risk updates execute automatically; financial and customer-impacting steps pause for human approval.",
    features: [
      "Configurable 3-tier risk governance matrix",
      "Bi-directional write-back to enterprise systems",
      "Complete immutable audit trail with actor IDs",
      "Automated post-action verification checks",
    ],
  },
];

const CAPABILITIES = [
  {
    icon: <Gauge className="size-4" />,
    name: "Operations Command Center",
    category: "Monitoring & Triage",
    desc: "A unified morning overview of critical exceptions, imminent SLA deadlines, at-risk client accounts, and pending approvals.",
  },
  {
    icon: <Radar className="size-4" />,
    name: "AI Exception Manager",
    category: "Root Cause Synthesis",
    desc: "Transforms isolated system alerts into structured case dossiers: severity rating, impacted revenue, root cause analysis, and remedy.",
  },
  {
    icon: <BookOpen className="size-4" />,
    name: "Enterprise Knowledge Copilot",
    category: "Grounded RAG",
    desc: "Authoritative conversational retrieval across all corporate playbooks and vendor agreements, backed by direct page-level citations.",
  },
  {
    icon: <SearchCheck className="size-4" />,
    name: "Cross-System Investigation",
    category: "Context Fusion",
    desc: "Automatically gathers context across ERP orders, supplier manifests, and contract clauses to show the complete operational lineage.",
  },
  {
    icon: <ShieldCheck className="size-4" />,
    name: "Human-in-the-Loop Action Center",
    category: "Governance",
    desc: "Stage proposed actions with complete visibility into parameters, consequence modeling, and single-click approval controls.",
  },
  {
    icon: <Boxes className="size-4" />,
    name: "Automated Workflow Dispatch",
    category: "Execution",
    desc: "Dispatches approved steps via enterprise APIs, validates write-back success, and closes the case with verified audit receipts.",
  },
  {
    icon: <Activity className="size-4" />,
    name: "Business Value Dashboard",
    category: "ROI Analytics",
    desc: "Quantifies operational hours saved, SLA penalties averted, and resolution velocity improvements with verifiable board-ready metrics.",
  },
];

const RISK_RULES = [
  {
    action: "Retrieve policies · summarize incident context · calculate SLA urgency",
    tier: "Tier 1: Autonomous",
    color: "#4e9a6b",
    status: "Automatic Execution",
    description: "Read-only analytics and internal synthesis carry zero downside risk.",
  },
  {
    action: "Create internal task · update internal case note · tag escalation queue",
    tier: "Tier 1: Autonomous",
    color: "#4e9a6b",
    status: "Automatic Execution",
    description: "Internal team coordination executes immediately to maintain velocity.",
  },
  {
    action: "Reassign case owner · dispatch internal Slack/Teams alert · schedule sync",
    tier: "Tier 2: Configurable",
    color: "#e0a23c",
    status: "Rule-Based Auto/Gate",
    description: "Executed automatically unless specific VIP account thresholds apply.",
  },
  {
    action: "Dispatch external customer communication · notify key stakeholders",
    tier: "Tier 3: Authorization Gate",
    color: "#c0453c",
    status: "Mandatory Human Approval",
    description: "Customer-facing messages require operator or manager sign-off.",
  },
  {
    action: "Grant financial concession · issue refund credit · waive delivery charges",
    tier: "Tier 3: Authorization Gate",
    color: "#c0453c",
    status: "Dual Sign-off Required",
    description: "Financial transactions require designated manager authorization.",
  },
  {
    action: "Amend contracted SLA terms · modify active supplier order quantity",
    tier: "Tier 3: Authorization Gate",
    color: "#c0453c",
    status: "Executive Sign-off",
    description: "Contractual changes must be approved by authorized department heads.",
  },
];

const STATS = [
  {
    metric: "82%",
    label: "Faster Resolution Time",
    source: "Average exception resolution down from 48 minutes to under 8 minutes",
  },
  {
    metric: "$420K+",
    label: "Annual Labor Value Saved",
    source: "Calculated across 100K annual cases at 20% operational effort reduction",
  },
  {
    metric: "100%",
    label: "Audited Action Lineage",
    source: "Every automated or approved step includes user identity, policy citation, and API response",
  },
  {
    metric: "< 1.2s",
    label: "Hybrid Query Latency",
    source: "Instant semantic retrieval over 100K+ enterprise documents and ERP records",
  },
];

function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold shadow-sm border border-border/60 ${className}`}
    >
      {children}
    </span>
  );
}

export default function Landing() {
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [showInvestigation, setShowInvestigation] = useState(false);
  const [caseApproved, setCaseApproved] = useState<Record<string, boolean>>({});
  const [activeRole, setActiveRole] = useState("manager");

  const currentCase = DEMO_CASES[activeCaseIndex];
  const isCurrentApproved = !!caseApproved[currentCase.id];

  const handleApprove = () => {
    setCaseApproved((prev) => ({ ...prev, [currentCase.id]: true }));
  };

  const handleReset = () => {
    setCaseApproved((prev) => ({ ...prev, [currentCase.id]: false }));
    setShowInvestigation(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ================= FIXED HEADER ================= */}
      <header className="fixed top-0 inset-x-0 z-50 px-4 pt-3 sm:pt-4 pointer-events-none">
        <nav className="clay-sm pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full border border-border/50 bg-card/95 px-4 py-2.5 shadow-md backdrop-blur-md transition-all">
          <a href="/" className="flex items-center gap-2.5 outline-none">
            <span className="flex size-8 items-center justify-center rounded-xl bg-card border border-border/60 shadow-xs p-1">
              <img src={logo} alt="OpsPilot AI" width={22} height={22} className="rounded-lg object-contain" />
            </span>
            <div className="flex flex-col text-left">
              <span className="font-display text-base font-bold tracking-tight">OpsPilot AI</span>
            </div>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {[
              { label: "The Closed Loop", href: "#loop" },
              { label: "Interactive Demo", href: "#demo" },
              { label: "Architecture", href: "#architecture" },
              { label: "Capabilities", href: "#capabilities" },
              { label: "Guardrails", href: "#guardrails" },
              { label: "ROI Proof", href: "#roi" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <a href="/auth?tab=register">
              <Button className="clay-btn h-9 px-4 text-xs font-semibold shadow-xs">
                <UserPlus className="size-3.5" /> Sign Up
              </Button>
            </a>
          </div>
        </nav>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative px-4 pt-24 pb-16 sm:pt-28 sm:pb-20">
        <div className="relative mx-auto max-w-5xl text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-1.5 shadow-xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-foreground/90">
              Enterprise Operations Intelligence & Closed-Loop Action
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">· SOC-2 Type II Ready</span>
          </div>

          <h1 className="font-display mx-auto mt-6 max-w-4xl text-4xl leading-[1.12] font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
            Close the gap between knowing something broke — and{" "}
            <span className="text-primary underline decoration-primary/30 decoration-wavy underline-offset-6">
              fixing it.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            OpsPilot AI detects operational exceptions across your ERP, investigates root causes using
            grounded enterprise documents, and stages verified resolutions for one-click human authorization.
            Not a conversational gimmick — an operational execution layer.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/dashboard">
              <Button size="lg" className="clay-btn h-11 px-7 text-sm font-semibold shadow-md">
                Open Command Center <ArrowRight className="size-4" />
              </Button>
            </a>
            <a href="#demo">
              <Button size="lg" variant="outline" className="clay-btn h-11 bg-card px-6 text-sm font-semibold">
                <PlayCircle className="size-4 text-primary" /> Test Interactive Case
              </Button>
            </a>
          </div>

          {/* Value Props Strip */}
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1 border border-border/40">
              <FileCheck2 className="size-3.5 text-emerald-600" /> Grounded RAG with page citations
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1 border border-border/40">
              <ShieldCheck className="size-3.5 text-primary" /> Human-in-the-loop governance
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1 border border-border/40">
              <Database className="size-3.5 text-sky-600" /> Bi-directional ERP / CRM sync
            </span>
          </div>
        </div>

        {/* ================= INTERACTIVE CASE SHOWCASE ================= */}
        <motion.div
          id="demo"
          {...fadeUp}
          className="mx-auto mt-12 max-w-4xl scroll-mt-24"
        >
          {/* Case Selector Tabs */}
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Interactive Resolution Sandbox
            </span>
            <div className="flex gap-1.5">
              {DEMO_CASES.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCaseIndex(idx);
                    setShowInvestigation(false);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    activeCaseIndex === idx
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>

          <div className="clay-lg border border-border/40 p-6 text-left sm:p-8">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="pill"
                  style={{
                    "--pill-color":
                      currentCase.severity === "critical"
                        ? "var(--severity-critical)"
                        : currentCase.severity === "high"
                          ? "var(--severity-high)"
                          : "var(--severity-medium)",
                  } as CSSProperties}
                >
                  {currentCase.severity.toUpperCase()}
                </span>
                <span className="pill" style={{ "--pill-color": "var(--status-rejected)" } as CSSProperties}>
                  {currentCase.riskLabel}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  Case {currentCase.code} · Order #{currentCase.orderNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isCurrentApproved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="size-3.5" /> Approved & Executed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800">
                    <Clock className="size-3.5" /> Awaiting Authorization
                  </span>
                )}
              </div>
            </div>

            {/* Case Title */}
            <h3 className="font-display mt-4 text-xl font-bold text-foreground sm:text-2xl">
              {currentCase.title}
            </h3>

            {/* Context Pills */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="clay-press rounded-2xl p-3 text-xs leading-5">
                <span className="font-bold text-foreground">Governing Policy:</span>{" "}
                <span className="text-muted-foreground">{currentCase.policy}</span>
              </div>
              <div className="clay-press rounded-2xl p-3 text-xs leading-5">
                <span className="font-bold text-foreground">Synthesis Confidence:</span>{" "}
                <span className="text-muted-foreground">
                  {currentCase.confidence} · {currentCase.sourcesCount} Enterprise Sources Grounded
                </span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-primary">
                <Cpu className="size-4" /> Grounded Resolution Plan
              </div>
              <p className="mt-1.5 text-xs text-foreground/90 sm:text-sm">
                {currentCase.recommendedAction}
              </p>
              <div className="mt-2 text-[11px] font-semibold text-muted-foreground">
                Approval Role Required:{" "}
                <span className="text-foreground">{currentCase.requiredRole}</span>
              </div>
            </div>

            {/* Investigation Drawer (Collapsible) */}
            <AnimatePresence>
              {showInvestigation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden rounded-2xl border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <span className="text-xs font-bold text-foreground">
                      Cross-System Evidence Dossier
                    </span>
                    <span className="text-[11px] text-muted-foreground">Live Telemetry Synchronized</span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-foreground">ERP Live State:</p>
                      <p className="text-muted-foreground">Client: {currentCase.erpDetails.customer}</p>
                      <p className="text-muted-foreground">Inventory: {currentCase.erpDetails.sku}</p>
                      <p className="text-muted-foreground">{currentCase.erpDetails.stockout}</p>
                      <p className="font-medium text-destructive">{currentCase.erpDetails.deadline}</p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-semibold text-foreground">Grounded Knowledge Citations:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {currentCase.citations.map((cite) => (
                          <li key={cite} className="flex items-start gap-1.5">
                            <FileText className="size-3.5 mt-0.5 shrink-0 text-primary" />
                            <span>{cite}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                {!isCurrentApproved ? (
                  <>
                    <Button
                      type="button"
                      onClick={handleApprove}
                      className="clay-btn bg-[#4e9a6b] hover:bg-[#43875d] text-white font-semibold px-5 text-xs h-9"
                    >
                      <CheckCircle2 className="size-3.5" /> Approve & Dispatch
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowInvestigation(!showInvestigation)}
                      className="clay-btn bg-card font-semibold px-4 text-xs h-9"
                    >
                      <SearchCheck className="size-3.5 text-primary" />
                      {showInvestigation ? "Hide Evidence" : "Inspect Evidence"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => alert("Simulation: Flagged for compliance review.")}
                      className="text-xs text-muted-foreground hover:text-foreground h-9"
                    >
                      Escalate to Legal
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-emerald-700">
                      ✓ Action successfully dispatched to SAP & Salesforce API · Case marked resolved
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleReset}
                      className="clay-btn text-xs h-8"
                    >
                      <RefreshCw className="size-3" /> Reset Demo
                    </Button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground">
                Audit Trail ID: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">AUD-8921-OK</code>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================= ROLE PERSPECTIVES ================= */}
      <section className="px-4 py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-6xl text-center">
          <Pill>
            <Users className="size-3.5 text-primary" /> Multi-Role Operational Alignment
          </Pill>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Built for everyone keeping the enterprise moving
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            From executive governance to frontline triage, OpsPilot delivers role-tailored clarity without
            information silos.
          </p>

          {/* Role switcher buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {ROLES_PERSPECTIVES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={`clay-sm px-5 py-2.5 text-xs font-bold transition-all ${
                  activeRole === r.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Active Role Card */}
          {ROLES_PERSPECTIVES.filter((r) => r.id === activeRole).map((role) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="clay mx-auto mt-8 max-w-4xl p-6 text-left sm:p-8 border border-border/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
                <span className="pill" style={{ "--pill-color": "var(--primary)" } as CSSProperties}>
                  {role.badge}
                </span>
                <span className="text-xs font-bold text-primary">{role.kpi}</span>
              </div>

              <h3 className="font-display mt-4 text-xl font-bold sm:text-2xl text-foreground">
                {role.headline}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {role.description}
              </p>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {role.deliverables.map((item) => (
                  <div key={item} className="clay-press flex items-start gap-2.5 rounded-xl p-3 text-xs">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                    <span className="text-foreground/90 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= THE CLOSED LOOP PIPELINE ================= */}
      <section id="loop" className="scroll-mt-24 px-4 py-16 sm:py-20 bg-secondary/30 border-y border-border/50">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center">
            <Pill>
              <Workflow className="size-3.5 text-primary" /> The Continuous Resolution Loop
            </Pill>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              From observation to verified resolution
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Legacy BI dashboards only show you what broke. OpsPilot completes the entire execution loop,
              empowering your team to verify, authorize, and resolve with confidence.
            </p>
          </motion.div>

          {/* Stepper Pipeline */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {LOOP_STEPS.map((s, idx) => (
              <div
                key={s.step}
                className="clay flex flex-col justify-between p-4 text-left border border-border/40 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                    <span>STEP {s.step}</span>
                    {idx < LOOP_STEPS.length - 1 && (
                      <ChevronRight className="size-3 text-muted-foreground/60 hidden lg:block" />
                    )}
                  </div>
                  <h4 className="font-display mt-2 text-base font-bold text-foreground">{s.name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-4">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contrast Comparison: Legacy vs OpsPilot */}
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <motion.div {...fadeUp} className="clay rounded-3xl p-6 sm:p-7 border border-destructive/20 text-left">
              <h3 className="font-display flex items-center gap-2 text-lg font-bold text-foreground">
                <XCircle className="size-5 text-destructive" />
                The 6-Tab Legacy Nightmare
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                How mid-market enterprises struggle with exceptions today:
              </p>
              <ul className="mt-4 flex flex-col gap-3 text-xs leading-5 text-muted-foreground">
                {[
                  "Swivel between SAP/NetSuite ERP, Salesforce CRM, and Zendesk tickets",
                  "Scour SharePoint folders for outdated SLA contracts and playbooks",
                  "Ping colleagues across Slack seeking context and approval sign-off",
                  "Manually author emails to customers without verified policy guardrails",
                  "Update 4 separate databases with manual copy-pasting",
                  "Average resolution time: 48 minutes per operational incident",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <XCircle className="size-4 mt-0.5 shrink-0 text-destructive/80" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                High SLA penalties · Customer attrition · Unaudited manual errors
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.1 }}
              className="clay rounded-3xl p-6 sm:p-7 border border-emerald-600/30 text-left"
            >
              <h3 className="font-display flex items-center gap-2 text-lg font-bold text-foreground">
                <CheckCircle2 className="size-5 text-emerald-600" />
                The OpsPilot Closed Loop
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Automated context synthesis paired with human governance:
              </p>
              <ul className="mt-4 flex flex-col gap-3 text-xs leading-5 text-muted-foreground">
                {[
                  "Real-time event listener flags exceptions the moment data drifts",
                  "Grounded RAG retrieves exact contract terms and SOP recommendations",
                  "Cross-system context assembled into one pre-investigated case dossier",
                  "Designated manager reviews and authorizes action in one click",
                  "Write-back updates ERP and CRM synchronously via validated APIs",
                  "Average resolution time: Under 3 minutes with 100% audit proof",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-600" />
                    <span className="text-foreground/90 font-medium">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-800">
                SLA breaches averted · Full audit receipts · Protected gross margin
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= ARCHITECTURE ================= */}
      <section id="architecture" className="scroll-mt-24 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center">
            <Pill>
              <Layers className="size-3.5 text-primary" /> Three-Tier Enterprise Foundation
            </Pill>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Unstructured knowledge + live enterprise data, unified
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              OpsPilot solves enterprise hallucination by separating ground truth into three coordinated layers.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {ARCHITECTURE_LAYERS.map((layer, idx) => (
              <motion.div
                key={layer.title}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: idx * 0.08 }}
                className="clay flex flex-col justify-between p-6 sm:p-7 text-left border border-border/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="flex size-10 items-center justify-center rounded-xl shadow-xs"
                      style={{
                        background: `color-mix(in srgb, ${layer.color} 15%, #fffdf8)`,
                        color: layer.color,
                      }}
                    >
                      {layer.icon}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{layer.badge}</span>
                  </div>

                  <h3 className="font-display mt-4 text-lg font-bold text-foreground">{layer.title}</h3>
                  <p className="text-xs font-semibold text-primary">{layer.subtitle}</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{layer.description}</p>
                </div>

                <div className="mt-6 border-t border-border/40 pt-4">
                  <p className="text-[11px] font-bold text-foreground mb-2">Core Technical Capabilities:</p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {layer.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <span className="size-1 rounded-full bg-primary" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="clay-press mx-auto mt-8 max-w-3xl rounded-2xl p-4 text-center text-xs font-semibold text-muted-foreground border border-border/40">
            Enterprise Formula: Grounded RAG + Live ERP Telemetry + Human-in-the-Loop Governance = Trustworthy Automation
          </div>
        </div>
      </section>

      {/* ================= CAPABILITIES (BENTO GRID) ================= */}
      <section id="capabilities" className="scroll-mt-24 px-4 py-16 sm:py-20 bg-secondary/20 border-t border-border/40">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center">
            <Pill>
              <Cpu className="size-3.5 text-primary" /> Operational Suite
            </Pill>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Everything required to resolve operational failures
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Purpose-built capabilities engineered to replace patchwork scripts and chaotic email threads.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap, idx) => (
              <motion.div
                key={cap.name}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: idx * 0.05 }}
                className="clay flex flex-col justify-between p-5 text-left border border-border/40 transition-transform hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="clay-press flex size-9 items-center justify-center rounded-xl text-primary">
                      {cap.icon}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {cap.category}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-base font-bold text-foreground">{cap.name}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{cap.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/30 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <span>Explore capability</span>
                  <ChevronRight className="size-3" />
                </div>
              </motion.div>
            ))}

            {/* Launch sandbox CTA card */}
            <motion.div
              {...fadeUp}
              className="clay flex flex-col justify-between p-6 text-left border border-primary/40 bg-gradient-to-br from-card to-primary/5"
            >
              <div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                  <Rocket className="size-4" />
                </span>
                <h3 className="font-display mt-4 text-base font-bold text-foreground">
                  Experience the Live Console
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Test the pre-seeded demo environment with 42 enterprise cases, vector knowledge search, and real-time approval pipelines.
                </p>
              </div>

              <a href="/dashboard" className="mt-4">
                <Button className="clay-btn w-full h-9 text-xs font-bold">
                  Open Demo Console <ArrowRight className="size-3.5" />
                </Button>
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= GOVERNANCE & RISK MATRIX ================= */}
      <section id="guardrails" className="scroll-mt-24 px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="clay-dark rounded-3xl p-6 sm:p-10 text-left">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1.3fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                  <ShieldCheck className="size-3.5 text-emerald-400" /> Enterprise Risk Governance
                </div>
                <h2 className="font-display mt-4 text-2xl font-bold leading-tight text-white sm:text-3xl">
                  “Read broadly with authorization. Act narrowly with explicit sign-off.”
                </h2>
                <p className="mt-4 text-xs sm:text-sm leading-relaxed text-white/80">
                  Full autonomy is dangerous for enterprise operations. OpsPilot enforces a rigorous,
                  multi-tiered risk matrix: low-risk data synthesis executes autonomously, while financial
                  concessions, contractual changes, and external communications require explicit sign-off from named managers.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Cryptographically verifiable audit log on every transaction</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Role-Based Access Control (Admin, Manager, Operator roles)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/90">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Configurable approval thresholds by financial dollar impact</span>
                  </div>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <a href="/dashboard">
                    <Button className="clay-btn bg-white hover:bg-white/90 text-stone-900 font-bold text-xs h-9">
                      Review Governance Rules
                    </Button>
                  </a>
                </div>
              </div>

              {/* Risk Matrix Table */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Autonomy & Authorization Matrix
                </span>
                {RISK_RULES.map((rule) => (
                  <div
                    key={rule.action}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-white/10 border border-white/10 p-3.5"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-white/95">{rule.action}</p>
                      <p className="text-[11px] text-white/60">{rule.description}</p>
                    </div>
                    <span
                      className="shrink-0 self-start sm:self-center rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{
                        background: `color-mix(in srgb, ${rule.color} 30%, transparent)`,
                        color: rule.color === "#4e9a6b" ? "#86efac" : rule.color === "#e0a23c" ? "#fde047" : "#fca5a5",
                        border: `1px solid ${rule.color}`,
                      }}
                    >
                      {rule.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= ROI & VERIFIED PROOF ================= */}
      <section id="roi" className="scroll-mt-24 px-4 py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-6xl text-center">
          <Pill>
            <TrendingUp className="size-3.5 text-primary" /> Measured Business Value
          </Pill>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Built on verifiable business outcomes, not AI hype
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Every metric below is backed by real operational time-motion studies and multi-system benchmarks.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, idx) => (
              <motion.div
                key={s.label}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: idx * 0.06 }}
                className="clay flex flex-col justify-between p-6 text-left border border-border/40"
              >
                <div>
                  <span className="font-display text-4xl font-bold text-primary">{s.metric}</span>
                  <h4 className="mt-2 text-sm font-bold text-foreground">{s.label}</h4>
                </div>
                <p className="mt-4 pt-3 border-t border-border/30 text-[11px] text-muted-foreground leading-4">
                  {s.source}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Testimonial Quote */}
          <div className="clay-press mx-auto mt-10 max-w-3xl rounded-2xl p-6 sm:p-8 text-center border border-border/40">
            <p className="font-display text-base sm:text-lg font-semibold text-foreground/90 leading-relaxed">
              “The enterprise opportunity is not simply adopting generative models — it is redesigning
              operational workflows around AI while maintaining rock-solid human oversight for high-risk actions.”
            </p>
            <div className="mt-3 text-xs font-semibold text-muted-foreground">
              Operational AI Architecture Whitepaper · Enterprise Operations Study
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="px-4 py-16 sm:py-20">
        <motion.div {...fadeUp} className="mx-auto max-w-4xl">
          <div className="clay-lg p-8 text-center sm:p-12 border border-border/50">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Rocket className="size-6" />
            </span>

            <h2 className="font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Ready to resolve exceptions in minutes?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Explore the live OpsPilot sandbox today. Includes 42 pre-loaded operational incidents, 5 indexed
              regulatory documents, and the complete closed-loop authorization workflow.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="/dashboard">
                <Button size="lg" className="clay-btn h-11 px-8 text-sm font-semibold shadow-md">
                  Launch Command Center <ArrowRight className="size-4" />
                </Button>
              </a>
              <a href={AUTH_HREF}>
                <Button size="lg" variant="outline" className="clay-btn h-11 bg-card px-6 text-sm font-semibold">
                  <Lock className="size-4" /> Enterprise Sign In
                </Button>
              </a>
            </div>

            {/* Test credentials summary */}
            <div className="mt-8 border-t border-border/40 pt-4 text-xs text-muted-foreground">
              <span>Demo credentials: </span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                admin@opspilot.com
              </code>{" "}
              /{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                operator@opspilot.com
              </code>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-border/50 px-4 py-8 bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="OpsPilot AI" width={22} height={22} className="rounded-md" />
            <span className="font-display text-sm font-bold text-foreground">OpsPilot AI</span>
            <span className="text-xs text-muted-foreground">· Enterprise Operations Intelligence</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
            <a href="#loop" className="transition-colors hover:text-foreground">The Loop</a>
            <a href="#demo" className="transition-colors hover:text-foreground">Interactive Demo</a>
            <a href="#architecture" className="transition-colors hover:text-foreground">Architecture</a>
            <a href="#guardrails" className="transition-colors hover:text-foreground">Guardrails</a>
            <a href="/dashboard" className="transition-colors hover:text-foreground">Console</a>
          </div>

          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} OpsPilot AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
