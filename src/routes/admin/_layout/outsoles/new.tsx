import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { getAdminTaxonomy, createAdminOutsole, type CreateOutsoleInput } from "@/lib/admin-outsoles.functions";
import { slugify } from "@/lib/catalog-types";

export const Route = createFileRoute("/admin/_layout/outsoles/new")({
  loader: async () => {
    return await getAdminTaxonomy();
  },
  component: AdminCreateOutsolePage,
});

function AdminCreateOutsolePage() {
  const { taxonomy } = Route.useLoaderData();
  const navigate = useNavigate();

  const [form, setForm] = useState<CreateOutsoleInput>({
    name: "",
    slug: "",
    model_number: "",
    description: "",
    status: "draft",
    is_featured: false,
    is_sampling_available: false,
    shore_min: null,
    shore_max: null,
    shore_scale: "A",
    din_abrasion_mm3: null,
    weight_grams: null,
    category_ids: [],
    material_ids: [],
    traction_type_ids: [],
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNameChange(name: string) {
    setForm((prev) => {
      // Auto-generate slug if it was empty or matched previous auto-generated slug
      const prevAutoSlug = slugify(prev.name);
      const shouldUpdateSlug = !prev.slug || prev.slug === prevAutoSlug;
      return {
        ...prev,
        name,
        slug: shouldUpdateSlug ? slugify(name) : prev.slug,
      };
    });
  }

  function toggleCheckboxItem(listKey: "category_ids" | "material_ids" | "traction_type_ids", id: string) {
    setForm((prev) => {
      const currentList = prev[listKey] || [];
      const updated = currentList.includes(id)
        ? currentList.filter((item) => item !== id)
        : [...currentList, id];
      return { ...prev, [listKey]: updated };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side quick checks
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug is required.");
      return;
    }
    if (!form.model_number.trim()) {
      setError("Model number / SKU is required.");
      return;
    }
    if (form.shore_min != null && form.shore_max != null && form.shore_min > form.shore_max) {
      setError("Shore hardness minimum cannot exceed maximum.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateOutsoleInput = {
        ...form,
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        model_number: form.model_number.trim().toUpperCase(),
        description: form.description?.trim() || null,
        shore_min: form.shore_min ? Number(form.shore_min) : null,
        shore_max: form.shore_max ? Number(form.shore_max) : null,
        din_abrasion_mm3: form.din_abrasion_mm3 ? Number(form.din_abrasion_mm3) : null,
        weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
      };

      const result = await createAdminOutsole({ data: payload });
      if (result.success) {
        setSuccess(`Product "${result.name}" created successfully! Redirecting...`);
        setTimeout(() => {
          navigate({ to: "/admin/outsoles" });
        }, 800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: "900px" }}>
      <header className="admin-page-header">
        <div style={{ marginBottom: "0.5rem" }}>
          <Link
            to="/admin/outsoles"
            style={{
              fontSize: "0.75rem",
              color: "var(--muted-olive)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              textDecoration: "none",
            }}
          >
            ← Back to Outsoles
          </Link>
        </div>
        <h1 className="admin-page-title">Create Outsole Product</h1>
        <p className="admin-page-subtitle">Add a new outsole model to the catalog and define technical specs.</p>
      </header>

      {error && (
        <div className="admin-login-error" style={{ marginBottom: "1.5rem" }} role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            background: "var(--admin-status-active-bg)",
            border: "1px solid var(--admin-status-active-border)",
            borderRadius: "2px",
            color: "var(--admin-status-active-text)",
            fontSize: "0.8125rem",
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form-container" noValidate>
        {/* Basic Information */}
        <div className="admin-form-section">
          <h2 className="admin-form-section-title">Basic Information</h2>
          <p className="admin-form-section-desc">Identifier, name, and public visibility settings.</p>

          <div className="admin-form-grid-2" style={{ marginBottom: "1rem" }}>
            <div className="admin-field">
              <label htmlFor="outsole-name" className="admin-field-label">
                Product Name <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <input
                id="outsole-name"
                type="text"
                required
                className="admin-field-input"
                placeholder="e.g. Trail Grip X1"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="outsole-sku" className="admin-field-label">
                Model Number / SKU <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <input
                id="outsole-sku"
                type="text"
                required
                className="admin-field-input"
                placeholder="e.g. TG-X1-001"
                value={form.model_number}
                onChange={(e) => setForm((prev) => ({ ...prev, model_number: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="admin-form-grid-2" style={{ marginBottom: "1rem" }}>
            <div className="admin-field">
              <label htmlFor="outsole-slug" className="admin-field-label">
                URL Slug <span style={{ color: "var(--destructive)" }}>*</span>
              </label>
              <input
                id="outsole-slug"
                type="text"
                required
                className="admin-field-input"
                placeholder="e.g. trail-grip-x1"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="outsole-status" className="admin-field-label">
                Status
              </label>
              <select
                id="outsole-status"
                className="admin-select"
                style={{ width: "100%", padding: "0.625rem 0.75rem" }}
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value as "draft" | "active" | "archived" }))
                }
                disabled={isSubmitting}
              >
                <option value="draft">Draft (Hidden from public catalog)</option>
                <option value="active">Active (Visible in public catalog)</option>
                <option value="archived">Archived (Retired model)</option>
              </select>
            </div>
          </div>

          <div className="admin-field" style={{ marginBottom: "1rem" }}>
            <label htmlFor="outsole-desc" className="admin-field-label">
              Description
            </label>
            <textarea
              id="outsole-desc"
              className="admin-textarea"
              placeholder="Detailed description of performance, construction, and design highlights..."
              value={form.description ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            <label className="admin-checkbox-label">
              <input
                id="outsole-featured"
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
                disabled={isSubmitting}
              />
              <span>Featured Showcase Product</span>
            </label>

            <label className="admin-checkbox-label">
              <input
                id="outsole-sampling"
                type="checkbox"
                checked={form.is_sampling_available}
                onChange={(e) => setForm((prev) => ({ ...prev, is_sampling_available: e.target.checked }))}
                disabled={isSubmitting}
              />
              <span>Physical Sample Available</span>
            </label>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="admin-form-section">
          <h2 className="admin-form-section-title">Technical Specifications</h2>
          <p className="admin-form-section-desc">Material hardness, wear resistance, and weight metrics.</p>

          <div className="admin-form-grid-3" style={{ marginBottom: "1rem" }}>
            <div className="admin-field">
              <label htmlFor="outsole-shore-min" className="admin-field-label">
                Shore Min
              </label>
              <input
                id="outsole-shore-min"
                type="number"
                min="1"
                max="100"
                className="admin-field-input"
                placeholder="e.g. 60"
                value={form.shore_min ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shore_min: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="outsole-shore-max" className="admin-field-label">
                Shore Max
              </label>
              <input
                id="outsole-shore-max"
                type="number"
                min="1"
                max="100"
                className="admin-field-input"
                placeholder="e.g. 65"
                value={form.shore_max ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shore_max: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="outsole-shore-scale" className="admin-field-label">
                Shore Scale
              </label>
              <input
                id="outsole-shore-scale"
                type="text"
                maxLength={5}
                className="admin-field-input"
                placeholder="A"
                value={form.shore_scale}
                onChange={(e) => setForm((prev) => ({ ...prev, shore_scale: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="admin-form-grid-2">
            <div className="admin-field">
              <label htmlFor="outsole-din" className="admin-field-label">
                DIN Abrasion (mm³)
              </label>
              <input
                id="outsole-din"
                type="number"
                step="0.1"
                min="0"
                className="admin-field-input"
                placeholder="e.g. 110"
                value={form.din_abrasion_mm3 ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    din_abrasion_mm3: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="outsole-weight" className="admin-field-label">
                Weight (grams)
              </label>
              <input
                id="outsole-weight"
                type="number"
                min="1"
                className="admin-field-input"
                placeholder="e.g. 320"
                value={form.weight_grams ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    weight_grams: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Taxonomy Associations */}
        <div className="admin-form-section">
          <h2 className="admin-form-section-title">Taxonomy & Classifications</h2>
          <p className="admin-form-section-desc">Associate categories, compound materials, and lug traction profiles.</p>

          {/* Categories */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label className="admin-field-label" style={{ marginBottom: "0.5rem", display: "block" }}>
              Categories
            </label>
            <div className="admin-checkbox-group">
              {taxonomy.categories.map((cat) => (
                <label key={cat.id} className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.category_ids.includes(cat.id)}
                    onChange={() => toggleCheckboxItem("category_ids", cat.id)}
                    disabled={isSubmitting}
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Materials */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label className="admin-field-label" style={{ marginBottom: "0.5rem", display: "block" }}>
              Materials / Rubber Compounds
            </label>
            <div className="admin-checkbox-group">
              {taxonomy.materials.map((mat) => (
                <label key={mat.id} className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.material_ids.includes(mat.id)}
                    onChange={() => toggleCheckboxItem("material_ids", mat.id)}
                    disabled={isSubmitting}
                  />
                  <span>{mat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Traction Types */}
          <div>
            <label className="admin-field-label" style={{ marginBottom: "0.5rem", display: "block" }}>
              Traction Profiles
            </label>
            <div className="admin-checkbox-group">
              {taxonomy.tractionTypes.map((trac) => (
                <label key={trac.id} className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.traction_type_ids.includes(trac.id)}
                    onChange={() => toggleCheckboxItem("traction_type_ids", trac.id)}
                    disabled={isSubmitting}
                  />
                  <span>{trac.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "1rem" }}>
          <Link to="/admin/outsoles" className="admin-btn admin-btn-secondary" disabled={isSubmitting}>
            Cancel
          </Link>
          <button
            id="admin-submit-outsole-btn"
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="admin-login-spinner" style={{ width: "14px", height: "14px" }} />
                <span>Creating Product…</span>
              </>
            ) : (
              "Save Product"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
