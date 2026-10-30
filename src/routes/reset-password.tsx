import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string" ? (search["email"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset Password — ProjectFlow" },
      {
        name: "description",
        content: "Reset your ProjectFlow password using the OTP sent to your email.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    otp?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const email = search.email || "";

  const resetPasswordMutation = useMutation({
    mutationFn: async (values: { otp: string; password: string; confirmPassword: string }) => {
      return api<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    },
    onError: (error: any) => {
      console.error("Reset password error:", error);
      setFieldErrors({});
      if (error.body?.error) {
        setFieldErrors({ otp: error.body.error });
      }
      toast.error(error.body?.error || "Failed to reset password");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    if (!otp || !password || !confirmPassword) {
      setFieldErrors({ otp: "All fields are required" });
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setFieldErrors({ otp: "OTP must be a 6-digit code" });
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    if (password.length < 6) {
      setFieldErrors({ password: "Password must be at least 6 characters" });
      return;
    }

    resetPasswordMutation.mutate({ otp, password, confirmPassword });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-card p-8 shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-white font-bold">
              !
            </span>
            <h1 className="text-2xl font-bold">Reset Password</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground mb-6">
            Enter the OTP sent to your email and set a new password.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" value={email} readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="reset-otp">OTP Code</Label>
              <Input
                id="reset-otp"
                type="text"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
              {fieldErrors.otp && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.otp}</p>
              )}
            </div>
            <div>
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>
            <div>
              <Label htmlFor="reset-confirm-password">Confirm Password</Label>
              <Input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.confirmPassword}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? "Resetting…" : "Reset Password"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remember your new password?{" "}
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
