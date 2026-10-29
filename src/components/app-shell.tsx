import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type AppShellProps = {
  fullName: string;
  email: string;
  roles: string[];
  children: ReactNode;
};

export function AppShell({ fullName, email, roles, children }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = roles.includes("admin");

  async function handleSignOut() {
    // Ordered teardown: stop in-flight queries, drop protected cache, clear
    // the session, then replace history so Back cannot restore this route.
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/profile", label: "Profile", icon: UserRound },
  ] as const;

  function initials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }

  return (
    <div className="flex min-h-screen bg-secondary/50">
      {/* Sidebar */}
      <aside
        className={`${
          mobileNavOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
        } w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-screen`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary font-bold text-sidebar-primary-foreground">
            PF
          </span>
          <span className="text-lg font-bold tracking-tight">ProjectFlow</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <div className="pt-3">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                Administration
              </p>
              <p className="px-3 text-xs text-sidebar-foreground/70">
                Global metrics are shown on your dashboard.
              </p>
            </div>
          )}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
              {initials(fullName) || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fullName || "Unnamed user"}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {isAdmin ? "Administrator" : "Standard user"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex-1" />
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </header>
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-foreground/30 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
