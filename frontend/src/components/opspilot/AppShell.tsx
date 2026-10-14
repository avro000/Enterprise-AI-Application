import { RoleBadge } from "@/components/opspilot/badges";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  effectiveRole,
  type OpsRole,
} from "@/lib/opspilot/format";
import { useMutation, prefetchQuery } from "convex/react";
import {
  AlertTriangle,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, blurb: "Command center" },
  { path: "/chat", label: "Chat", icon: MessagesSquare, blurb: "Knowledge copilot" },
  { path: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, blurb: "Policies & SOPs" },
  { path: "/exceptions", label: "Exceptions", icon: AlertTriangle, blurb: "AI case manager" },
] as const;

const PAGE_META: Array<{ match: string; title: string; subtitle: string }> = [
  { match: "/dashboard", title: "Dashboard", subtitle: "Operations Command Center" },
  { match: "/chat", title: "Knowledge Copilot", subtitle: "Grounded answers across docs + live data" },
  { match: "/knowledge-base", title: "Knowledge Base", subtitle: "Documents feeding the retrieval layer" },
  { match: "/exceptions", title: "Exceptions", subtitle: "Detect → Investigate → Recommend → Act" },
  { match: "/admin", title: "Admin", subtitle: "Users, roles and workspace access" },
];

function pageMeta(pathname: string) {
  if (pathname.startsWith("/exceptions/")) {
    return { title: "Case detail", subtitle: "Full investigation & approval record" };
  }
  return (
    PAGE_META.find((m) => pathname.startsWith(m.match)) ?? {
      title: "OpsPilot AI",
      subtitle: "Operations intelligence layer",
    }
  );
}

function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
      style={{
        width: size,
        height: size,
        boxShadow:
          "inset 2px 2px 4px rgb(255 255 255 / 0.35), inset -2px -3px 6px rgb(0 0 0 / 0.25)",
      }}
    >
      <Rocket className="size-[18px]" />
    </span>
  );
}

function SidebarBody({
  onNavigate,
  onSignOut,
  role,
  displayName,
}: {
  onNavigate?: () => void;
  onSignOut: () => void;
  role: OpsRole;
  displayName: string;
}) {
  const location = useLocation();
  const initials = displayName
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navItems =
    role === "admin"
      ? [
          ...NAV_ITEMS,
          { path: "/admin", label: "Admin", icon: ShieldCheck, blurb: "Users & access" },
        ]
      : [...NAV_ITEMS];

  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <Logo />
        <div className="min-w-0">
          <p className="font-display text-[15px] leading-tight font-semibold text-sidebar-foreground">
            OpsPilot AI
          </p>
          <p className="text-[10px] tracking-wide text-sidebar-foreground/55 uppercase">
            Operations layer
          </p>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all ${
                active
                  ? "clay-dark-press bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              }`}
            >
              {active && (
                <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-full bg-sidebar-primary" />
              )}
              <Icon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-[10px] text-sidebar-foreground/45">
                  {item.blurb}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-2xl bg-sidebar-accent/50 px-3 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/90 text-sm font-bold text-sidebar-primary-foreground">
              {initials || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {displayName}
              </p>
              <div className="mt-1">
                <RoleBadge role={role} />
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              className="rounded-full p-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        <p className="px-1 text-[10px] leading-4 text-sidebar-foreground/40">
          Demo workspace · mock ERP and CRM data · every AI action is written
          to the audit trail.
        </p>
      </div>
    </>
  );
}

export function AppShell() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const seed = useMutation(api.opspilot.seedDemoData);
  const ensureUserRole = useMutation(api.opspilot.ensureUserRole);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    // Proactively prefetch & warm up dashboard queries for instant rendering
    void prefetchQuery(api.opspilot.metrics);
    void prefetchQuery(api.opspilot.recentExceptions);
  }, [isLoading, isAuthenticated]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const role = effectiveRole(user?.role);
  const displayName = user?.name ?? user?.email ?? "Guest operator";
  const meta = pageMeta(location.pathname);

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar — floating dark clay panel */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] p-4 lg:block">
        <div className="clay-dark flex h-full flex-col rounded-[28px] p-4">
          <SidebarBody onSignOut={handleSignOut} role={role} displayName={displayName} />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          className="w-[300px] rounded-r-[28px] border-0 bg-sidebar p-4"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <SidebarBody
              onNavigate={() => setNavOpen(false)}
              onSignOut={handleSignOut}
              role={role}
              displayName={displayName}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-[272px]">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="clay-sm flex size-9 items-center justify-center bg-card lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-lg leading-tight font-semibold sm:text-xl">
              {meta.title}
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {meta.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2.5 rounded-full bg-card px-3.5 py-1.5 shadow-sm sm:flex">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                {(displayName.charAt(0) ?? "G").toUpperCase()}
              </span>
              <span className="max-w-40 truncate text-xs font-medium">{displayName}</span>
              <RoleBadge role={role} />
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              title="Sign out"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="px-4 pb-12 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
