import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  listAdminOutsoles,
  archiveAdminOutsole,
  type AdminOutsoleListItem,
} from "@/lib/admin-outsoles.functions";

export const Route = createFileRoute("/admin/_layout/outsoles/")({
  loader: async () => {
    return await listAdminOutsoles();
  },
  component: AdminOutsolesListPage,
});

// ── Archive confirmation dialog (no external deps beyond the design system) ──
interface ArchiveDialogProps {
  item: AdminOutsoleListItem;
  onClose: () => void;
  onArchived: (id: string) => void;
}

function ArchiveDialog({ item, onClose, onArchived }: ArchiveDialogProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleArchive() {
    setIsArchiving(true);
    setError(null);
    try {
      const result = await archiveAdminOutsole({ data: { id: item.id } });
      if (result.success) {
        onArchived(item.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Archive failed. Please try again.");
      setIsArchiving(false);
    }
  }

  return (
    // Backdrop
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(41, 41, 37, 0.45)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isArchiving) onClose();
      }}
    >
      {/* Dialog panel */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="archive-dialog-title"
        aria-describedby="archive-dialog-desc"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "1.75rem 2rem",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 24px 64px rgba(41, 41, 37, 0.12)",
        }}
      >
        {/* Icon + Title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              flexShrink: 0,
              width: "40px",
              height: "40px",
              borderRadius: "2px",
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--admin-danger-text)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8v13H3V8" />
              <path d="M1 3h22v5H1z" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>
          <div>
            <h2
              id="archive-dialog-title"
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--charcoal)",
              }}
            >
              Archive {item.name}?
            </h2>
            <p style={{ margin: 0, fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", color: "var(--muted-olive)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {item.model_number} · {item.slug}
            </p>
          </div>
        </div>

        {/* Description */}
        <p
          id="archive-dialog-desc"
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.875rem",
            lineHeight: "1.6",
            color: "var(--charcoal)",
          }}
        >
          This will remove <strong style={{ color: "var(--charcoal)" }}>{item.name}</strong> from
          the public active catalog. The product, its data, and all associated images will remain
          fully intact and manageable through the admin panel.
        </p>
        <p
          style={{
            margin: "0 0 1.5rem",
            padding: "0.625rem 0.875rem",
            fontSize: "0.8125rem",
            lineHeight: "1.5",
            color: "var(--charcoal)",
            background: "var(--sand)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
          }}
        >
          ℹ This is not a permanent deletion. If you need to restore this product to the public catalog, you can change its status back to <strong>Active</strong> using the Edit Product page.
        </p>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 0.75rem",
              marginBottom: "1rem",
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              borderRadius: "2px",
              fontSize: "0.8125rem",
              color: "var(--admin-danger-text)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            id="archive-dialog-cancel-btn"
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isArchiving}
          >
            Cancel
          </button>
          <button
            id="archive-dialog-confirm-btn"
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "2px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              border: "none",
              background: "var(--destructive)",
              color: "var(--destructive-foreground)",
              cursor: isArchiving ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              opacity: isArchiving ? 0.7 : 1,
            }}
          >
            {isArchiving ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(245, 242, 236, 0.3)",
                    borderTopColor: "var(--warm-ivory)",
                    borderRadius: "50%",
                    animation: "admin-spin 0.65s linear infinite",
                  }}
                />
                <span>Archiving…</span>
              </>
            ) : (
              "Archive Product"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page component ──
function AdminOutsolesListPage() {
  const { outsoles: initialOutsoles } = Route.useLoaderData();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [samplingFilter, setSamplingFilter] = useState<string>("all");

  const [archiveTarget, setArchiveTarget] = useState<AdminOutsoleListItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredOutsoles = useMemo(() => {
    return initialOutsoles.filter((item: AdminOutsoleListItem) => {
      // Search filter (name or model number)
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesModel = item.model_number.toLowerCase().includes(query);
        const matchesSlug = item.slug.toLowerCase().includes(query);
        if (!matchesName && !matchesModel && !matchesSlug) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Featured filter
      if (featuredFilter === "featured" && !item.is_featured) return false;
      if (featuredFilter === "standard" && item.is_featured) return false;

      // Sampling filter
      if (samplingFilter === "available" && !item.is_sampling_available) return false;
      if (samplingFilter === "unavailable" && item.is_sampling_available) return false;

      return true;
    });
  }, [initialOutsoles, search, statusFilter, featuredFilter, samplingFilter]);

  async function handleArchived(id: string) {
    const name = archiveTarget?.name ?? "Product";
    setArchiveTarget(null);
    setSuccessMessage(`"${name}" has been archived and removed from the public catalog.`);
    // Invalidate and reload list from server
    await router.invalidate();
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  return (
    <div className="admin-page" style={{ maxWidth: "1200px" }}>
      <header
        className="admin-page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}
      >
        <div>
          <h1 className="admin-page-title">Outsole Catalog</h1>
          <p className="admin-page-subtitle">
            Manage outsole products, technical specifications, and taxonomy associations.
          </p>
        </div>
        <Link to="/admin/outsoles/new" className="admin-btn admin-btn-primary" id="admin-create-outsole-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Product
        </Link>
      </header>

      {/* Success feedback */}
      {successMessage && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            background: "var(--admin-status-active-bg)",
            border: "1px solid var(--admin-status-active-border)",
            borderRadius: "2px",
            color: "var(--admin-status-active-text)",
            fontSize: "0.8125rem",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-group">
          <input
            id="admin-outsole-search"
            type="search"
            className="admin-search-input"
            placeholder="Search name, SKU, slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            id="admin-status-filter"
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            id="admin-featured-filter"
            className="admin-select"
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value)}
          >
            <option value="all">All Showcase</option>
            <option value="featured">Featured Only</option>
            <option value="standard">Standard Only</option>
          </select>

          <select
            id="admin-sampling-filter"
            className="admin-select"
            value={samplingFilter}
            onChange={(e) => setSamplingFilter(e.target.value)}
          >
            <option value="all">All Sampling</option>
            <option value="available">Sampling Available</option>
            <option value="unavailable">No Samples</option>
          </select>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)", fontFamily: "var(--font-mono, monospace)" }}>
          Showing {filteredOutsoles.length} of {initialOutsoles.length} product{initialOutsoles.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-table-card">
        {filteredOutsoles.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted-olive)" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>No products matched your criteria</p>
            <p style={{ margin: 0, fontSize: "0.75rem" }}>Try clearing search keywords or filter dropdowns.</p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-table" id="admin-outsoles-table">
              <thead>
                <tr>
                  <th style={{ width: "64px" }}>Image</th>
                  <th>Product &amp; Slug</th>
                  <th>SKU / Model</th>
                  <th>Categories</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Sampling</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutsoles.map((item) => (
                  <tr key={item.id} id={`outsole-row-${item.slug}`}>
                    <td>
                      {item.primaryImageUrl ? (
                        <img
                          src={item.primaryImageUrl}
                          alt={item.primaryImageAlt ?? item.name}
                          className="admin-table-thumb"
                        />
                      ) : (
                        <div className="admin-table-thumb">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--charcoal)", marginBottom: "2px" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted-olive)", fontFamily: "var(--font-mono, monospace)" }}>
                        /{item.slug}
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem", color: "var(--charcoal)", fontWeight: 500 }}>
                      {item.model_number}
                    </td>
                    <td>
                      {item.categories.length > 0 ? (
                        item.categories.map((c) => (
                          <span key={c.id} className="admin-pill-tag">
                            {c.name}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--muted-olive)", opacity: 0.6, fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.is_featured ? (
                        <span style={{ color: "var(--charcoal)", fontWeight: 600, fontSize: "0.75rem" }}>Yes</span>
                      ) : (
                        <span style={{ color: "var(--muted-olive)", opacity: 0.6, fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      {item.is_sampling_available ? (
                        <span style={{ color: "var(--admin-status-active-text)", fontWeight: 600, fontSize: "0.75rem" }}>Available</span>
                      ) : (
                        <span style={{ color: "var(--muted-olive)", opacity: 0.6, fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link
                        to="/admin/outsoles/$id/edit"
                        params={{ id: item.id }}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        style={{ marginRight: "0.5rem" }}
                        title="Edit product"
                      >
                        Edit
                      </Link>
                      {item.status !== "archived" && (
                        <button
                          id={`archive-btn-${item.slug}`}
                          type="button"
                          className="admin-btn admin-btn-sm"
                          style={{
                            background: "rgba(180, 162, 140, 0.15)",
                            color: "var(--charcoal)",
                            border: "1px solid var(--border)",
                          }}
                          title="Archive product"
                          onClick={() => setArchiveTarget(item)}
                        >
                          Archive
                        </button>
                      )}
                      {item.status === "archived" && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "0.35rem 0.65rem",
                            fontSize: "0.7rem",
                            fontFamily: "var(--font-mono, monospace)",
                            color: "var(--muted-olive)",
                            letterSpacing: "0.04em",
                          }}
                          title="Already archived"
                        >
                          archived
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Archive confirmation dialog */}
      {archiveTarget && (
        <ArchiveDialog
          item={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onArchived={handleArchived}
        />
      )}
    </div>
  );
}
