import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "ProjectFlow — Project & Task Tracker",
      },
      {
        name: "description",
        content:
          "ProjectFlow is a clean, professional project and task tracker with secure role-based access.",
      },
      { property: "og:title", content: "ProjectFlow — Project & Task Tracker" },
      {
        property: "og:description",
        content:
          "ProjectFlow is a clean, professional project and task tracker with secure role-based access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-sidebar font-bold text-sidebar-foreground">
              PF
            </span>
            <span className="text-lg font-bold tracking-tight">ProjectFlow</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              to="/auth"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
            Team project tracking
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Plan projects. Track tasks. <span className="text-primary">Ship together.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            A clean, Jira-inspired workspace for projects, tasks and team members — with secure,
            role-based access control built in.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/auth"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign in to your workspace
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-md border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Create an account
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-6">
        <p className="text-center text-xs text-muted-foreground">
          ProjectFlow — every account starts with standard user privileges. Administrator access is
          provisioned only through a secure, one-time setup procedure.
        </p>
      </footer>
    </div>
  );
}
