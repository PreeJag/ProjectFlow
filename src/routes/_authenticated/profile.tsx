import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — ProjectFlow" },
      {
        name: "description",
        content: "Manage your ProjectFlow profile and settings.",
      },
      { property: "og:title", content: "Profile — ProjectFlow" },
      {
        property: "og:description",
        content: "Manage your ProjectFlow profile and settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const data = await api<{ user: any }>("/auth/me");
      return data.user;
    },
  });

  const fullName = user?.fullName || "User";
  const email = user?.email || "";
  const role = user?.role || "user";

  return (
    <AppShell fullName={fullName} email={email} roles={[role]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Account Information</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="mt-1 text-base">{fullName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-base">{email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <p className="mt-1 text-base capitalize">
                {role === "admin"
                  ? "Administrator"
                  : role === "project_manager"
                    ? "Project Manager"
                    : role === "team_member"
                      ? "Team Member"
                      : "Standard User"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Settings</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Profile settings and preferences will be available here.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
