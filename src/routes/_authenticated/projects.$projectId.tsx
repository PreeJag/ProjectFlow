import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import {
  updateProjectSchema,
  addMemberSchema,
  type UpdateProjectValues,
  type AddMemberValues,
} from "@/lib/project-validation";
import {
  ArrowLeft,
  Edit,
  Calendar,
  Users,
  UserMinus,
  UserPlus,
  Settings,
  Trash2,
  List,
  Layout,
} from "lucide-react";

const BOARD_COLUMNS = [
  { id: "todo", label: "TO DO", color: "text-blue-600", bg: "bg-blue-50" },
  { id: "drafting", label: "DRAFTING", color: "text-orange-600", bg: "bg-orange-50" },
  { id: "review", label: "IN REVIEW", color: "text-purple-600", bg: "bg-purple-50" },
  { id: "done", label: "APPROVED", color: "text-green-600", bg: "bg-green-50" },
];

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project Details — ProjectFlow" },
      {
        name: "description",
        content: "View project details and manage board and members.",
      },
      { property: "og:title", content: "Project Details — ProjectFlow" },
      {
        property: "og:description",
        content: "View project details and manage board and members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { projectId } = Route.useParams();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDrag, setPendingDrag] = useState<{ taskId: string; fromStatus: string; toStatus: string } | null>(null);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const data = await api<{ user: any }>("/auth/me");
      return data.user;
    },
  });

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const data = await api<{ project: any }>(`/projects/${projectId}`);
      return data.project;
    },
    enabled: !!projectId,
  });

  const { data: tasks } = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const data = await api<{ tasks: any[] }>(`/tasks?project_id=${projectId}`);
      return data.tasks;
    },
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: UpdateProjectValues) => {
      return api<{ project: any }>(`/projects/${projectId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          startDate: values.startDate,
          endDate: values.endDate,
        }),
      }).then((r) => r.project);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditDialogOpen(false);
      toast.success("Project updated successfully");
    },
    onError: (error: any) => {
      console.error("Update project error:", error);
      toast.error(error.body?.error || "Failed to update project");
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (values: AddMemberValues) => {
      return api(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: values.email }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setAddMemberDialogOpen(false);
      toast.success("Member added successfully");
    },
    onError: (error: any) => {
      console.error("Add member error:", error);
      const msg = error.body?.error || "";
      if (msg.includes("already a member")) {
        toast.error("This user is already a member of the project");
      } else if (msg === "User not found with this email") {
        toast.error("User not found with this email");
      } else {
        toast.error("Failed to add member");
      }
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return api(`/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Member removed successfully");
    },
    onError: (error: any) => {
      console.error("Remove member error:", error);
      toast.error(error.body?.error || "Failed to remove member");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api(`/projects/${projectId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/projects" });
      toast.success("Project deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete project error:", error);
      toast.error(error.body?.error || "Failed to delete project");
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      status: string;
      due_date?: string;
      assignee_id?: string;
    }) => {
      return api<{ task: any }>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          project_id: projectId,
          title: values.title,
          description: values.description,
          status: values.status,
          due_date: values.due_date,
          assignee_id: values.assignee_id,
        }),
      }).then((r) => r.task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setAddTaskDialogOpen(false);
      toast.success("Task created successfully");
    },
    onError: (error: any) => {
      console.error("Create task error:", error);
      toast.error(error.body?.error || "Failed to create task");
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, values }: { taskId: string; values: any }) => {
      return api<{ task: any }>(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }).then((r) => r.task);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      setEditTaskDialogOpen(false);
      setEditingTaskId(null);
      toast.success("Task updated successfully");
    },
    onError: (error: any) => {
      console.error("Update task error:", error);
      toast.error(error.body?.error || "Failed to update task");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return api(`/tasks/${taskId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      toast.success("Task deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete task error:", error);
      toast.error(error.body?.error || "Failed to delete task");
    },
  });

  const fullName = user?.fullName || "User";
  const email = user?.email || "";
  const role = user?.role || "user";
  const isAdmin = role === "admin";
  const isOwner = project?.owner_id === user?.id;
  const canEdit = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  function formatDate(date: string | null) {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const tasksByColumn = BOARD_COLUMNS.reduce((acc, col) => {
    acc[col.id] = (tasks || []).filter((t: any) => t.status === col.id);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDragStart = useCallback(
    (e: React.DragEvent, taskId: string, fromStatus: string) => {
      e.dataTransfer.setData("taskId", taskId);
      e.dataTransfer.setData("fromStatus", fromStatus);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toStatus: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("taskId");
      const fromStatus = e.dataTransfer.getData("fromStatus");
      if (!taskId || fromStatus === toStatus) return;

      const task = (tasks || []).find((t: any) => t.id === taskId);
      if (!task) return;

      // Role-based drag restrictions for team members
      if (role === "team_member") {
        const isAssignee = task.assignee_id && task.assignee_id.toString() === user?.id;

        if (fromStatus === "todo" && toStatus === "drafting") {
          // Taking the task - confirm
          setPendingDrag({ taskId, fromStatus, toStatus });
          return;
        }
        if (fromStatus === "drafting" && toStatus === "review") {
          // Moving to review - must be assignee
          if (!isAssignee) {
            toast.error("Only the assigned team member can move this task to In Review");
            return;
          }
          setPendingDrag({ taskId, fromStatus, toStatus });
          return;
        }
        // Team members cannot move to APPROVED or any other transition
        toast.error("Team members can only move tasks from To Do to Drafting, or Drafting to In Review");
        return;
      }

      // Admin / PM can move freely
      setPendingDrag({ taskId, fromStatus, toStatus });
    },
    [tasks, role, user, updateTaskMutation]
  );

  if (isLoading) {
    return (
      <AppShell fullName={fullName} email={email} roles={[role]}>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell fullName={fullName} email={email} roles={[role]}>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive font-medium">Failed to load project</p>
          <p className="mt-1 text-sm text-destructive/80">
            {(error as Error)?.message || "Project not found"}
          </p>
          <Link to="/projects">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 size-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell fullName={fullName} email={email} roles={[role]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {project.key}
                </span>
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="mr-2 size-4" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Update project details.</DialogDescription>
                  </DialogHeader>
                  <EditProjectForm
                    project={project}
                    onSubmit={(values) => updateMutation.mutate(values)}
                    isSubmitting={updateMutation.isPending}
                    onCancel={() => setEditDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
              {canDelete && (
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this project? This action cannot be
                        undone and will also delete all associated tasks.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button onClick={() => setAddTaskDialogOpen(true)}>
                <List className="mr-2 size-4" />
                Add Task
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Description</h2>
              <p className="text-muted-foreground">
                {project.description || "No description provided."}
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Timeline</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Start Date</Label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>{formatDate(project.start_date)}</span>
                  </div>
                </div>
                <div>
                  <Label>End Date</Label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>{formatDate(project.end_date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Members</h2>
                {canEdit && (
                  <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <UserPlus className="mr-2 size-4" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>
                          Add a user to this project by their email address.
                        </DialogDescription>
                      </DialogHeader>
                      <AddMemberForm
                        onSubmit={(values) => addMemberMutation.mutate(values)}
                        isSubmitting={addMemberMutation.isPending}
                        onCancel={() => setAddMemberDialogOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {project.members?.map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div>
                      <p className="font-medium">{member.fullName || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-secondary px-2 py-0.5 text-xs capitalize">
                        {member.role}
                      </span>
                      {canEdit && member.role !== "owner" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMemberMutation.mutate(member.id)}
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserMinus className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {!project.members || project.members.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">No members yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Task Board</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-4 min-h-[500px]">
            {BOARD_COLUMNS.map((col) => (
              <div
                key={col.id}
                className="flex-1 flex flex-col gap-3 rounded-lg border p-3"
                style={{ backgroundColor: col.bg === "bg-blue-50" ? "#eff6ff" : col.bg === "bg-orange-50" ? "#fff7ed" : col.bg === "bg-purple-50" ? "#faf5ff" : "#f0fdf4" }}
              >
                <div className="flex items-center justify-between mb-2 px-2">
                  <h3 className={`font-semibold ${col.color} flex items-center gap-1`}>
                    <Layout className="size-4" /> {col.label}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground">
                    {tasksByColumn[col.id]?.length || 0}
                  </span>
                </div>
                <div
                  className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {tasksByColumn[col.id]?.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                      className="flex items-start justify-between rounded border p-3 shadow-sm bg-white cursor-move group"
                      style={{ borderColor: task.status === "todo" ? "#e2e8f0" : task.status === "in_progress" ? "#fdba74" : task.status === "review" ? "#c4b5fd" : "#86efac" }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${task.status === "todo" ? "text-blue-600" : task.status === "drafting" ? "text-orange-600" : task.status === "review" ? "text-purple-600" : "text-green-600"}`}>
                            {task.status === "todo" ? "TO DO" : task.status === "drafting" ? "DRAFTING" : task.status === "review" ? "IN REVIEW" : "APPROVED"}
                          </span>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-sm group-hover:text-primary">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          {task.assignee_id ? (
                            <span className="flex items-center gap-1 text-xs bg-blue-50 px-2 py-1 rounded">
                              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                              {task.assignee_id.toString() === user?.id ? "You" : task.assigneeModel ? task.assigneeModel.charAt(0).toUpperCase() + "." : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTaskId(task.id);
                              setEditTaskDialogOpen(true);
                            }}
                          >
                            <Settings className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTaskMutation.mutate(task.id);
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!tasksByColumn[col.id]?.length && (
                    <div className="flex items-center justify-center py-4">
                      <p className="text-xs text-muted-foreground">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Task Dialog */}
        <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
              <DialogDescription>Create a new task for this project.</DialogDescription>
            </DialogHeader>
            <AddTaskForm
              projectId={projectId}
              onSubmit={(values) => addTaskMutation.mutate(values)}
              isSubmitting={addTaskMutation.isPending}
              onCancel={() => setAddTaskDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={editTaskDialogOpen} onOpenChange={(open) => {
          setEditTaskDialogOpen(open);
          if (!open) setEditingTaskId(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Update task details.</DialogDescription>
            </DialogHeader>
            <EditTaskForm
              task={(tasks || []).find((t) => t.id === editingTaskId)}
              onSubmit={(values) => updateTaskMutation.mutate({ taskId: editingTaskId!, values })}
              isSubmitting={updateTaskMutation.isPending}
              onCancel={() => setEditTaskDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Drag confirmation dialog */}
      {pendingDrag && (
        <Dialog open={!!pendingDrag} onOpenChange={(open) => {
          if (!open) setPendingDrag(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Task Move</DialogTitle>
              <DialogDescription>
                {pendingDrag.fromStatus === "todo" && pendingDrag.toStatus === "drafting"
                  ? "Are you sure you want to take this task? Once picked, it will be assigned to you and cannot be undone."
                  : pendingDrag.fromStatus === "drafting" && pendingDrag.toStatus === "review"
                    ? "Are you sure you want to move this task to In Review?"
                    : "Confirm task move?"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPendingDrag(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const { taskId, fromStatus, toStatus } = pendingDrag!;
                  updateTaskMutation.mutate({
                    taskId,
                    values: {
                      status: toStatus,
                      ...(fromStatus === "todo" && toStatus === "drafting"
                        ? { assignee_id: user?.id }
                        : {}),
                    },
                  });
                  setPendingDrag(null);
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}

function EditProjectForm({
  project,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  project: any;
  onSubmit: (values: UpdateProjectValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState(project.name || "");
  const [description, setDescription] = useState(project.description || "");
  const [startDate, setStartDate] = useState(
    project.start_date ? project.start_date.split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    project.end_date ? project.end_date.split("T")[0] : ""
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = updateProjectSchema.safeParse({
      name,
      description,
      startDate,
      endDate,
    });
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]))
      );
      return;
    }
    setFieldErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-name">Project Name</Label>
        <Input
          id="edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {fieldErrors["name"] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors["name"]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="edit-description">Description (Optional)</Label>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
        />
        {fieldErrors["description"] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors["description"]}</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="edit-start-date">Start Date (Optional)</Label>
          <Input
            id="edit-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {fieldErrors["startDate"] && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors["startDate"]}</p>
          )}
        </div>
        <div>
          <Label htmlFor="edit-end-date">End Date (Optional)</Label>
          <Input
            id="edit-end-date"
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
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddMemberForm({
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  onSubmit: (values: AddMemberValues) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = addMemberSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message]))
      );
      return;
    }
    setFieldErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="member-email">Email</Label>
        <Input
          id="member-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
        {fieldErrors["email"] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors["email"]}</p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Member"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddTaskForm({
  projectId,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  projectId: string;
  onSubmit: (values: any) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    if (!title.trim()) {
      setFieldErrors({ title: "Task title is required" });
      return;
    }
    onSubmit({
      title,
      description: description || null,
      status,
      due_date: dueDate || null,
      assignee_id: undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="task-title">Task Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
        />
        {fieldErrors["title"] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors["title"]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="task-description">Description (Optional)</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="task-status">Status</Label>
          <Input
            id="task-status"
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            list="task-statuses"
          />
          <datalist id="task-statuses">
            <option value="todo" />
            <option value="drafting" />
            <option value="review" />
            <option value="done" />
          </datalist>
        </div>
        <div>
          <Label htmlFor="task-due-date">Due Date (Optional)</Label>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Task"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditTaskForm({
  task,
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  task: any;
  onSubmit: (values: any) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState(task?.status || "todo");
  const [dueDate, setDueDate] = useState(
    task?.due_date ? task.due_date.split("T")[0] : ""
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    if (!title.trim()) {
      setFieldErrors({ title: "Task title is required" });
      return;
    }
    onSubmit({
      title,
      description: description || null,
      status,
      due_date: dueDate || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-task-title">Task Title</Label>
        <Input
          id="edit-task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {fieldErrors["title"] && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors["title"]}</p>
        )}
      </div>
      <div>
        <Label htmlFor="edit-task-description">Description (Optional)</Label>
        <Textarea
          id="edit-task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[80px]"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="edit-task-status">Status</Label>
          <Input
            id="edit-task-status"
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            list="edit-task-statuses"
          />
          <datalist id="edit-task-statuses">
            <option value="todo" />
            <option value="drafting" />
            <option value="review" />
            <option value="done" />
          </datalist>
        </div>
        <div>
          <Label htmlFor="edit-task-due-date">Due Date (Optional)</Label>
          <Input
            id="edit-task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
