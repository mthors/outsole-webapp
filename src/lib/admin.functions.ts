import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

async function getAuthenticatedUserId(): Promise<string> {
  const { getRequest, getCookie } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    token = getCookie("sb-access-token") ?? null;
  }
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    throw new Error("Unauthorized: Invalid token");
  }

  return user.id;
}

/**
 * Grants the admin role to the first staff member who signs in while the
 * project has no staff at all. Every later account must be granted a role by an
 * existing admin.
 */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
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
    const userId = await getAuthenticatedUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "admin");

    if ((count ?? 0) === 0) {
      throw new Error("Forbidden: admin role required");
    }

    return { userId };
  });
