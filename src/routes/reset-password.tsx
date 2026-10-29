import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resetPasswordSchema } from "@/lib/auth-validation";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ProjectFlow" },
      {
        name: "description",
        content: "Set a new password for your ProjectFlow account.",
      },
      { property: "og:title", content: "Reset password — ProjectFlow" },
      {
        property: "og:description",
        content: "Set a new password for your ProjectFlow account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Recovery links arrive with #type=recovery in the URL hash.
  useEffect(() => {
    setIsRecovery(window.location.hash.includes("type=recovery"));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    setBusy(true);
    // Recovery sessions are exempt from the current-password requirement.
    const { error: authError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    setBusy(false);
    if (authError) {
      setError("Could not update your password. The reset link may have expired — request a new one.");
      return;
    }
    toast.success("Password updated", {
      description: "You are now signed in with your new password.",
    });
    navigate({ to: "/dashboard" });
  }

  if (isRecovery === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking reset link…</p>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/60 px-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Password reset</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This page is for password-reset email links. If you want to change
            your password, request a reset link from the sign-in page.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/60 px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a new password of at least 8 characters.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reset-confirm">Confirm new password</Label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
