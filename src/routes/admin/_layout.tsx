import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireAdminRole } from "@/lib/admin.functions";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "ode_admin_sidebar_collapsed";

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

interface AdminNavItem {
  to: string;
  label: string;
  id?: string;
  exact?: boolean;
  icon: React.ReactNode;
}

const NAV_ITEMS: AdminNavItem[] = [
  {
    to: "/admin",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="admin-nav-icon"
      >
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: "/admin/outsoles",
    label: "Outsoles",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="admin-nav-icon"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    to: "/admin/taxonomy",
    label: "Taxonomy",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="admin-nav-icon"
      >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    to: "/admin/inquiries",
    label: "Inquiries",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="admin-nav-icon"
      >
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    to: "/admin/content",
    id: "admin-nav-content",
    label: "Site Content",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="admin-nav-icon"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: "/admin/gallery",
    id: "admin-nav-gallery",
    label: "Factory Gallery",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="admin-nav-icon"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
];

function AdminLayout() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore desktop collapsed preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {
      // Storage access blocked or unavailable
    }
  }, []);

  // Prevent background scrolling while mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined" || !mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  function handleToggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Storage access blocked or unavailable
      }
      return next;
    });
  }

  async function handleLogout() {
    if (typeof document !== "undefined") {
      document.cookie = "sb-access-token=; path=/; max-age=0; SameSite=Lax";
    }
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="admin-shell">
        <Toaster position="top-right" />

        {/* Mobile top header bar (visible below 768px) */}
        <header className="admin-mobile-header">
          <div className="admin-mobile-header-left">
            <button
              type="button"
              id="admin-mobile-menu-btn"
              className="admin-mobile-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-drawer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="admin-logo-brand">
              <span className="admin-logo-mark">ODE</span>
              <span className="admin-logo-text">Outsole by ODE</span>
            </div>
          </div>
        </header>

        {/* Mobile backdrop */}
        <div
          className={cn("admin-drawer-backdrop", mobileOpen && "admin-drawer-backdrop--open")}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Mobile slide-out drawer */}
        <div
          id="admin-mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Admin Navigation"
          className={cn("admin-drawer", mobileOpen && "admin-drawer--open")}
        >
          <div className="admin-drawer-header">
            <div className="admin-logo-brand">
              <span className="admin-logo-mark">ODE</span>
              <span className="admin-logo-text">Outsole by ODE</span>
            </div>
            <button
              type="button"
              className="admin-drawer-close-btn"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="admin-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                {...(item.id ? { id: `${item.id}-mobile` } : {})}
                className="admin-nav-link"
                activeOptions={{ exact: item.exact ?? false }}
                activeProps={{
                  className: "active admin-nav-link--active",
                  "data-status": "active" as const,
                }}
                onClick={() => setMobileOpen(false)}
              >
                {item.icon}
                <span className="admin-nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <button
              id="admin-mobile-logout-btn"
              className="admin-logout-btn"
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
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
              <span className="admin-logout-text">Sign out</span>
            </button>
          </div>
        </div>

        {/* Desktop Sidebar (hidden on mobile) */}
        <aside
          id="admin-desktop-sidebar"
          aria-label="Admin Sidebar"
          className={cn("admin-sidebar", isCollapsed && "admin-sidebar--collapsed")}
        >
          {isCollapsed ? (
            <div className="admin-logo">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="admin-logo-brand" tabIndex={0} aria-label="Outsole by ODE">
                    <span className="admin-logo-mark">ODE</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  Outsole by ODE
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    id="admin-sidebar-collapse-btn"
                    className="admin-sidebar-toggle"
                    onClick={handleToggleCollapse}
                    aria-label="Expand sidebar"
                    aria-expanded={false}
                    aria-controls="admin-desktop-sidebar"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  Expand sidebar
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="admin-logo">
              <div className="admin-logo-brand">
                <span className="admin-logo-mark">ODE</span>
                <span className="admin-logo-text">Outsole by ODE</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    id="admin-sidebar-collapse-btn"
                    className="admin-sidebar-toggle"
                    onClick={handleToggleCollapse}
                    aria-label="Collapse sidebar"
                    aria-expanded={true}
                    aria-controls="admin-desktop-sidebar"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  Collapse sidebar
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          <nav className="admin-nav">
            {NAV_ITEMS.map((item) =>
              isCollapsed ? (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      {...(item.id ? { id: item.id } : {})}
                      className="admin-nav-link"
                      aria-label={item.label}
                      activeOptions={{ exact: item.exact ?? false }}
                      activeProps={{
                        className: "active admin-nav-link--active",
                        "data-status": "active" as const,
                      }}
                    >
                      {item.icon}
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  {...(item.id ? { id: item.id } : {})}
                  className="admin-nav-link"
                  activeOptions={{ exact: item.exact ?? false }}
                  activeProps={{
                    className: "active admin-nav-link--active",
                    "data-status": "active" as const,
                  }}
                >
                  {item.icon}
                  <span className="admin-nav-label">{item.label}</span>
                </Link>
              ),
            )}
          </nav>

          <div className="admin-sidebar-footer">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    id="admin-logout-btn"
                    className="admin-logout-btn"
                    onClick={handleLogout}
                    aria-label="Sign out"
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
                    <span className="sr-only">Sign out</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  Sign out
                </TooltipContent>
              </Tooltip>
            ) : (
              <button id="admin-logout-btn" className="admin-logout-btn" onClick={handleLogout}>
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
                <span className="admin-logout-text">Sign out</span>
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </TooltipProvider>
  );
}
