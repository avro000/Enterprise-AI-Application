import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Database,
  FileText,
  Loader2,
  Radar,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { stripMarkdownAsterisks } from "@/lib/opspilot/format";
import type { ChatSource } from "@/lib/opspilot/mockAi";

/* ---------------------------------------------------------------- */
/* Loading + empty states                                            */
/* ---------------------------------------------------------------- */

export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="clay flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-3xl bg-secondary text-muted-foreground clay-press">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Dashboard metric card                                             */
/* ---------------------------------------------------------------- */

export function MetricCard({
  title,
  value,
  icon,
  accent,
  hint,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="clay flex flex-col gap-3 p-5">
      <div className="h-1.5 w-12 rounded-full" style={{ background: accent }} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: `color-mix(in srgb, ${accent} 16%, #fffdf8)`,
            color: accent,
          }}
        >
          {icon}
        </span>
      </div>
      <p className="font-display text-3xl font-bold leading-none">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Pagination                                                        */
/* ---------------------------------------------------------------- */

export function Pagination({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  if (total === 0) return null;
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="clay-btn bg-card"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          <ArrowLeft className="size-3.5" /> Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="clay-btn bg-card"
          disabled={to >= total}
          onClick={() => onChange(offset + limit)}
        >
          Next <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Confirmation + rejection modals                                   */
/* ---------------------------------------------------------------- */

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="clay gap-5 rounded-[28px] border-0 p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="outline" className="clay-btn bg-card" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            className={destructive ? "clay-btn bg-destructive text-white hover:bg-destructive/90" : "clay-btn"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectReasonModal({
  open,
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");
  const close = () => {
    setReason("");
    onCancel();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="clay gap-5 rounded-[28px] border-0 p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Reject action</DialogTitle>
          <DialogDescription>
            The reason is recorded in the audit trail so the next reviewer knows
            why the AI recommendation was declined.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Account team already contacted the customer — hold the automated message."
          className="clay-press min-h-24 rounded-2xl border-0 text-sm"
        />
        <DialogFooter className="gap-2 sm:gap-3">
          <Button variant="outline" className="clay-btn bg-card" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="clay-btn"
            disabled={reason.trim().length < 3 || busy}
            onClick={() => onConfirm(reason.trim())}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Reject action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- */
/* Audit trail timeline                                              */
/* ---------------------------------------------------------------- */

const AUDIT_META: Record<string, { icon: ReactNode; color: string }> = {
  detect: { icon: <Radar className="size-3.5" />, color: "var(--status-detected)" },
  investigate: { icon: <SearchCheck className="size-3.5" />, color: "var(--status-investigating)" },
  recommend: { icon: <Sparkles className="size-3.5" />, color: "var(--status-recommendation)" },
  approve: { icon: <ShieldCheck className="size-3.5" />, color: "var(--status-approved)" },
  reject: { icon: <AlertTriangle className="size-3.5" />, color: "var(--status-rejected)" },
  resolve: { icon: <CalendarCheck className="size-3.5" />, color: "var(--status-resolved)" },
};

export function AuditTimeline({
  events,
}: {
  events: Array<{ event: string; actor: string; at: number; kind: string }>;
}) {
  return (
    <ol className="relative flex flex-col gap-4 pl-1">
      {events.map((e, i) => {
        const meta = AUDIT_META[e.kind] ?? AUDIT_META.detect;
        return (
          <li key={`${e.at}-${i}`} className="relative flex gap-3">
            {i < events.length - 1 && (
              <span className="absolute top-7 left-[13px] h-[calc(100%-4px)] w-px bg-border" />
            )}
            <span
              className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card"
              style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 40%, transparent)` }}
            >
              {meta.icon}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs leading-5 text-foreground">{stripMarkdownAsterisks(e.event)}</p>
              <p className="text-[11px] text-muted-foreground">
                {(() => {
                  const match = e.actor?.match(/^(.*?)\s*\((.*?)\)$/);
                  if (match) {
                    return (
                      <>
                        <span className="font-semibold text-foreground/90">{match[1]}</span>
                        <span className="text-muted-foreground/85"> ({match[2]})</span>
                      </>
                    );
                  }
                  return <span>{e.actor}</span>;
                })()} · {new Date(e.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------- */
/* Source citations                                                  */
/* ---------------------------------------------------------------- */

export function SourceList({ sources }: { sources: ChatSource[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="clay-press flex flex-col gap-2 rounded-2xl p-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Sources used
      </p>
      <ul className="flex flex-col gap-1.5">
        {sources.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            {s.type === "document" ? (
              <FileText className="size-3.5 shrink-0 text-primary" />
            ) : (
              <Database className="size-3.5 shrink-0 text-info" />
            )}
            <span className="truncate">
              {s.type === "document"
                ? `${s.name}${s.page ? ` (p.${s.page})` : ""}`
                : `${s.table} — ${s.detail}`}
            </span>
            {s.relevance !== undefined && (
              <span className="ml-auto shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {Math.round(s.relevance * 100)}%
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Progress bar                                                      */
/* ---------------------------------------------------------------- */

export function ProgressBar({
  value,
  color = "var(--primary)",
  className = "",
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`clay-press h-3 w-full overflow-hidden rounded-full ${className}`}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 80%, white), ${color})`,
        }}
      />
    </div>
  );
}
