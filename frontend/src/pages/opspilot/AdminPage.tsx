import { EmptyState, LoadingSpinner } from "@/components/opspilot/common";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import {
  ROLE_LABEL,
  effectiveRole,
  relativeTime,
  type OpsRole,
} from "@/lib/opspilot/format";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Lock,
  Radar,
  ShieldCheck,
  Stamp,
  Users,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const ACCESS_MATRIX: Array<{ feature: string; admin: boolean; manager: boolean; operator: boolean }> = [
  { feature: "Dashboard & metrics", admin: true, manager: true, operator: true },
  { feature: "Knowledge copilot (chat)", admin: true, manager: true, operator: true },
  { feature: "View knowledge base", admin: true, manager: true, operator: true },
  { feature: "Upload & delete documents", admin: true, manager: true, operator: false },
  { feature: "View exceptions", admin: true, manager: true, operator: true },
  { feature: "Investigate, approve & reject", admin: true, manager: true, operator: false },
  { feature: "Manage users & roles", admin: true, manager: false, operator: false },
];

const ROLE_OPTIONS: OpsRole[] = ["admin", "manager", "operator"];

function initialsOf(name: string | null, email: string | null): string {
  const source = (name ?? email ?? "?").trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

function displayNameOf(name: string | null, email: string | null, isAnonymous: boolean) {
  if (name) return name;
  if (email) return email;
  return isAnonymous ? "Guest operator" : "Unnamed user";
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = effectiveRole(user?.role) === "admin";

  const metrics = useQuery(api.opspilot.metrics);
  const users = useQuery(api.opspilot.listUsers, isAdmin ? {} : "skip");
  const setUserRole = useMutation(api.opspilot.setUserRole);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <EmptyState
        icon={<Lock className="size-6" />}
        title="Admins only"
        message="The admin area manages accounts, roles and workspace access. Ask a workspace admin to make changes, or switch to an admin role from the top bar while exploring the demo."
        action={
          <Button className="clay-btn mt-2" onClick={() => window.history.back()}>
            Go back
          </Button>
        }
      />
    );
  }

  const changeRole = async (userId: string, role: OpsRole) => {
    setBusyId(userId);
    try {
      await setUserRole({ userId: userId as any, role });
      toast.success(`Role updated — this user is now ${ROLE_LABEL[role]}.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not update the role.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Workspace overview */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/exceptions" className="clay group flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Open exceptions</p>
            <p className="font-display mt-2 text-3xl font-bold">
              {metrics?.exceptions_open ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics?.pending_approvals ?? 0} awaiting approval
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary clay-press">
            <Radar className="size-5" />
          </span>
        </Link>

        <Link to="/knowledge-base" className="clay group flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Indexed documents</p>
            <p className="font-display mt-2 text-3xl font-bold">
              {metrics?.documents_indexed ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics?.total_chunks ?? 0} knowledge chunks
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground clay-press">
            <FileText className="size-5" />
          </span>
        </Link>

        <div className="clay flex items-start justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Approval rate</p>
            <p className="font-display mt-2 text-3xl font-bold">
              {metrics ? `${Math.round(metrics.approval_rate * 100)}%` : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              avg. resolution {metrics?.avg_resolution_minutes ?? "—"} min
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground clay-press">
            <Stamp className="size-5" />
          </span>
        </div>
      </section>

      {/* Users & roles */}
      <section className="clay overflow-hidden p-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-1">
          <div>
            <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
              <Users className="size-4 text-muted-foreground" />
              Users &amp; roles
            </h2>
            <p className="text-xs text-muted-foreground">
              Roles decide what each person can see and do. Changes apply
              immediately across the workspace.
            </p>
          </div>
        </div>

        {!users ? (
          <LoadingSpinner label="Loading accounts..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="clay-table w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="w-44 px-4 py-3 font-semibold">Role</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const role = effectiveRole(u.role ?? undefined);
                  const isSelf =
                    u.id === user?._id ||
                    u.id === (user as any)?.id ||
                    (!!u.email && u.email.toLowerCase() === user?.email?.toLowerCase());
                  return (
                    <tr key={u.id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                            {initialsOf(u.name, u.email)}
                          </span>
                          <span>
                            <span className="flex items-center gap-2 font-medium">
                              {displayNameOf(u.name, u.email, u.isAnonymous)}
                              {isSelf && (
                                <span
                                  className="pill"
                                  style={{ "--pill-color": "var(--info)" } as CSSProperties}
                                >
                                  you
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {u.email ?? (u.isAnonymous ? "guest session" : "no email")}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={role}
                          disabled={isSelf || busyId === u.id}
                          onValueChange={(v) =>
                            void changeRole(u.id, v as OpsRole)
                          }
                        >
                          <SelectTrigger size="sm" className="h-8 w-36 rounded-full bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="clay-sm rounded-2xl border-0 bg-card">
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r} className="rounded-lg">
                                {ROLE_LABEL[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isSelf && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            You can&apos;t change your own role
                          </p>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                        {relativeTime(u.joinedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Access matrix */}
      <section className="clay p-5">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-4 text-muted-foreground" />
          Who can do what
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Read broadly where authorized; act narrowly by explicit permission.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-4 font-semibold">Capability</th>
                <th className="w-24 py-2 text-center font-semibold">Admin</th>
                <th className="w-24 py-2 text-center font-semibold">Manager</th>
                <th className="w-24 py-2 text-center font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody>
              {ACCESS_MATRIX.map((row) => (
                <tr key={row.feature} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-4">{row.feature}</td>
                  {[row.admin, row.manager, row.operator].map((allowed, i) => (
                    <td key={i} className="py-2.5 text-center">
                      {allowed ? (
                        <span style={{ color: "var(--success)" }}>✓</span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick links */}
      <section className="flex flex-wrap gap-3">
        <Link to="/knowledge-base">
          <Button variant="outline" className="clay-btn bg-card gap-2">
            <BookOpen className="size-4" /> Manage documents
            <ArrowUpRight className="size-3.5 opacity-60" />
          </Button>
        </Link>
        <Link to="/exceptions">
          <Button variant="outline" className="clay-btn bg-card gap-2">
            <Radar className="size-4" /> Review exceptions
            <ArrowUpRight className="size-3.5 opacity-60" />
          </Button>
        </Link>
        <Link to="/chat">
          <Button variant="outline" className="clay-btn bg-card gap-2">
            <ShieldCheck className="size-4" /> Open the copilot
            <ArrowUpRight className="size-3.5 opacity-60" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
