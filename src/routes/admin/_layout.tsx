import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminRole } from "@/lib/admin.functions";
import { Toaster } from "@/components/ui/sonner";

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
      <Toaster position="top-right" />
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
          <Link
            to="/admin/outsoles"
            className="admin-nav-link"
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            Outsoles
          </Link>
          <Link
            to="/admin/taxonomy"
            className="admin-nav-link"
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
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Taxonomy
          </Link>
          <Link
            to="/admin/inquiries"
            className="admin-nav-link"
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Inquiries
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
