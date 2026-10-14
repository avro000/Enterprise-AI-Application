import {
  ConfidenceBadge,
  RiskBadge,
  SeverityBadge,
  StatusBadge,
  TierBadge,
} from "@/components/opspilot/badges";
import {
  AuditTimeline,
  EmptyState,
  LoadingSpinner,
  ProgressBar,
  RejectReasonModal,
  SourceList,
} from "@/components/opspilot/common";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import {
  absoluteTime,
  confidenceFromScore,
  effectiveRole,
  humanizeType,
  relativeTime,
  type ExceptionStatus,
} from "@/lib/opspilot/format";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  FileSearch,
  Lightbulb,
  Loader2,
  Radar,
  ShieldAlert,
  Sparkles,
  Target,
  ThumbsDown,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

const INVESTIGATION_STEPS = [
  "Retrieved ERP order + line items",
  "Retrieved customer contract & tier",
  "Checked inventory & supplier state",
  "Matched policy & escalation SOP",
  "Calculated business impact",
];

function SectionCard({
  icon,
  title,
  tint,
  children,
}: {
  icon: ReactNode;
  title: string;
  tint: string;
  children: ReactNode;
}) {
  return (
    <div className="clay-sm p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <span
          className="flex size-8 items-center justify-center rounded-xl"
          style={{
            background: `color-mix(in srgb, ${tint} 15%, #fffdf8)`,
            color: tint,
          }}
        >
          {icon}
        </span>
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
      </div>
      {typeof children === "string" ? (
        <div className="text-sm leading-6 text-foreground/90">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-6">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-6">{children}</li>,
            }}
          >
            {children}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="text-sm leading-6">{children}</div>
      )}
    </div>
  );
}

