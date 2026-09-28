import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { listAdminOutsoles, type AdminOutsoleListItem } from "@/lib/admin-outsoles.functions";

export const Route = createFileRoute("/admin/_layout/outsoles/")({
  loader: async () => {
    return await listAdminOutsoles();
  },
  component: AdminOutsolesListPage,
});

function AdminOutsolesListPage() {
  const { outsoles } = Route.useLoaderData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [samplingFilter, setSamplingFilter] = useState<string>("all");

  const filteredOutsoles = useMemo(() => {
    return outsoles.filter((item: AdminOutsoleListItem) => {
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
  }, [outsoles, search, statusFilter, featuredFilter, samplingFilter]);

  return (
    <div className="admin-page" style={{ maxWidth: "1200px" }}>
      <header className="admin-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
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

        <div style={{ fontSize: "0.75rem", color: "oklch(0.6 0.008 85)", fontFamily: "var(--font-mono, monospace)" }}>
          Showing {filteredOutsoles.length} of {outsoles.length} product{outsoles.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-table-card">
        {filteredOutsoles.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "oklch(0.55 0.008 85)" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>No products matched your criteria</p>
            <p style={{ margin: 0, fontSize: "0.75rem" }}>Try clearing search keywords or filter dropdowns.</p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-table" id="admin-outsoles-table">
              <thead>
                <tr>
                  <th style={{ width: "64px" }}>Image</th>
                  <th>Product & Slug</th>
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
                      <div style={{ fontWeight: 600, color: "oklch(0.94 0.008 85)", marginBottom: "2px" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "oklch(0.55 0.008 85)", fontFamily: "var(--font-mono, monospace)" }}>
                        /{item.slug}
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem", color: "oklch(0.78 0.155 71)" }}>
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
                        <span style={{ color: "oklch(0.45 0.004 285)", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge--${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.is_featured ? (
                        <span style={{ color: "oklch(0.78 0.155 71)", fontWeight: 600, fontSize: "0.75rem" }}>Yes</span>
                      ) : (
                        <span style={{ color: "oklch(0.45 0.004 285)", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      {item.is_sampling_available ? (
                        <span style={{ color: "oklch(0.7 0.15 150)", fontWeight: 600, fontSize: "0.75rem" }}>Available</span>
                      ) : (
                        <span style={{ color: "oklch(0.45 0.004 285)", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link
                        to={`/admin/outsoles`}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        style={{ marginRight: "0.5rem" }}
                        title="Edit product"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
