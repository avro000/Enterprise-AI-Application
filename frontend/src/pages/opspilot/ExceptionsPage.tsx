import { SeverityBadge, StatusBadge } from "@/components/opspilot/badges";
import { EmptyState, LoadingSpinner, Pagination } from "@/components/opspilot/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import {
  humanizeType,
  relativeTime,
  absoluteTime,
  STATUS_LABEL,
  type ExceptionStatus,
  type Severity,
} from "@/lib/opspilot/format";
import { useQuery } from "convex/react";
import { ChevronRight, Radar, Search } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<ExceptionStatus | "all"> = [
  "all",
  "detected",
  "investigating",
  "recommendation_ready",
  "approved",
  "rejected",
  "resolved",
];

const SEVERITY_OPTIONS: Array<Severity | "all"> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
];

export default function ExceptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedStatus = searchParams.get("status");
  const [status, setStatus] = useState(
    requestedStatus && STATUS_OPTIONS.includes(requestedStatus as ExceptionStatus | "all")
      ? requestedStatus
      : "all",
  );
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  const result = useQuery(api.opspilot.listExceptions, {
    status,
    severity,
    search,
    limit: PAGE_SIZE,
    offset,
  });

  const updateStatus = (value: string) => {
    setStatus(value);
    setOffset(0);
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("status");
    else next.set("status", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="clay flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold">Exceptions</h2>
          {result && (
            <span
              className="pill"
              style={{ "--pill-color": "var(--info)" } as CSSProperties}
            >
              {result.total} total
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <Select value={status} onValueChange={updateStatus}>
            <SelectTrigger size="sm" className="clay-sm h-9 rounded-full bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="clay-sm rounded-2xl border-0 bg-card">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="rounded-lg">
                  {s === "all" ? "All statuses" : STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={severity}
            onValueChange={(v) => {
              setSeverity(v);
              setOffset(0);
            }}
          >
            <SelectTrigger size="sm" className="clay-sm h-9 rounded-full bg-card">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="clay-sm rounded-2xl border-0 bg-card">
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="rounded-lg">
                  {s === "all"
                    ? "All severities"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="clay-press flex h-9 min-w-52 flex-1 items-center gap-2 rounded-full px-3 sm:flex-none">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              placeholder="Search case #, customer, order…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search exceptions"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {!result ? (
        <LoadingSpinner label="Loading exceptions..." />
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={<Radar className="size-6" />}
          title="No exceptions match your filters"
          message="Try clearing the status or severity filters — or celebrate: no operational exceptions need attention right now."
          action={
            <button
              type="button"
              className="clay-btn mt-2 bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              onClick={() => {
                setStatus("all");
                setSeverity("all");
                setSearch("");
                setOffset(0);
                setSearchParams(new URLSearchParams(), { replace: true });
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="clay overflow-hidden p-2">
          <div className="overflow-x-auto">
            <table className="clay-table w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="w-32 px-4 py-3 font-semibold">Case #</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="w-28 px-4 py-3 font-semibold">Severity</th>
                  <th className="w-40 px-4 py-3 font-semibold">Status</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Customer</th>
                  <th className="w-32 px-4 py-3 font-semibold">Detected</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {result.items.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/exceptions/${e.id}`)}
                    title={absoluteTime(e.detectedAt)}
                    className="cursor-pointer border-b border-border/50 transition-colors last:border-0"
                    style={
                      e.severity === "critical"
                        ? { borderLeft: "3px solid var(--severity-critical)" }
                        : undefined
                    }
                  >
                    <td className="px-4 py-3 font-semibold text-primary">{e.caseNumber}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{humanizeType(e.exceptionType)}</span>
                      {e.orderId && (
                        <span className="text-[11px] text-muted-foreground">{e.orderId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={e.severity} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {e.customer}
                      <span className="ml-2 text-[10px] text-muted-foreground capitalize">
                        {e.customerTier}
                      </span>
                    </td>
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

          <div className="px-4">
            <Pagination
              total={result.total}
              limit={PAGE_SIZE}
              offset={offset}
              onChange={setOffset}
            />
          </div>
        </div>
      )}
    </div>
  );
}
