import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { createProjectSchema, type CreateProjectValues } from "@/lib/project-validation";
import { Plus, FolderOpen, Calendar, Users, MoreVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — ProjectFlow" },
      {
        name: "description",
        content: "View and manage your projects in ProjectFlow.",
      },
      { property: "og:title", content: "Projects — ProjectFlow" },
      {
        property: "og:description",
        content: "View and manage your projects in ProjectFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsListPage,
});

function ProjectsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const data = await api<{ user: any }>("/auth/me");
      return data.user;
    },
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role"],
    queryFn: async () => {
      const data = await api<{ user: any }>("/auth/me");
      return { role: data.user.role };
    },
    enabled: !!user,
  });

  const {
    data: projects,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const data = await api<{ projects: any[] }>("/projects");
      return data.projects;
    },
    enabled: !!user,
  });

  const role = userRole?.role || "user";

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const data = await api<{ teamMembers: any[] }>("/auth/team-members");
      return data.teamMembers;
    },
    enabled: role === "project_manager",
  });

  const createMutation = useMutation({
    mutationFn: async (values: CreateProjectValues) => {
      const data = await api<{ project: any }>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          startDate: values.startDate,
          endDate: values.endDate,
          memberEmails: values.memberEmails,
        }),
      });
      return data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setCreateDialogOpen(false);
      toast.success("Project created successfully");
    },
    onError: (error: any) => {
      console.error("Create project error:", error);
      toast.error(error.body?.error || "Failed to create project");
    },
  });

  const fullName = user?.fullName || "User";
  const email = user?.email || "";

  function formatDate(date: string | null) {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <AppShell fullName={fullName} email={email} roles={[role]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="mt-2 text-muted-foreground">Manage your projects and track progress.</p>
          </div>
          {role !== "team_member" && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 size-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project to start organizing your tasks.
                  </DialogDescription>
                </DialogHeader>
                <CreateProjectForm
                  role={role}
                  availableMembers={teamMembers}
                  onSubmit={(values) => createMutation.mutate(values)}
                  isSubmitting={createMutation.isPending}
                  onCancel={() => setCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
            <p className="text-destructive font-medium">Failed to load projects</p>
            <p className="mt-1 text-sm text-destructive/80">{(error as Error).message}</p>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <FolderOpen className="size-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mt-2 text-center text-muted-foreground">
              Create your first project to get started with ProjectFlow.
            </p>
            {role !== "team_member" && (
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="group rounded-lg border bg-card p-6 shadow-sm transition-colors hover:border-primary/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {project.key}
                      </span>
                    </div>
                    <h3 className="mt-2 text-lg font-semibold group-hover:text-primary">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  {project.start_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>{formatDate(project.start_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Users className="size-3" />
                    <span>Members</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CreateProjectForm({
  role,
  availableMembers,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  role: string;
  availableMembers: any[] | undefined;
  onSubmit: (values: CreateProjectValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = createProjectSchema.safeParse({
      name,
      description,
      startDate,
      endDate,
      memberEmails: selectedMembers,
    });
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setFieldErrors({});
    onSubmit(parsed.data);
  }

  const members = availableMembers || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Library Management System"
        />
        {fieldErrors["name"] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors["name"]}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Project key will be auto-generated from the name.
        </p>
      </div>
      <div>
        <Label htmlFor="project-description">Description (Optional)</Label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your project..."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {fieldErrors["description"] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors["description"]}</p>
        )}
      </div>
      {role === "project_manager" && members.length > 0 && (
        <div>
          <Label htmlFor="project-members">Team Members</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select team members to add to this project (only members you created).
          </p>
          <div className="max-h-48 overflow-y-auto border border-input rounded p-2 space-y-1">
            {members.map((member: any) => (
              <label
                key={member.id}
                className="flex items-center gap-2 cursor-pointer select-none hover:bg-muted/50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.email)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMembers([...selectedMembers, member.email]);
                    } else {
                      setSelectedMembers(selectedMembers.filter((em) => em !== member.email));
                    }
                  }}
                  className="rounded text-primary"
                />
                <span className="text-sm">{member.fullName || "Unknown"}</span>
                <span className="ml-1 text-xs text-muted-foreground">{member.email}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="start-date">Start Date (Optional)</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {fieldErrors["startDate"] && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors["startDate"]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="end-date">End Date (Optional)</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          {fieldErrors["endDate"] && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors["endDate"]}</p>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
