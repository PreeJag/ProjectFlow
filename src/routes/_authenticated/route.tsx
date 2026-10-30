import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { getToken, api } from "@/lib/api";

/**
 * Authenticated gate backed by the Express JWT stored in localStorage.
 * Children need no per-route auth code.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!getToken()) {
      throw redirect({ to: "/auth" });
    }

    // Force first-login password change before reaching any dashboard page.
    const isChangePasswordPage = window.location.pathname === "/change-password";
    try {
      const data = await api<{ user: any }>("/auth/me");
      if (data.user.mustChangePassword && !isChangePasswordPage) {
        throw redirect({ to: "/change-password" });
      }
    } catch {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
