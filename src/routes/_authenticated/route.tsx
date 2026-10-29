import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Integration-managed authenticated gate: client-only (ssr: false) because the
 * session lives in browser storage. Children need no per-route auth code.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
