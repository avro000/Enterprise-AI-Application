/** Shared labels, colors and formatters for the OpsPilot AI frontend. */

export type Severity = "critical" | "high" | "medium" | "low";
export type ExceptionStatus =
  | "detected"
  | "investigating"
  | "recommendation_ready"
  | "approved"
  | "rejected"
  | "resolved";
export type ChatIntent =
  | "knowledge_only"
  | "data_only"
  | "hybrid"
  | "exception_investigation";
export type Confidence = "high" | "medium" | "low";
export type OpsRole = "admin" | "manager" | "operator";

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const SEVERITY_VAR: Record<Severity, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
};

export const STATUS_LABEL: Record<ExceptionStatus, string> = {
  detected: "Detected",
  investigating: "Investigating",
  recommendation_ready: "Recommendation Ready",
  approved: "Approved",
  rejected: "Rejected",
  resolved: "Resolved",
};

export const STATUS_VAR: Record<ExceptionStatus, string> = {
  detected: "var(--status-detected)",
  investigating: "var(--status-investigating)",
  recommendation_ready: "var(--status-recommendation)",
  approved: "var(--status-approved)",
  rejected: "var(--status-rejected)",
  resolved: "var(--status-resolved)",
};

export const INTENT_META: Record<
  ChatIntent,
  { label: string; color: string; hint: string }
> = {
  knowledge_only: {
    label: "Knowledge",
    color: "var(--intent-knowledge)",
    hint: "Answer grounded in company documents",
  },
  data_only: {
    label: "Live data",
    color: "var(--intent-data)",
    hint: "Answer grounded in operational systems",
  },
  hybrid: {
    label: "Hybrid",
    color: "var(--intent-hybrid)",
    hint: "Documents + live data fused",
  },
  exception_investigation: {
    label: "Investigation",
    color: "var(--intent-investigation)",
    hint: "Cross-system exception investigation",
  },
};

export const CONFIDENCE_VAR: Record<Confidence, string> = {
  high: "var(--success)",
  medium: "var(--warning)",
  low: "var(--danger)",
};

const TYPE_LABEL: Record<string, string> = {
  delayed_order: "Delayed Order",
  sla_risk: "SLA Breach Risk",
  billing_dispute: "Billing Dispute",
  overdue_payment: "Overdue Payment",
  supplier_late: "Late Supplier Delivery",
  ticket_aging: "Aging Service Ticket",
  inventory_low: "Inventory Below Threshold",
  contract_violation: "Contract Term Violated",
  complaint_escalated: "Escalated Complaint",
};

/** "delayed_order" → "Delayed Order" */
export function humanizeType(key: string): string {
  if (TYPE_LABEL[key]) return TYPE_LABEL[key];
  return key
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function confidenceFromScore(score: number | undefined): Confidence {
  if (score === undefined) return "medium";
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function absoluteTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Mirrors the Convex-side RBAC rule (FRONTEND_SPEC §4). */
export function effectiveRole(role: string | undefined): OpsRole {
  if (role === "admin") return "admin";
  if (role === "operator") return "operator";
  return "manager";
}

export const ROLE_LABEL: Record<OpsRole, string> = {
  admin: "Admin",
  manager: "Manager",
  operator: "Operator",
};

export const ROLE_VAR: Record<OpsRole, string> = {
  admin: "var(--status-recommendation)",
  manager: "var(--info)",
  operator: "var(--status-resolved)",
};
