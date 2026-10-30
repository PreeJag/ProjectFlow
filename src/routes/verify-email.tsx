import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify Email — ProjectFlow" },
      {
        name: "description",
        content: "Verifying your email address for ProjectFlow.",
      },
      { property: "og:title", content: "Verify Email — ProjectFlow" },
      {
        property: "og:description",
        content: "Verifying your email address for ProjectFlow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function verifyEmail() {
      const searchParams = new URLSearchParams(window.location.search);
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (error) {
        setStatus("error");
        setErrorMessage(errorDescription || error);
        return;
      }

      if (!accessToken || !refreshToken) {
        setStatus("error");
        setErrorMessage("Invalid verification link. Missing tokens.");
        return;
      }

      try {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setStatus("error");
          setErrorMessage(sessionError.message || "Failed to verify email.");
          return;
        }

        if (data.session) {
          setStatus("success");
          setTimeout(() => {
            navigate({ to: "/dashboard" });
          }, 2000);
        } else {
          setStatus("error");
          setErrorMessage("Failed to establish session after verification.");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    }

    verifyEmail();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        {status === "loading" && (
          <div className="text-center">
            <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h1 className="text-2xl font-bold">Verifying your email...</h1>
            <p className="mt-2 text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg
                className="size-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600">Email Verified!</h1>
            <p className="mt-2 text-muted-foreground">
              Your email has been successfully verified. Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg
                className="size-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600">Verification Failed</h1>
            <p className="mt-2 text-muted-foreground">{errorMessage}</p>
            <div className="mt-6 space-y-3">
              <Button onClick={() => navigate({ to: "/auth" } as any)} className="w-full">
                Go to Sign In
              </Button>
              <p className="text-sm text-muted-foreground">
                If the link has expired, please request a new verification email.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
