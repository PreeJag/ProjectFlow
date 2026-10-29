import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type SignInValues,
  type SignUpValues,
} from "@/lib/auth-validation";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
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
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("mode") === "signup") return "signup";
    }
    return "signin";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupNotice, setSignupNotice] = useState<string | null>(null);

  async function handleSignIn(values: SignInValues) {
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setBusy(false);
    if (authError) {
      if (authError.message === "Email not confirmed") {
        setError("Please confirm your email address first — check your inbox for the confirmation link.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
      return;
    }
    toast.success("Signed in");
    navigate({ to: "/dashboard" });
  }

  async function handleSignUp(values: SignUpValues) {
    setBusy(true);
    setError(null);
    const { data, error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (authError) {
      if (authError.message.toLowerCase().includes("already registered")) {
        setError("This email is already registered. Try signing in instead.");
      } else {
        setError("Registration failed. Please try again.");
      }
      return;
    }
    if (data.session) {
      toast.success("Account created");
      navigate({ to: "/dashboard" });
      return;
    }
    // Email confirmation is enabled: the account exists but is not signed in yet.
    setSignupNotice(
      "Account created. Check your inbox and click the confirmation link, then sign in.",
    );
  }

  async function handleForgot(values: ForgotPasswordValues) {
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (authError) {
      setError("Could not send the reset email. Please try again.");
      return;
    }
    toast.success("Password reset email sent", {
      description: "Check your inbox for the reset link.",
    });
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
            {mode !== "signup" && (
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="mb-6 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                Need an account? Create one — all new accounts get standard user
                access.
              </button>
            )}

            {signupNotice ? (
              <div className="text-center">
                <h1 className="text-xl font-semibold">Confirm your email</h1>
                <p className="mt-3 text-sm text-muted-foreground">{signupNotice}</p>
                <Button
                  className="mt-6 w-full"
                  onClick={() => {
                    setSignupNotice(null);
                    setMode("signin");
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : mode === "signin" ? (
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
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                    }}
                  >
                    Create account
                  </button>
                </div>
              </>
            ) : mode === "signup" ? (
              <>
                <h1 className="text-xl font-semibold">Create your account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  New accounts receive standard user privileges.
                </p>
                <SignUpForm busy={busy} onSubmit={handleSignUp} error={error} />
                <div className="mt-4 text-right text-xs">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                    }}
                  >
                    Already registered? Sign in
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold">Reset your password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your account email and we'll send you a reset link.
                </p>
                <ForgotPasswordForm busy={busy} onSubmit={handleForgot} error={error} />
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "password", string>>>({});

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          setFieldErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
          return;
        }
        setFieldErrors({});
        onSubmit(parsed.data);
      }}
    >
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

function SignUpForm({
  busy,
  onSubmit,
  error,
}: {
  busy: boolean;
  onSubmit: (values: SignUpValues) => void;
  error: string | null;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = signUpSchema.safeParse({ fullName, email, password, confirmPassword });
        if (!parsed.success) {
          setFieldErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
          return;
        }
        setFieldErrors({});
        onSubmit(parsed.data);
      }}
    >
      <div>
        <Label htmlFor="signup-name">Full name</Label>
        <Input
          id="signup-name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
        />
        <FieldError message={fieldErrors.fullName ?? null} />
      </div>
      <div>
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FieldError message={fieldErrors.email ?? null} />
      </div>
      <div>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FieldError message={fieldErrors.password ?? null} />
      </div>
      <div>
        <Label htmlFor="signup-confirm">Confirm password</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <FieldError message={fieldErrors.confirmPassword ?? null} />
      </div>
      <FieldError message={error} />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({
  busy,
  onSubmit,
  error,
}: {
  busy: boolean;
  onSubmit: (values: ForgotPasswordValues) => void;
  error: string | null;
}) {
  const [email, setEmail] = useState("");

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = forgotPasswordSchema.safeParse({ email });
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setError(null);
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

function setError(message: string) {
  console.warn(message);
}
