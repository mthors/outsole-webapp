import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Package,
  Inbox,
  Tags,
  Plus,
  ArrowRight,
  RefreshCw,
  Layers,
  FileText,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";
import {
  getAdminDashboard,
  type AdminDashboardData,
  type RecentInquiryItem,
  type RecentProductItem,
} from "@/lib/admin-dashboard.functions";

export const Route = createFileRoute("/admin/_layout/")({
  loader: async () => {
    return await getAdminDashboard();
  },
  errorComponent: AdminDashboardError,
  component: AdminDashboard,
});

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function AdminDashboardError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard metrics.";

  return (
    <div className="admin-page" style={{ maxWidth: "1200px" }}>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <p className="admin-page-subtitle">Welcome to the ODE Outsole admin panel.</p>
      </header>

      <div
        style={{
          background: "var(--admin-danger-bg)",
          border: "1px solid var(--admin-danger-border)",
          borderRadius: "2px",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1rem",
        }}
      >
        <AlertTriangle size={36} style={{ color: "var(--admin-danger-text)" }} />
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--charcoal)", margin: "0 0 0.5rem" }}>
            Unable to Load Dashboard
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--muted-olive)", maxWidth: "480px", margin: 0 }}>
            {errorMessage}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            router.invalidate();
          }}
          className="admin-btn admin-btn-primary"
          style={{ marginTop: "0.5rem" }}
        >
          <RefreshCw size={14} />
          Retry Loading
        </button>
      </div>
    </div>
  );
}

function InquiryStatusBadge({ status }: { status: "pending" | "contacted" | "resolved" }) {
  const styles: Record<"pending" | "contacted" | "resolved", { bg: string; color: string; border: string; label: string }> = {
    pending: {
      bg: "var(--admin-status-pending-bg)",
      color: "var(--admin-status-pending-text)",
      border: "var(--admin-status-pending-border)",
      label: "Pending",
    },
    contacted: {
      bg: "var(--admin-status-contacted-bg)",
      color: "var(--admin-status-contacted-text)",
      border: "var(--admin-status-contacted-border)",
      label: "Contacted",
    },
    resolved: {
      bg: "var(--admin-status-resolved-bg)",
      color: "var(--admin-status-resolved-text)",
      border: "var(--admin-status-resolved-border)",
      label: "Resolved",
    },
  };

  const s = styles[status] ?? styles.pending;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.45rem",
        borderRadius: "2px",
        fontSize: "0.6875rem",
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {s.label}
    </span>
  );
}

function ProductStatusBadge({ status }: { status: "active" | "draft" | "archived" }) {
  const styles: Record<"active" | "draft" | "archived", { bg: string; color: string; border: string; label: string }> = {
    active: {
      bg: "var(--admin-status-active-bg)",
      color: "var(--admin-status-active-text)",
      border: "var(--admin-status-active-border)",
      label: "Active",
    },
    draft: {
      bg: "var(--admin-status-draft-bg)",
      color: "var(--admin-status-draft-text)",
      border: "var(--admin-status-draft-border)",
      label: "Draft",
    },
    archived: {
      bg: "var(--admin-status-archived-bg)",
      color: "var(--admin-status-archived-text)",
      border: "var(--admin-status-archived-border)",
      label: "Archived",
    },
  };

  const s = styles[status] ?? styles.draft;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.45rem",
        borderRadius: "2px",
        fontSize: "0.6875rem",
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {s.label}
    </span>
  );
}

