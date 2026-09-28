import type { Database } from "@/integrations/supabase/types";

/**
 * Server-only authentication and authorization helpers for admin operations.
 * Validates the caller's JWT token (from Authorization header or sb-access-token cookie)
 * against Supabase Auth and checks role permissions in user_roles.
 */

export async function getAuthenticatedUserId(): Promise<string> {
  const { getRequest, getCookie } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    token = getCookie("sb-access-token") ?? null;
  }
  if (!token) {
    throw new Error("Unauthorized: No session token provided");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized: Invalid or expired session token");
  }

  return user.id;
}

export async function assertStaffRole(specificUserId?: string): Promise<{ userId: string; role: "admin" | "editor" }> {
  const userId = specificUserId || (await getAuthenticatedUserId());
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: roleRow, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !roleRow) {
    throw new Error("Forbidden: Staff authorization required");
  }

  return { userId, role: roleRow.role as "admin" | "editor" };
}

export async function assertAdminRole(specificUserId?: string): Promise<{ userId: string }> {
  const { userId, role } = await assertStaffRole(specificUserId);
  if (role !== "admin") {
    throw new Error("Forbidden: Administrator role required");
  }
  return { userId };
}
