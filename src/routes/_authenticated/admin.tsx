import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, UserCheck, UserX, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ProjectFlow" },
      {
        name: "description",
        content: "Admin dashboard for user and role management.",
      },
      { property: "og:title", content: "Admin — ProjectFlow" },
      {
        property: "og:description",
        content: "Admin dashboard for user and role management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
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

  const { data: projectManagers, isLoading: isLoadingPMs } = useQuery({
    queryKey: ["project-managers"],
    queryFn: async () => {
      const data = await api<{ projectManagers: any[] }>("/auth/project-managers");
      return data.projectManagers;
    },
    enabled: !!user,
  });

  const { data: teamMembers, isLoading: isLoadingTMs } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const data = await api<{ teamMembers: any[] }>("/auth/team-members");
      return data.teamMembers;
    },
    enabled: !!user,
  });

  const isLoading = isLoadingPMs || isLoadingTMs;

  const createUserMutation = useMutation({
    mutationFn: async (values: any) => {
      return api<{ projectManager: any }>("/auth/project-managers", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          fullName: values.fullName,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-managers"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setCreateDialogOpen(false);
      toast.success("Project Manager created successfully");
    },
    onError: (error: any) => {
      console.error("Create user error:", error);
      toast.error(error.body?.error || "Failed to create user");
    },
  });

  const deleteProjectManagerMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api(`/auth/project-managers/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-managers"] });
      toast.success("Project Manager deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete user error:", error);
      toast.error(error.body?.error || "Failed to delete user");
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api(`/auth/team-members/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("Team Member deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete user error:", error);
      toast.error(error.body?.error || "Failed to delete user");
    },
  });

  const fullName = user?.fullName || "User";
  const email = user?.email || "";
  const role = userRole?.role || "user";

  // Redirect if not admin
  if (role !== "admin") {
    return (
      <AppShell fullName={fullName} email={email} roles={[role]}>
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive font-medium">Access denied. Admin privileges required.</p>
        </div>
      </AppShell>
    );
  }

  const pms = projectManagers || [];
  const tms = teamMembers || [];

  return (
    <AppShell fullName={fullName} email={email} roles={["admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="size-8" />
              Admin Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">Manage Project Managers and Team Members.</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Create Project Manager
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project Manager</DialogTitle>
                <DialogDescription>
                  Create a new Project Manager account. Share the email and password with them so
                  they can sign in.
                </DialogDescription>
              </DialogHeader>
              <CreateUserForm
                onSubmit={(values) => createUserMutation.mutate(values)}
                isSubmitting={createUserMutation.isPending}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : pms.length === 0 && tms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <UserCheck className="size-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No users yet</h3>
            <p className="mt-2 text-center text-muted-foreground">
              Create your first Project Manager to get started.
            </p>
            <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Project Manager
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Managers Section */}
            <div className="rounded-lg border bg-card">
              <div className="border-b bg-muted/50 px-6 py-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="size-4 text-blue-600" />
                  Project Managers ({pms.length})
                </h3>
              </div>
              <div className="grid gap-4 p-6">
                {pms.length > 0 ? (
                  pms.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-md border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
                            {user.fullName?.charAt(0)?.toUpperCase() ||
                              user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.fullName || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-blue-600">Project Manager</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteProjectManagerMutation.mutate(user.id)}
                          disabled={user.email === "preethikajagadisan@gmail.com"}
                        >
                          <UserX className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No project managers found
                  </p>
                )}
              </div>
            </div>

            {/* Team Members Section */}
            <div className="rounded-lg border bg-card">
              <div className="border-b bg-muted/50 px-6 py-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserCheck className="size-4 text-green-600" />
                  Team Members ({tms.length})
                </h3>
              </div>
              <div className="grid gap-4 p-6">
                {tms.length > 0 ? (
                  tms.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-md border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-green-100 font-semibold text-green-600">
                            {user.fullName?.charAt(0)?.toUpperCase() ||
                              user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.fullName || "Unknown"}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-green-600">Team Member</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTeamMemberMutation.mutate(user.id)}
                        >
                          <UserX className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team members found
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CreateUserForm({
  onSubmit,
  isSubmitting,
  onCancel,
}: {
  onSubmit: (values: any) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error("All fields are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    onSubmit({ fullName, email, password });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="user-name">Full Name</Label>
        <Input
          id="user-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="user-password">Password</Label>
        <Input
          id="user-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create User"}
        </Button>
      </DialogFooter>
    </form>
  );
}
