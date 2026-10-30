import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, UserCheck, UserX } from "lucide-react";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team — ProjectFlow" },
      {
        name: "description",
        content: "Manage your team members in ProjectFlow.",
      },
      { property: "og:title", content: "Team — ProjectFlow" },
      {
        property: "og:description",
        content: "Manage your team members in ProjectFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const data = await api<{ user: any }>("/auth/me");
      return data.user;
    },
  });

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      const data = await api<{ teamMembers: any[] }>("/auth/team-members");
      return data.teamMembers;
    },
    enabled: !!user,
  });

  const fullName = user?.fullName || "User";
  const email = user?.email || "";
  const role = user?.role || "user";

  const createTeamMemberMutation = useMutation({
    mutationFn: async (values: any) => {
      return api<{ teamMember: any }>("/auth/team-members", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          fullName: values.fullName,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setCreateDialogOpen(false);
      toast.success("Team Member created successfully");
    },
    onError: (error: any) => {
      console.error("Create team member error:", error);
      toast.error(error.body?.error || "Failed to create team member");
    },
  });

  const deleteTeamMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api(`/auth/team-members/${userId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Team Member deleted successfully");
    },
    onError: (error: any) => {
      console.error("Delete user error:", error);
      toast.error(error.body?.error || "Failed to delete user");
    },
  });

  const tms = teamMembers || [];

  return (
    <AppShell fullName={fullName} email={email} roles={[role]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="size-8" />
              Team
            </h1>
            <p className="mt-2 text-muted-foreground">Manage your team members.</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Create Team Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team Member</DialogTitle>
                <DialogDescription>
                  Create a new Team Member account. Share the email and password with them so they
                  can sign in.
                </DialogDescription>
              </DialogHeader>
              <CreateTeamMemberForm
                onSubmit={(values) => createTeamMemberMutation.mutate(values)}
                isSubmitting={createTeamMemberMutation.isPending}
                onCancel={() => setCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading team members...</p>
          </div>
        ) : tms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
            <UserCheck className="size-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No team members yet</h3>
            <p className="mt-2 text-center text-muted-foreground">
              Create your first Team Member to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tms.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-md border p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-green-100 font-semibold text-green-600">
                      {member.fullName?.charAt(0)?.toUpperCase() ||
                        member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.fullName || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-green-600">Team Member</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTeamMemberMutation.mutate(member.id)}
                  >
                    <UserX className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CreateTeamMemberForm({
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
        <Label htmlFor="tm-name">Full Name</Label>
        <Input
          id="tm-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <Label htmlFor="tm-email">Email</Label>
        <Input
          id="tm-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="tm-password">Password</Label>
        <Input
          id="tm-password"
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
          {isSubmitting ? "Creating..." : "Create Team Member"}
        </Button>
      </DialogFooter>
    </form>
  );
}
