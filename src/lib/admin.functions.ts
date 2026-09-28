import { createServerFn } from "@tanstack/react-start";

/**
 * Grants the admin role to the first staff member who signs in while the
 * project has no staff at all. Every later account must be granted a role by an
 * existing admin.
 */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    const { getAuthenticatedUserId } = await import("./admin-auth.server");
    const userId = await getAuthenticatedUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true });

    if ((count ?? 0) > 0) return { granted: false };

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (error) return { granted: false };

    await supabaseAdmin
      .from("user_profiles")
      .upsert({ id: userId }, { onConflict: "id" });

    return { granted: true };
  });

/**
 * Server function: verifies the caller's JWT, then checks they have the
 * 'admin' role. Called from the admin layout beforeLoad guard.
 * Throws on any auth/authz failure so TanStack Router can redirect.
 */
export const requireAdminRole = createServerFn({ method: "GET" })
  .handler(async () => {
    const { assertAdminRole } = await import("./admin-auth.server");
    const { userId } = await assertAdminRole();
    return { userId };
  });
