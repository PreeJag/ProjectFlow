import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProfileSummary = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  is_active: boolean;
};

export type CurrentUser = {
  profile: ProfileSummary | null;
  roles: string[];
};

export type AdminOverview = {
  users: (ProfileSummary & { roles: string[] })[];
  setupCompleted: boolean;
  setupCompletedAt: string | null;
};

/** Profile and roles for the signed-in user. RLS scopes every read to the caller. */
export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CurrentUser> => {
    const { supabase, userId } = context;
    const [profileResult, rolesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, created_at, is_active")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (profileResult.error) {
      throw new Error("Could not load your profile");
    }
    return {
      profile: profileResult.data,
      roles: (rolesResult.data ?? []).map((row) => row.role),
    };
  });

/**
 * Users may edit only their own display name. Roles are deliberately not
 * editable here — they live in user_roles with no client-granted writes.
 */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fullName: string }) => input)
  .handler(async ({ data, context }) => {
    const fullName = (data.fullName ?? "").trim();
    if (!fullName) {
      throw new Error("Full name cannot be empty");
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", context.userId);
    if (error) {
      throw new Error("Could not update your profile");
    }
    return { ok: true as const };
  });

/** Administrator-only global overview. Verifies the caller's role server-side. */
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { supabase, userId } = context;

    const { data: isAdminRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) {
      throw new Error("Could not verify your role");
    }
    if (!isAdminRole) {
      throw new Error("Forbidden: administrator privileges required");
    }

    // Privileged read, loaded only after the role check passed.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profiles, roles, setup] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, created_at, is_active")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin
        .from("admin_setup_state")
        .select("completed, completed_at")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    if (profiles.error || roles.error) {
      throw new Error("Could not load the user directory");
    }

    const rolesByUser = new Map<string, string[]>();
    for (const row of roles.data ?? []) {
      const list = rolesByUser.get(row.user_id) ?? [];
      list.push(row.role);
      rolesByUser.set(row.user_id, list);
    }

    return {
      users: (profiles.data ?? []).map((user) => ({
        ...user,
        roles: rolesByUser.get(user.id) ?? [],
      })),
      setupCompleted: setup.data?.completed ?? false,
      setupCompletedAt: setup.data?.completed_at ?? null,
    };
  });
