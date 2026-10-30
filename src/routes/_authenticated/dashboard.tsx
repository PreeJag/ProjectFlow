import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProjectFlow" },
      {
        name: "description",
        content: "View your projects and tasks in ProjectFlow.",
      },
      { property: "og:title", content: "Dashboard — ProjectFlow" },
      {
        property: "og:description",
        content: "View your projects and tasks in ProjectFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const data = await api<{ user: any }>("/auth/me");
      return data.user;
    },
  });

  const role = user?.role || "user";
  const userId = user?.id;

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const data = await api<{ projects: any[] }>("/projects");
      return data.projects;
    },
    enabled: !!user,
  });

  const { data: tasks } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      if (!userId) return [];
      const data = await api<{ tasks: any[] }>(`/tasks?assignee_id=${userId}`);
      return data.tasks;
    },
    enabled: !!userId,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      return api<{ stats: any }>("/stats");
    },
    enabled: role === "admin",
    refetchOnWindowFocus: true,
  });

  const fullName = user?.fullName || "User";
  const email = user?.email || "";

  const projectCount = projects?.length || 0;
  const ownedProjects = projects?.filter((p: any) => p.owner_id === userId).length || 0;
  const taskCount = tasks?.length || 0;
  const overdueCount =
    tasks?.filter(
      (t: any) => t.due_date && t.status !== "done" && new Date(t.due_date) < new Date(),
    ).length || 0;

  const userCount = stats?.stats?.users || 0;
  const totalTasks = stats?.stats?.tasks || 0;
  const totalOverdue = stats?.stats?.overdueTasks || 0;

  return (
    <AppShell fullName={fullName} email={email} roles={[role]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, {fullName}. Your role:{" "}
            <span className="font-semibold capitalize">{role}</span>
          </p>
        </div>

        {role === "admin" ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Total Users</h3>
                <p className="mt-2 text-3xl font-bold">{userCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Registered users</p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Total Projects</h3>
                <p className="mt-2 text-3xl font-bold">{stats?.stats?.projects ?? 0}</p>
                <p className="mt-1 text-sm text-muted-foreground">All projects</p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Total Tasks</h3>
                <p className="mt-2 text-3xl font-bold">{totalTasks}</p>
                <p className="mt-1 text-sm text-muted-foreground">All tasks</p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Overdue Tasks</h3>
                <p className="mt-2 text-3xl font-bold text-destructive">{totalOverdue}</p>
                <p className="mt-1 text-sm text-muted-foreground">Need attention</p>
              </div>
            </div>
          </div>
        ) : role === "project_manager" ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">My Projects</h3>
                <p className="mt-2 text-3xl font-bold">{ownedProjects}</p>
                <p className="mt-1 text-sm text-muted-foreground">Projects you own</p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Total Projects</h3>
                <p className="mt-2 text-3xl font-bold">{projectCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">All projects</p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">My Tasks</h3>
                <p className="mt-2 text-3xl font-bold">{taskCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Assigned to you</p>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Team</h3>
              <p className="mt-2 text-muted-foreground">
                View and manage your team members in the Team section of the sidebar.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">My Tasks</h3>
                <p className="mt-2 text-3xl font-bold">{taskCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Assigned to you</p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Overdue Tasks</h3>
                <p className="mt-2 text-3xl font-bold text-destructive">{overdueCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">Need attention</p>
              </div>
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Projects</h3>
                <p className="mt-2 text-3xl font-bold">{projectCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">You're part of</p>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Your Role</h3>
              <p className="mt-2 text-muted-foreground">
                You are a Team Member. View your assigned tasks in the Projects page.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
