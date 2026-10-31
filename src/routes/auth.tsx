import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { api, setToken } from "@/lib/api";
import {
  forgotPasswordSchema,
  signInSchema,
  type ForgotPasswordValues,
  type SignInValues,
} from "@/lib/auth-validation";

type Mode = "signin" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } => ({
    mode:
      typeof search["mode"] === "string" && ["signin", "forgot"].includes(search["mode"])
        ? (search["mode"] as Mode)
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — ProjectFlow" },
      {
        name: "description",
        content: "Sign in to ProjectFlow or create a standard user account.",
      },
      { property: "og:title", content: "Sign in — ProjectFlow" },
      {
        property: "og:description",
        content: "Sign in to ProjectFlow or create a standard user account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(values: SignInValues) {
    setBusy(true);
    setError(null);

    try {
      const data = await api<{ token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      // Ensure the role selected matches the account's actual stored role
      if (data.user.role !== values.role) {
        setError("This account is not registered with the selected role.");
        setBusy(false);
        return;
      }

      setToken(data.token);
      if (data.user.mustChangePassword) {
        toast.info("Please change your password before continuing");
        navigate({ to: "/change-password", replace: true });
        return;
      }
      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.body?.error || "Invalid email or password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot(values: ForgotPasswordValues) {
    setBusy(true);
    setError(null);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: values.email }),
      });
      toast.success("OTP sent", {
        description: "Check your email for the OTP code.",
      });
      navigate({ to: "/reset-password", replace: true, search: { email: values.email } });
    } catch (err: any) {
      if (err.status === 404) {
        setError(err.body?.error || "No account found with this email address");
      } else {
        setError(err.body?.error || "Could not send the OTP. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/60">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-sidebar font-bold text-sidebar-foreground">
              PF
            </span>
            <span className="text-lg font-bold tracking-tight">ProjectFlow</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            {mode === "signin" ? (
              <>
                <h1 className="text-xl font-semibold">Sign in</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Welcome back. Enter your credentials to continue.
                </p>
                <SignInForm busy={busy} onSubmit={handleSignIn} error={error} />
                <div className="mt-4 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold">Reset your password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your account email and we'll send you a reset link.
                </p>
                <ForgotPasswordForm
                  busy={busy}
                  onSubmit={handleForgot}
                  error={error}
                  onValidationError={setError}
                />
                <div className="mt-4 text-right text-xs">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

function SignInForm({
  busy,
  onSubmit,
  error,
}: {
  busy: boolean;
  onSubmit: (values: SignInValues) => void;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "project_manager" | "team_member">("team_member");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"email" | "password" | "role", string>>
  >({});

  // Check if email is the admin email
  const isAdminEmail = email === "preethikajagadisan@gmail.com";

  // Auto-select admin role for admin email
  if (isAdminEmail && role !== "admin") {
    setRole("admin");
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = signInSchema.safeParse({ email, password, role });
        if (!parsed.success) {
          setFieldErrors(
            Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])),
          );
          return;
        }
        setFieldErrors({});
        onSubmit(parsed.data);
      }}
    >
      <div>
        <Label htmlFor="signin-role">Sign in as</Label>
        <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={isAdminEmail}>
          <SelectTrigger id="signin-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {isAdminEmail ? (
              <SelectItem value="admin">Admin</SelectItem>
            ) : (
              <>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {isAdminEmail && (
          <p className="mt-1 text-xs text-muted-foreground">
            Admin access is restricted to this account
          </p>
        )}
        <FieldError message={fieldErrors["role"] ?? null} />
      </div>
      <div>
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FieldError message={fieldErrors.email ?? null} />
      </div>
      <div>
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FieldError message={fieldErrors.password ?? null} />
      </div>
      <FieldError message={error} />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({
  busy,
  onSubmit,
  error,
  onValidationError,
}: {
  busy: boolean;
  onSubmit: (values: ForgotPasswordValues) => void;
  error: string | null;
  onValidationError: (message: string | null) => void;
}) {
  const [email, setEmail] = useState("");

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = forgotPasswordSchema.safeParse({ email });

        if (!parsed.success) {
          onValidationError(parsed.error.issues[0]?.message ?? null);
          return;
        }

        onValidationError(null);
        onSubmit(parsed.data);
      }}
    >
      <div>
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <FieldError message={error} />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
