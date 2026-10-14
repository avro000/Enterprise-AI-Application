import { SeverityBadge, StatusBadge } from "@/components/opspilot/badges";
import {
  EmptyState,
  LoadingSpinner,
  MetricCard,
  ProgressBar,
} from "@/components/opspilot/common";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import {
  humanizeType,
  relativeTime,
  type ExceptionStatus,
  type Severity,
} from "@/lib/opspilot/format";
import { useQuery } from "convex/react";
import type { CSSProperties } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  Radar,
  ThumbsUp,
} from "lucide-react";
import { useNavigate } from "react-router";

const SEVERITY_ROWS: Array<{ key: Severity; label: string; color: string }> = [
  { key: "critical", label: "Critical", color: "var(--severity-critical)" },
  { key: "high", label: "High", color: "var(--severity-high)" },
  { key: "medium", label: "Medium", color: "var(--severity-medium)" },
  { key: "low", label: "Low", color: "var(--severity-low)" },
];

export default function DashboardPage() {
  const metrics = useQuery(api.opspilot.metrics);
  const recent = useQuery(api.opspilot.recentExceptions);
  const navigate = useNavigate();

  if (!metrics || !recent) {
    return <LoadingSpinner label="Loading operations overview..." />;
  }

  const severityTotal = SEVERITY_ROWS.reduce(
    (sum, row) => sum + metrics.exceptions_by_severity[row.key],
    0,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Section 1 — metric cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Exceptions Today"
          value={metrics.exceptions_detected_today}
          icon={<AlertTriangle className="size-5" />}
          accent="var(--warning)"
          hint="Auto-detected since midnight"
        />
        <MetricCard
          title="Open Exceptions"
          value={metrics.exceptions_open}
          icon={<AlertCircle className="size-5" />}
          accent="var(--danger)"
          hint={`${metrics.pending_approvals} awaiting approval`}
        />
        <MetricCard
          title="Resolved Today"
          value={metrics.exceptions_resolved_today}
          icon={<CheckCircle2 className="size-5" />}
          accent="var(--success)"
          hint="Verified in source systems"
        />
        <MetricCard
          title="Avg Resolution Time"
          value={`${metrics.avg_resolution_minutes}m`}
          icon={<Clock className="size-5" />}
          accent="var(--info)"
          hint="Manual baseline: 30+ minutes per case"
        />
      </section>

      {/* Sections 2 + 3 — severity breakdown & quick stats */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="clay flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">
                Severity breakdown
              </h2>
              <p className="text-xs text-muted-foreground">
                Open exceptions by calculated impact
              </p>
            </div>
            <span className="pill" style={{ "--pill-color": "var(--info)" } as CSSProperties}>
              {severityTotal} open
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {SEVERITY_ROWS.map((row) => {
              const count = metrics.exceptions_by_severity[row.key];
              const pct = severityTotal ? (count / severityTotal) * 100 : 0;
              return (
                <div key={row.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: row.color }}
                      />
                      {row.label}
                    </span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="clay-press h-3 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, color-mix(in srgb, ${row.color} 70%, white), ${row.color})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="clay flex flex-col gap-5 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Knowledge & governance</h2>
            <p className="text-xs text-muted-foreground">
              Retrieval corpus and human-in-the-loop health
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="clay-press flex flex-col gap-2 rounded-2xl p-4">
              <FileText className="size-4 text-primary" />
              <p className="font-display text-2xl font-bold">
                {metrics.documents_indexed}
              </p>
              <p className="text-[11px] text-muted-foreground">Documents indexed</p>
            </div>
            <div className="clay-press flex flex-col gap-2 rounded-2xl p-4">
              <Layers className="size-4 text-chart-3" />
              <p className="font-display text-2xl font-bold">{metrics.total_chunks}</p>
              <p className="text-[11px] text-muted-foreground">Knowledge chunks</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium">
                <ThumbsUp className="size-4" style={{ color: "var(--success)" }} />
                Approval rate
              </span>
              <span className="font-semibold">
                {Math.round(metrics.approval_rate * 100)}%
              </span>
            </div>
            <ProgressBar value={metrics.approval_rate * 100} color="var(--success)" />
            <p className="text-[11px] text-muted-foreground">
              Share of staged AI actions approved by a human reviewer
            </p>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
            <span className="flex items-center gap-2 text-xs font-medium">
              <Radar className="size-4" style={{ color: "var(--status-recommendation)" }} />
              {metrics.pending_approvals} action
              {metrics.pending_approvals === 1 ? "" : "s"} staged for approval
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 rounded-full px-2 text-xs"
              onClick={() => navigate("/exceptions?status=recommendation_ready")}
            >
              Review <ArrowRight className="size-3" />
            </Button>
          </div>
        </div>
      </section>

      {/* Section 4 — recent exceptions */}
      <section className="clay overflow-hidden p-2">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div>
            <h2 className="font-display text-lg font-semibold">Recent exceptions</h2>
            <p className="text-xs text-muted-foreground">
              Newest detections first — click a row to investigate
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="clay-btn h-8 bg-card px-3 text-xs"
            onClick={() => navigate("/exceptions")}
          >
            View all <ArrowRight className="size-3" />
          </Button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={<Radar className="size-6" />}
            title="No exceptions detected"
            message="All systems operational. OpsPilot continuously scans orders, tickets, invoices and inventory for anomalies."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="clay-table w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-semibold">Case #</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Severity</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Customer</th>
                  <th className="px-4 py-3 font-semibold">Detected</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/exceptions/${e.id}`)}
                    className="cursor-pointer border-b border-border/50 transition-colors last:border-0"
                    style={
                      e.severity === "critical"
                        ? { borderLeft: "3px solid var(--severity-critical)" }
                        : undefined
                    }
                  >
                    <td className="px-4 py-3 font-semibold text-primary">{e.caseNumber}</td>
                    <td className="px-4 py-3">{humanizeType(e.exceptionType)}</td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={e.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status as ExceptionStatus} />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{e.customer}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {relativeTime(e.detectedAt)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      <ChevronRight className="size-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