function AdminDashboard() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await router.invalidate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const { products, inquiries, taxonomy, recentInquiries, recentProducts } = data;

  return (
    <div className="admin-page" style={{ maxWidth: "1200px" }}>
      {/* ── Page Header ── */}
      <header
        className="admin-page-header"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            Operational overview of products, sample inquiries, taxonomy, and system shortcuts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="admin-btn admin-btn-secondary"
          title="Refresh dashboard metrics"
        >
          <RefreshCw
            size={14}
            style={{
              animation: isRefreshing ? "admin-spin 0.75s linear infinite" : undefined,
            }}
          />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* ── Section: Product Overview ── */}
      <section style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.8125rem",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted-olive)",
              margin: 0,
            }}
          >
            Product Catalog
          </h2>
          <Link
            to="/admin/outsoles"
            style={{
              fontSize: "0.75rem",
              color: "var(--charcoal)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: 600,
            }}
          >
            Manage Products <ArrowRight size={12} />
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Total Products */}
          <Link
            to="/admin/outsoles"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "border-color 0.15s" }}
          >
            <div className="admin-stat-icon admin-stat-icon--products">
              <Package size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Total Products</span>
              <span className="admin-stat-value" id="metric-products-total">{products.total}</span>
            </div>
          </Link>

          {/* Active Products */}
          <Link
            to="/admin/outsoles"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(8, 59, 123, 0.12)",
                color: "var(--deep-blue)",
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Active (Public)</span>
              <span className="admin-stat-value" id="metric-products-active">{products.active}</span>
            </div>
          </Link>

          {/* Draft Products */}
          <Link
            to="/admin/outsoles"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(168, 108, 37, 0.14)",
                color: "var(--ochre)",
              }}
            >
              <Clock size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Draft Models</span>
              <span className="admin-stat-value" id="metric-products-draft">{products.draft}</span>
            </div>
          </Link>

          {/* Archived Products */}
          <Link
            to="/admin/outsoles"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(229, 222, 210, 0.6)",
                color: "var(--muted-olive)",
              }}
            >
              <Archive size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Archived</span>
              <span className="admin-stat-value" id="metric-products-archived">{products.archived}</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Section: Inquiry Overview ── */}
      <section style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.8125rem",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted-olive)",
              margin: 0,
            }}
          >
            Sample Inquiries
          </h2>
          <Link
            to="/admin/inquiries"
            style={{
              fontSize: "0.75rem",
              color: "var(--charcoal)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: 600,
            }}
          >
            View All Inquiries <ArrowRight size={12} />
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Total Inquiries */}
          <Link
            to="/admin/inquiries"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div className="admin-stat-icon admin-stat-icon--inquiries">
              <Inbox size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Total Inquiries</span>
              <span className="admin-stat-value" id="metric-inquiries-total">{inquiries.total}</span>
            </div>
          </Link>

          {/* Pending Inquiries */}
          <Link
            to="/admin/inquiries"
            search={{ status: "pending" }}
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(168, 108, 37, 0.14)",
                color: "var(--ochre)",
              }}
            >
              <Clock size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Pending Action</span>
              <span className="admin-stat-value" id="metric-inquiries-pending">{inquiries.pending}</span>
            </div>
          </Link>

          {/* Contacted Inquiries */}
          <Link
            to="/admin/inquiries"
            search={{ status: "contacted" }}
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(8, 59, 123, 0.1)",
                color: "var(--deep-blue)",
              }}
            >
              <Inbox size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Contacted</span>
              <span className="admin-stat-value" id="metric-inquiries-contacted">{inquiries.contacted}</span>
            </div>
          </Link>

          {/* Resolved Inquiries */}
          <Link
            to="/admin/inquiries"
            search={{ status: "resolved" }}
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "var(--admin-status-active-bg)",
                color: "var(--admin-status-active-text)",
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Resolved</span>
              <span className="admin-stat-value" id="metric-inquiries-resolved">{inquiries.resolved}</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Section: Taxonomy Metrics ── */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.8125rem",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted-olive)",
              margin: 0,
            }}
          >
            Taxonomy Structure
          </h2>
          <Link
            to="/admin/taxonomy"
            style={{
              fontSize: "0.75rem",
              color: "var(--charcoal)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontWeight: 600,
            }}
          >
            Manage Taxonomy <ArrowRight size={12} />
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Categories */}
          <Link
            to="/admin/taxonomy"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(8, 59, 123, 0.1)",
                color: "var(--deep-blue)",
              }}
            >
              <Tags size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Categories</span>
              <span className="admin-stat-value" id="metric-taxonomy-categories">{taxonomy.categories}</span>
            </div>
          </Link>

          {/* Materials */}
          <Link
            to="/admin/taxonomy"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(229, 222, 210, 0.6)",
                color: "var(--charcoal)",
              }}
            >
              <Layers size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Rubber Materials</span>
              <span className="admin-stat-value" id="metric-taxonomy-materials">{taxonomy.materials}</span>
            </div>
          </Link>

          {/* Traction Types */}
          <Link
            to="/admin/taxonomy"
            className="admin-stat-card"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
          >
            <div
              className="admin-stat-icon"
              style={{
                background: "rgba(119, 121, 107, 0.16)",
                color: "var(--muted-olive)",
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div className="admin-stat-body">
              <span className="admin-stat-label">Traction Types</span>
              <span className="admin-stat-value" id="metric-taxonomy-traction">{taxonomy.tractionTypes}</span>
            </div>
          </Link>
        </div>
      </section>

      {/* ── Section: Recent Activity (Two Columns) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2.5rem",
        }}
      >
        {/* Left: Recent Inquiries */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            boxShadow: "0 1px 2px rgba(41, 41, 37, 0.04)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--admin-card-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Inbox size={16} style={{ color: "var(--charcoal)" }} />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--charcoal)", margin: 0 }}>
                Recent Inquiries
              </h3>
            </div>
            <Link
              to="/admin/inquiries"
              style={{
                fontSize: "0.75rem",
                color: "var(--charcoal)",
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ flex: 1, padding: "0.5rem 0" }}>
            {recentInquiries.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted-olive)" }}>
                <Inbox size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.35 }} />
                <p style={{ margin: 0, fontSize: "0.8125rem" }}>No customer sample inquiries found.</p>
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recentInquiries.map((inq) => (
                  <li key={inq.id}>
                    <Link
                      to="/admin/inquiries"
                      search={{ inquiry: inq.id }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        padding: "0.75rem 1.25rem",
                        textDecoration: "none",
                        color: "inherit",
                        borderBottom: "1px solid var(--admin-card-border)",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--admin-hover-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.8125rem" }}>
                            {inq.client_name}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--muted-olive)" }}>
                            {inq.company_name}
                          </span>
                        </div>
                        <div style={{ marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {inq.product_name ? (
                            <span
                              style={{
                                fontSize: "0.6875rem",
                                fontFamily: "var(--font-mono, monospace)",
                                color: "var(--charcoal)",
                                background: "var(--sand)",
                                padding: "0.1rem 0.35rem",
                                borderRadius: "2px",
                              }}
                            >
                              {inq.product_model ? `${inq.product_model} · ` : ""}{inq.product_name}
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.6875rem", color: "var(--muted-olive)", fontStyle: "italic" }}>
                              General Inquiry
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", flexShrink: 0 }}>
                        <InquiryStatusBadge status={inq.status} />
                        <span style={{ fontSize: "0.6875rem", color: "var(--muted-olive)", fontFamily: "var(--font-mono, monospace)" }}>
                          {formatRelativeTime(inq.created_at)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Recently Updated Products */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            boxShadow: "0 1px 2px rgba(41, 41, 37, 0.04)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--admin-card-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Package size={16} style={{ color: "var(--charcoal)" }} />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--charcoal)", margin: 0 }}>
                Recently Updated Products
              </h3>
            </div>
            <Link
              to="/admin/outsoles"
              style={{
                fontSize: "0.75rem",
                color: "var(--charcoal)",
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              Manage Products <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ flex: 1, padding: "0.5rem 0" }}>
            {recentProducts.length === 0 ? (
              <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted-olive)" }}>
                <Package size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.35 }} />
                <p style={{ margin: 0, fontSize: "0.8125rem" }}>No outsole products found.</p>
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recentProducts.map((prod) => (
                  <li key={prod.id}>
                    <Link
                      to="/admin/outsoles/$id/edit"
                      params={{ id: prod.id }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        padding: "0.75rem 1.25rem",
                        textDecoration: "none",
                        color: "inherit",
                        borderBottom: "1px solid var(--admin-card-border)",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--admin-hover-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.8125rem" }}>
                            {prod.name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontFamily: "var(--font-mono, monospace)",
                              color: "var(--muted-olive)",
                            }}
                          >
                            {prod.model_number}
                          </span>
                        </div>
                        <div style={{ marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {prod.is_featured && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.2rem",
                                fontSize: "0.6875rem",
                                color: "var(--ochre)",
                                background: "rgba(168, 108, 37, 0.14)",
                                border: "1px solid rgba(168, 108, 37, 0.35)",
                                padding: "0.05rem 0.35rem",
                                borderRadius: "2px",
                              }}
                            >
                              <Sparkles size={10} />
                              Featured
                            </span>
                          )}
                          <span style={{ fontSize: "0.6875rem", color: "var(--muted-olive)", fontFamily: "var(--font-mono, monospace)" }}>
                            Updated {formatRelativeTime(prod.updated_at)}
                          </span>
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        <ProductStatusBadge status={prod.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: Quick Actions ── */}
      <section>
        <div style={{ marginBottom: "0.875rem" }}>
          <h2
            style={{
              fontSize: "0.8125rem",
              fontFamily: "var(--font-mono, monospace)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted-olive)",
              margin: 0,
            }}
          >
            Quick Actions
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Add Product */}
          <Link
            to="/admin/outsoles/new"
            id="quick-action-add-product"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1.25rem",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              boxShadow: "0 1px 2px rgba(41, 41, 37, 0.04)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s, transform 0.1s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--charcoal)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(41, 41, 37, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(41, 41, 37, 0.04)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "2px",
                  background: "rgba(8, 59, 123, 0.12)",
                  color: "var(--deep-blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus size={18} />
              </div>
              <ArrowRight size={14} style={{ color: "var(--muted-olive)" }} />
            </div>
            <div style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.875rem" }}>
              Add Product
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)", lineHeight: 1.4 }}>
              Create a new outsole model and configure technical specifications.
            </div>
          </Link>

          {/* Manage Products */}
          <Link
            to="/admin/outsoles"
            id="quick-action-manage-products"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1.25rem",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              boxShadow: "0 1px 2px rgba(41, 41, 37, 0.04)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--charcoal)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(41, 41, 37, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(41, 41, 37, 0.04)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "2px",
                  background: "rgba(229, 222, 210, 0.6)",
                  color: "var(--charcoal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Package size={18} />
              </div>
              <ArrowRight size={14} style={{ color: "var(--muted-olive)" }} />
            </div>
            <div style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.875rem" }}>
              Manage Products
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)", lineHeight: 1.4 }}>
              Browse, filter, edit specs, and archive outsole products.
            </div>
          </Link>

          {/* View Inquiries */}
          <Link
            to="/admin/inquiries"
            id="quick-action-view-inquiries"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1.25rem",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              boxShadow: "0 1px 2px rgba(41, 41, 37, 0.04)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--charcoal)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(41, 41, 37, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(41, 41, 37, 0.04)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "2px",
                  background: "rgba(119, 121, 107, 0.16)",
                  color: "var(--muted-olive)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Inbox size={18} />
              </div>
              <ArrowRight size={14} style={{ color: "var(--muted-olive)" }} />
            </div>
            <div style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.875rem" }}>
              View Inquiries
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)", lineHeight: 1.4 }}>
              Review customer sample requests and manage communication workflow.
            </div>
          </Link>

          {/* Manage Taxonomy */}
          <Link
            to="/admin/taxonomy"
            id="quick-action-manage-taxonomy"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1.25rem",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              boxShadow: "0 1px 2px rgba(41, 41, 37, 0.04)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--charcoal)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(41, 41, 37, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(41, 41, 37, 0.04)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "2px",
                  background: "rgba(119, 121, 107, 0.16)",
                  color: "var(--charcoal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Tags size={18} />
              </div>
              <ArrowRight size={14} style={{ color: "var(--muted-olive)" }} />
            </div>
            <div style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.875rem" }}>
              Manage Taxonomy
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)", lineHeight: 1.4 }}>
              Organize categories, rubber materials, and traction pattern types.
            </div>
          </Link>

          {/* Edit Site Content */}
          <Link
            to="/admin/content"
            id="quick-action-edit-content"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1.25rem",
              background: "#FFFFFF",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              boxShadow: "0 1px 2px rgba(41, 41, 37, 0.04)",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--charcoal)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(41, 41, 37, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "0 1px 2px rgba(41, 41, 37, 0.04)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "2px",
                  background: "rgba(229, 222, 210, 0.6)",
                  color: "var(--charcoal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FileText size={18} />
              </div>
              <ArrowRight size={14} style={{ color: "var(--muted-olive)" }} />
            </div>
            <div style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.875rem" }}>
              Edit Site Content
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)", lineHeight: 1.4 }}>
              Update copy on public homepage, capabilities, factory about, and contact.
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
