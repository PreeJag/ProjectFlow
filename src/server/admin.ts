import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AssignableRole } from "@/lib/permissions";

const PERMANENT_BAN = "876000h"; // ~100 years

/** Deactivating an account bans it at the auth level; activation lifts the ban. */
export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; isActive: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdminRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Could not verify your role");
    if (!isAdminRole) throw new Error("Forbidden: administrator privileges required");

    if (data.userId === userId) {
      throw new Error("You cannot deactivate your own account");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: authError } = await supabase.auth.admin.updateUserById(data.userId, {
      ban_duration: data.isActive ? "none" : PERMANENT_BAN,
    });
    if (authError) throw new Error("Could not update the account state");

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.isActive })
      .eq("id", data.userId);
    if (profileError) throw new Error("Could not update the account state");

    return { ok: true as const };
  });

/**
 * Administrators may assign Project Owner or Standard User. Administrator
 * accounts are out of scope for this endpoint and are never modified here.
 */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: AssignableRole }) => input)
  .handler(async ({ data, context }) => {
    if (data.role !== "project_owner" && data.role !== "user") {
      throw new Error("Role must be project_owner or user");
    }
    const { supabase, userId } = context;

    const { data: isAdminRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Could not verify your role");
    if (!isAdminRole) throw new Error("Forbidden: administrator privileges required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Administrator accounts keep their role: the directory never downgrades them.
    const { data: targetRoles, error: targetError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    if (targetError) throw new Error("Could not load the user's roles");
    if ((targetRoles ?? []).some((row) => row.role === "admin")) {
      throw new Error("Administrator accounts cannot be changed from the user directory");
    }

    // Replace the assignable roles with exactly the chosen one.
    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .in("role", ["user", "project_owner"]);
    if (deleteError) throw new Error("Could not update the user's role");

    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: data.userId, role: data.role },
        { onConflict: "user_id,role" },
      );
    if (insertError) throw new Error("Could not update the user's role");

    return { ok: true as const };
  });
