import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/_layout")({
  /**
   * beforeLoad enforces server-side and client-side admin authorization.
   * On SSR, it verifies the session cookie/token via requireAdminRole.
   * On client navigation, it calls the RPC bridge.
   * If not authenticated or not an admin, redirects to /admin/login.
   */
  beforeLoad: async () => {
    try {
      await requireAdminRole();
    } catch {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    if (typeof document !== "undefined") {
      document.cookie = "sb-access-token=; path=/; max-age=0; SameSite=Lax";
    }
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-logo-mark">OW</span>
          <span className="admin-logo-text">Outsole Works</span>
        </div>
        <nav className="admin-nav">
          <Link
            to="/admin"
            className="admin-nav-link"
            activeOptions={{ exact: true }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <button
            id="admin-logout-btn"
            className="admin-logout-btn"
            onClick={handleLogout}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