export default function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const detail = useQuery(api.opspilot.getException, id ? { id } : "skip");
  const investigate = useMutation(api.opspilot.investigate);
  const approveAction = useMutation(api.opspilot.approveAction);
  const rejectAction = useMutation(api.opspilot.rejectAction);
  const resolveException = useMutation(api.opspilot.resolveException);

  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [step, setStep] = useState(0);

  const canAct = effectiveRole(user?.role) !== "operator";

  const status = detail?.status as ExceptionStatus | undefined;
  useEffect(() => {
    if (status !== "investigating") return;
    const timer = window.setInterval(
      () => setStep((s) => Math.min(INVESTIGATION_STEPS.length, s + 1)),
      620,
    );
    return () => window.clearInterval(timer);
  }, [status]);

  if (detail === undefined) {
    return <LoadingSpinner label="Loading case file..." />;
  }

  if (detail === null) {
    return (
      <EmptyState
        icon={<FileSearch className="size-6" />}
        title="Resource not found"
        message="This exception case does not exist, or it has been removed from the workspace."
        action={
          <Button className="clay-btn mt-2" onClick={() => navigate("/exceptions")}>
            <ArrowLeft className="size-4" /> Back to exceptions
          </Button>
        }
      />
    );
  }

  const showToast = (error: unknown, fallback: string) => {
    console.error(error);
    toast.error(error instanceof Error ? error.message : fallback);
  };

  const handleInvestigate = async () => {
    setInvestigating(true);
    try {
      await investigate({ id: detail._id });
      toast.success("Investigation started — gathering context across systems.");
    } catch (error) {
      showToast(error, "Could not start the investigation.");
    } finally {
      setInvestigating(false);
    }
  };

  const handleApprove = async (actionId: string) => {
    setBusyActionId(actionId);
    try {
      await approveAction({
        exceptionId: detail._id,
        actionId: actionId as Id<"exceptionActions">,
      });
      toast.success("Action approved — logged with your name in the audit trail.");
    } catch (error) {
      showToast(error, "Could not approve this action.");
    } finally {
      setBusyActionId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    setBusyActionId(rejectTarget);
    try {
      await rejectAction({
        exceptionId: detail._id,
        actionId: rejectTarget as Id<"exceptionActions">,
        reason,
      });
      toast.success("Action rejected — reason recorded in the audit trail.");
      setRejectTarget(null);
    } catch (error) {
      showToast(error, "Could not reject this action.");
    } finally {
      setBusyActionId(null);
    }
  };

  const handleResolve = async () => {
    setResolving(true);
    try {
      await resolveException({ id: detail._id });
      toast.success("Exception resolved and verified in source systems.");
    } catch (error) {
      showToast(error, "Could not resolve this exception.");
    } finally {
      setResolving(false);
    }
  };

  const investigated = detail.status !== "detected" && detail.status !== "investigating";
  const confidence = confidenceFromScore(detail.confidenceScore);
  const actions = detail.actions || [];
  const audit = detail.audit || [];
  const pendingActions = actions.filter((a) => a.status === "pending");

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate("/exceptions")}
        className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Exceptions
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------------- Left: header + investigation ---------------- */}
        <div className="flex flex-col gap-4">
          <div className="clay p-5">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={detail.severity} />
              <StatusBadge status={detail.status} />
              <TierBadge tier={detail.customerTier} />
              {detail.orderId && (
                <span
                  className="pill"
                  style={{ "--pill-color": "var(--info)" } as CSSProperties}
                >
                  {detail.orderId}
                </span>
              )}
            </div>
            <h2 className="font-display mt-3 text-2xl leading-tight font-bold">
              {detail.caseNumber} · {humanizeType(detail.exceptionType)}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <UserRound className="size-3.5" /> {detail.customer}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> Detected {relativeTime(detail.detectedAt)} ·{" "}
                {absoluteTime(detail.detectedAt)}
              </span>
              {detail.assignedTo && (
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5" /> Owner: {detail.assignedTo}
                </span>
              )}
            </div>
          </div>

          {/* Investigation progress (Module D) */}
          {detail.status === "investigating" && (
            <div className="clay flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2.5">
                <Loader2 className="size-4 animate-spin text-primary" />
                <h3 className="font-display text-lg font-semibold">
                  AI investigation in progress
                </h3>
              </div>
              <ul className="flex flex-col gap-2.5">
                {INVESTIGATION_STEPS.map((label, i) => {
                  const done = i < step;
                  const active = i === step;
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-3 text-sm transition-opacity ${
                        done ? "opacity-100" : active ? "opacity-90" : "opacity-40"
                      }`}
                    >
                      <span
                        className="flex size-6 items-center justify-center rounded-full border"
                        style={{
                          borderColor: done
                            ? "var(--success)"
                            : "color-mix(in srgb, var(--muted-foreground) 40%, transparent)",
                          color: done ? "var(--success)" : "var(--muted-foreground)",
                          background: done
                            ? "color-mix(in srgb, var(--success) 14%, #fffdf8)"
                            : "transparent",
                        }}
                      >
                        {done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : active ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <span className="text-[10px]">{i + 1}</span>
                        )}
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Pulling live records from ERP, CRM and inventory while retrieving
                the applicable policy documents…
              </p>
            </div>
          )}

          {/* Pre-investigation prompt */}
          {detail.status === "detected" && (
            <div className="clay flex items-start gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary clay-press">
                <Bot className="size-5" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">
                  Not yet investigated
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  OpsPilot has detected the exception but has not yet gathered
                  context. Run the investigation to fetch order, customer,
                  inventory and contract data, identify the root cause, calculate
                  business impact, and stage a recommended action for approval.
                </p>
              </div>
            </div>
          )}

          {/* Investigation results */}
          {investigated && (
            <div className="flex flex-col gap-3">
              <SectionCard
                icon={<FileSearch className="size-4" />}
                title="Root cause"
                tint="var(--status-investigating)"
              >
                {detail.rootCause ?? "—"}
              </SectionCard>
              <SectionCard
                icon={<Activity className="size-4" />}
                title="Business impact"
                tint="var(--severity-high)"
              >
                {detail.businessImpact ?? "—"}
              </SectionCard>
              <SectionCard
                icon={<Lightbulb className="size-4" />}
                title="Recommended action"
                tint="var(--status-recommendation)"
              >
                {detail.recommendedAction ?? "—"}
              </SectionCard>

              <div className="clay-sm p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex size-8 items-center justify-center rounded-xl"
                      style={{
                        background: "color-mix(in srgb, var(--success) 15%, #fffdf8)",
                        color: "var(--success)",
                      }}
                    >
                      <Target className="size-4" />
                    </span>
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Confidence
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold">
                      {Math.round((detail.confidenceScore ?? 0) * 100)}%
                    </span>
                    <ConfidenceBadge confidence={confidence} />
                  </div>
                </div>
                <ProgressBar
                  value={(detail.confidenceScore ?? 0) * 100}
                  color={
                    confidence === "high"
                      ? "var(--success)"
                      : confidence === "medium"
                        ? "var(--warning)"
                        : "var(--danger)"
                  }
                />
              </div>

              {detail.sourcesUsed && detail.sourcesUsed.length > 0 && (
                <div className="clay-sm p-4">
                  <SourceList sources={detail.sourcesUsed} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------------- Right: status, actions, audit ---------------- */}
        <div className="flex flex-col gap-4">
          {/* Status card */}
          <div className="clay flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Case status</h3>
              <StatusBadge status={detail.status} />
            </div>

            <dl className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <dt>Detected</dt>
                <dd className="font-medium text-foreground">
                  {relativeTime(detail.detectedAt)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Assigned</dt>
                <dd className="font-medium text-foreground">
                  {detail.assignedTo ?? "—"}
                </dd>
              </div>
              {detail.resolvedAt && (
                <div className="flex justify-between">
                  <dt>Resolved in</dt>
                  <dd className="font-medium text-foreground">
                    {detail.resolutionMinutes} min
                  </dd>
                </div>
              )}
            </dl>

            {detail.status === "detected" &&
              (canAct ? (
                <Button
                  className="clay-btn mt-1"
                  disabled={investigating}
                  onClick={() => void handleInvestigate()}
                >
                  {investigating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Investigating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Investigate
                    </>
                  )}
                </Button>
              ) : (
                <p className="rounded-2xl bg-secondary/70 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                  Operators have read-only access — ask a manager or admin to run
                  the investigation.
                </p>
              ))}

            {detail.status === "investigating" && (
              <Button className="clay-btn mt-1" disabled>
                <Loader2 className="size-4 animate-spin" /> Investigating…
              </Button>
            )}

            {detail.status === "recommendation_ready" && pendingActions.length === 0 && (
              <p className="rounded-2xl bg-secondary/70 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                All staged actions have been decided.
              </p>
            )}

            {detail.status === "approved" &&
              (canAct ? (
                <Button
                  className="clay-btn mt-1"
                  style={{ background: "var(--success)", color: "#fff" }}
                  disabled={resolving}
                  onClick={() => void handleResolve()}
                >
                  {resolving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Mark resolved
                    </>
                  )}
                </Button>
              ) : (
                <p className="rounded-2xl bg-secondary/70 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                  Awaiting manager verification.
                </p>
              ))}

            {detail.status === "resolved" && (
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium"
                style={{
                  background: "color-mix(in srgb, var(--success) 14%, #fffdf8)",
                  color: "var(--success)",
                }}
              >
                <CheckCircle2 className="size-4" />
                Resolved &amp; verified in source systems
              </div>
            )}

            {detail.status === "rejected" && (
              <div
                className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium"
                style={{
                  background: "color-mix(in srgb, var(--danger) 12%, #fffdf8)",
                  color: "var(--danger)",
                }}
              >
                <XCircle className="size-4" />
                Recommendation rejected by reviewer
              </div>
            )}
          </div>

          {/* Action Center */}
          <div className="clay flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Action Center</h3>
              <span
                className="pill"
                style={
                  {
                    "--pill-color": pendingActions.length
                      ? "var(--warning)"
                      : "var(--success)",
                  } as CSSProperties
                }
              >
                {pendingActions.length} pending
              </span>
            </div>

            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No actions staged yet. Actions appear here once the AI completes
                its investigation.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {actions.map((action) => (
                  <div
                    key={action._id}
                    className="clay-press flex flex-col gap-2.5 rounded-2xl p-3.5"
                  >
                    <div className="text-xs leading-5 text-foreground/90">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-0 leading-5">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        }}
                      >
                        {action.description}
                      </ReactMarkdown>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RiskBadge risk={action.riskTier} />
                      {action.status === "pending" && (
                        <span
                          className="pill"
                          style={{ "--pill-color": "var(--status-detected)" } as CSSProperties}
                        >
                          awaiting approval
                        </span>
                      )}
                      {action.status === "executed" && (
                        <span
                          className="pill"
                          style={{ "--pill-color": "var(--success)" } as CSSProperties}
                        >
                          <CheckCircle2 className="size-3" /> auto-executed · low risk
                        </span>
                      )}
                      {action.status === "approved" && (
                        <span
                          className="pill"
                          style={{ "--pill-color": "var(--success)" } as CSSProperties}
                        >
                          <CheckCircle2 className="size-3" /> approved
                        </span>
                      )}
                      {action.status === "rejected" && (
                        <span
                          className="pill"
                          style={{ "--pill-color": "var(--danger)" } as CSSProperties}
                        >
                          <XCircle className="size-3" /> rejected
                        </span>
                      )}
                    </div>

                    {action.status === "pending" ? (
                      canAct ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="clay-btn h-8 flex-1 text-xs"
                            style={{ background: "var(--success)", color: "#fff" }}
                            disabled={busyActionId === action._id}
                            onClick={() => void handleApprove(action._id)}
                          >
                            {busyActionId === action._id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-3.5" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="clay-btn h-8 flex-1 text-xs"
                            style={{ background: "var(--danger)", color: "#fff" }}
                            disabled={busyActionId === action._id}
                            onClick={() => setRejectTarget(action._id)}
                          >
                            <ThumbsDown className="size-3.5" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Read-only role — approval is restricted to managers and
                          admins.
                        </p>
                      )
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        {action.status === "rejected" && action.rejectReason
                          ? `“${action.rejectReason}” — `
                          : ""}
                        {action.decidedBy ? `${action.decidedBy} · ` : ""}
                        {action.decidedAt ? relativeTime(action.decidedAt) : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {pendingActions.length > 0 && (
              <p className="flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                High-risk actions (refunds, concessions, contract changes) always
                require explicit human approval before execution.
              </p>
            )}
          </div>

          {/* Audit trail */}
          <div className="clay flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <Radar className="size-4" style={{ color: "var(--status-recommendation)" }} />
              <h3 className="font-display text-base font-semibold">Audit trail</h3>
            </div>
            {audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">No events recorded.</p>
            ) : (
              <AuditTimeline events={audit} />
            )}
            <p className="flex items-start gap-1.5 border-t border-border/60 pt-3 text-[11px] leading-4 text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Every event answers: who initiated, what data was used, which policy
              applied, who approved, and what changed.
            </p>
          </div>
        </div>
      </div>

      <RejectReasonModal
        open={rejectTarget !== null}
        busy={busyActionId === rejectTarget}
        onConfirm={(reason) => void handleReject(reason)}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}
