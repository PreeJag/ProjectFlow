import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, removeToken, setToken } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({
    meta: [
      { title: "Change Password — ProjectFlow" },
      {
        name: "description",
        content: "Change your password on first login.",
      },
    ],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Block back/forward navigation until the password is changed.
  // Leaving without changing logs the user out (clears the token) so the
  // next login is fresh and still forces a password change.
  useEffect(() => {
    const leaveWithoutChanging = () => {
      const sure = window.confirm(
        "You haven't changed your password yet. Leave anyway and log out?",
      );
      if (sure) {
        removeToken();
        navigate({ to: "/auth", replace: true });
      }
    };

    const blockNavigation = () => {
      leaveWithoutChanging();
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", blockNavigation);
    window.history.pushState(null, "", window.location.href);

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      if (!passwordChanged) {
        window.removeEventListener("popstate", blockNavigation);
      }
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [passwordChanged, navigate]);

  const changePasswordMutation = useMutation({
    mutationFn: async (values: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      return api<{ token: string; user: any }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
    },
    onSuccess: (data) => {
      setPasswordChanged(true);
      removeToken();
      toast.success("Password changed successfully. Please log in again with your new password.");
      navigate({ to: "/auth", replace: true });
    },
    onError: (error: any) => {
      console.error("Change password error:", error);
      setFieldErrors({});
      const details = error.body?.details;
      if (Array.isArray(details) && details.length > 0) {
        toast.error(details.join(" "));
        return;
      }
      if (error.body?.error) {
        setFieldErrors({ currentPassword: error.body.error });
      }
      toast.error(error.body?.error || "Failed to change password");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFieldErrors({ currentPassword: "All fields are required" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFieldErrors({
        confirmPassword: "New password and confirm password do not match",
      });
      return;
    }

    if (newPassword.length < 6) {
      setFieldErrors({
        newPassword: "New password must be at least 6 characters",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-card p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <span className="flex size-6 items-center justify-center rounded-md bg-destructive text-white font-bold">
              !
            </span>
            <h1 className="text-2xl font-bold">Change Password</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            This is your first login. Please set a new password before continuing.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              {fieldErrors.currentPassword && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.currentPassword}</p>
              )}
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {fieldErrors.newPassword && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.newPassword}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? "Changing…" : "Change Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
