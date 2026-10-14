import type { CSSProperties } from "react";
import {
  CONFIDENCE_VAR,
  INTENT_META,
  ROLE_LABEL,
  ROLE_VAR,
  SEVERITY_LABEL,
  SEVERITY_VAR,
  STATUS_LABEL,
  STATUS_VAR,
  type ChatIntent,
  type Confidence,
  type ExceptionStatus,
  type OpsRole,
  type Severity,
} from "@/lib/opspilot/format";

/** Pastel clay pill tinted by a semantic CSS variable. */
function Pill({
  color,
  children,
  className = "",
  title,
}: {
  color: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`pill ${className}`}
      style={{ "--pill-color": color } as CSSProperties}
    >
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Pill color={SEVERITY_VAR[severity]}>{SEVERITY_LABEL[severity]}</Pill>;
}

export function StatusBadge({ status }: { status: ExceptionStatus }) {
  return <Pill color={STATUS_VAR[status]}>{STATUS_LABEL[status]}</Pill>;
}

export function TierBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  const normalized = tier.toLowerCase();
  const color =
    normalized === "enterprise"
      ? "var(--status-recommendation)"
      : normalized === "premium"
        ? "var(--severity-high)"
        : "var(--status-resolved)";

  return (
    <Pill color={color} className="capitalize text-[10px] font-medium tracking-wide">
      {normalized}
    </Pill>
  );
}

export function IntentBadge({ intent }: { intent: ChatIntent }) {
  const meta = INTENT_META[intent];
  return (
    <Pill color={meta.color} title={meta.hint}>
      {meta.label}
    </Pill>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Pill color={CONFIDENCE_VAR[confidence]} title="Model confidence">
      {confidence} confidence
    </Pill>
  );
}

export function RoleBadge({ role }: { role: OpsRole }) {
  return (
    <Pill color={ROLE_VAR[role]} title={`Role: ${ROLE_LABEL[role]}`}>
      {ROLE_LABEL[role]}
    </Pill>
  );
}

export function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  return (
    <Pill
      color={
        risk === "high"
          ? "var(--severity-critical)"
          : risk === "medium"
            ? "var(--severity-medium)"
            : "var(--success)"
      }
    >
      {risk} risk
    </Pill>
  );
}
