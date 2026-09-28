import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getAdminOutsole,
  getAdminTaxonomy,
  updateAdminOutsole,
  type UpdateOutsoleInput,
  type AdminOutsoleDetail,
} from "@/lib/admin-outsoles.functions";
import type { Taxonomy, TaxonomyTerm } from "@/lib/catalog-types";

export const Route = createFileRoute("/admin/_layout/outsoles/$id/edit")({
  loader: async ({ params }) => {
    try {
      const [{ outsole }, { taxonomy }] = await Promise.all([
        getAdminOutsole({ data: { id: params.id } }),
        getAdminTaxonomy(),
      ]);
      return {
        outsole: outsole as AdminOutsoleDetail | null,
        taxonomy: taxonomy as Taxonomy,
        notFound: false as const,
        loadError: null,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load product";
      const emptyTaxonomy: Taxonomy = { categories: [], materials: [], tractionTypes: [] };
      return {
        outsole: null as AdminOutsoleDetail | null,
        taxonomy: emptyTaxonomy,
        notFound: true as const,
        loadError: msg,
      };
    }
  },
  component: AdminEditOutsolePage,
});

function AdminEditOutsolePage() {
  const { outsole, taxonomy, notFound, loadError } = Route.useLoaderData();
  const router = useRouter();

  if (notFound || !outsole) {
    return (
      <div className="admin-page" style={{ maxWidth: "800px" }}>
        <header className="admin-page-header">
          <div style={{ marginBottom: "0.5rem" }}>
            <Link
              to="/admin/outsoles"
              style={{
                fontSize: "0.75rem",
                color: "oklch(0.65 0.008 85)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                textDecoration: "none",
              }}
            >
              ← Back to Outsoles
            </Link>
          </div>
          <h1 className="admin-page-title">Product Not Found</h1>
          <p className="admin-page-subtitle">
            {loadError || "The requested outsole could not be found or may have been deleted."}
          </p>
        </header>
        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/admin/outsoles" className="admin-btn admin-btn-secondary">
            Return to Outsoles List
          </Link>
        </div>
      </div>
    );
  }

  return <AdminEditOutsoleForm initialOutsole={outsole} taxonomy={taxonomy} router={router} />;
}

interface AdminEditOutsoleFormProps {
  initialOutsole: AdminOutsoleDetail;
  taxonomy: Taxonomy;
  router: ReturnType<typeof useRouter>;
}

function AdminEditOutsoleForm({ initialOutsole, taxonomy, router }: AdminEditOutsoleFormProps) {
  const [form, setForm] = useState<UpdateOutsoleInput>(() => ({
    id: initialOutsole.id,
    name: initialOutsole.name,
    slug: initialOutsole.slug,
    model_number: initialOutsole.model_number,
    description: initialOutsole.description ?? "",
    status: initialOutsole.status,
    is_featured: initialOutsole.is_featured,
    is_sampling_available: initialOutsole.is_sampling_available,
    shore_min: initialOutsole.shore_min,
    shore_max: initialOutsole.shore_max,
    shore_scale: initialOutsole.shore_scale || "A",
    din_abrasion_mm3: initialOutsole.din_abrasion_mm3,
    weight_grams: initialOutsole.weight_grams,
    category_ids: initialOutsole.category_ids || [],
    material_ids: initialOutsole.material_ids || [],
    traction_type_ids: initialOutsole.traction_type_ids || [],
  }));

  const [currentName, setCurrentName] = useState(initialOutsole.name);
  const [currentSlug, setCurrentSlug] = useState(initialOutsole.slug);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In edit mode: deliberately preserve the slug unless user explicitly edits the slug field
  function handleNameChange(name: string) {
    setForm((prev) => ({ ...prev, name }));
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

    // Client-side validation checks
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
      const payload: UpdateOutsoleInput = {
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

      const result = await updateAdminOutsole({ data: payload });
      if (result.success) {
        setSuccess(`Changes to "${result.name}" were saved successfully.`);
        setCurrentName(result.name);
        setCurrentSlug(result.slug);
        // Refresh router data cache without redirecting
        await router.invalidate();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-page" style={{ maxWidth: "900px" }}>
      <header className="admin-page-header">
        <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link
            to="/admin/outsoles"
            style={{
              fontSize: "0.75rem",
              color: "oklch(0.65 0.008 85)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              textDecoration: "none",
            }}
          >
            ← Back to Outsoles
          </Link>

          {form.status === "active" && (
            <a
              href={`/outsoles/${currentSlug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "0.75rem",
                color: "oklch(0.78 0.155 71)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                textDecoration: "none",
              }}
            >
              View in Public Catalog ↗
            </a>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h1 className="admin-page-title" style={{ margin: 0 }}>
            Edit Outsole: {currentName}
          </h1>
          <span className={`admin-badge admin-badge--${form.status}`}>
            {form.status}
          </span>
        </div>
        <p className="admin-page-subtitle" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem" }}>
          SKU: {form.model_number} • ID: {form.id}
        </p>
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
            background: "oklch(0.7 0.15 150 / 0.15)",
            border: "1px solid oklch(0.7 0.15 150 / 0.4)",
            borderRadius: "2px",
            color: "oklch(0.85 0.14 150)",
            fontSize: "0.8125rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
          role="status"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form-container" noValidate>
        {/* Basic Information */}
        <div className="admin-form-section">
          <h2 className="admin-form-section-title">Basic Information</h2>
          <p className="admin-form-section-desc">Identifier, model name, and public visibility settings.</p>

          <div className="admin-form-grid-2" style={{ marginBottom: "1rem" }}>
            <div className="admin-field">
              <label htmlFor="edit-outsole-name" className="admin-field-label">
                Product Name <span style={{ color: "oklch(0.78 0.155 71)" }}>*</span>
              </label>
              <input
                id="edit-outsole-name"
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
              <label htmlFor="edit-outsole-sku" className="admin-field-label">
                Model Number / SKU <span style={{ color: "oklch(0.78 0.155 71)" }}>*</span>
              </label>
              <input
                id="edit-outsole-sku"
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
              <label htmlFor="edit-outsole-slug" className="admin-field-label">
                URL Slug <span style={{ color: "oklch(0.78 0.155 71)" }}>*</span>
              </label>
              <input
                id="edit-outsole-slug"
                type="text"
                required
                className="admin-field-input"
                placeholder="e.g. trail-grip-x1"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                disabled={isSubmitting}
              />
              <span style={{ fontSize: "0.7rem", color: "oklch(0.55 0.008 85)", marginTop: "0.25rem", display: "block" }}>
                Preserved automatically. Only change if deliberately modifying the public URL.
              </span>
            </div>

            <div className="admin-field">
              <label htmlFor="edit-outsole-status" className="admin-field-label">
                Status
              </label>
              <select
                id="edit-outsole-status"
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
            <label htmlFor="edit-outsole-desc" className="admin-field-label">
              Description
            </label>
            <textarea
              id="edit-outsole-desc"
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
                id="edit-outsole-featured"
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
                disabled={isSubmitting}
              />
              <span>Featured Showcase Product</span>
            </label>

            <label className="admin-checkbox-label">
              <input
                id="edit-outsole-sampling"
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
              <label htmlFor="edit-outsole-shore-min" className="admin-field-label">
                Shore Min
              </label>
              <input
                id="edit-outsole-shore-min"
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
              <label htmlFor="edit-outsole-shore-max" className="admin-field-label">
                Shore Max
              </label>
              <input
                id="edit-outsole-shore-max"
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
              <label htmlFor="edit-outsole-shore-scale" className="admin-field-label">
                Shore Scale
              </label>
              <input
                id="edit-outsole-shore-scale"
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
              <label htmlFor="edit-outsole-din" className="admin-field-label">
                DIN Abrasion (mm³)
              </label>
              <input
                id="edit-outsole-din"
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
              <label htmlFor="edit-outsole-weight" className="admin-field-label">
                Weight (grams)
              </label>
              <input
                id="edit-outsole-weight"
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
              {taxonomy.categories.map((cat: TaxonomyTerm) => (
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
              {taxonomy.materials.map((mat: TaxonomyTerm) => (
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
              {taxonomy.tractionTypes.map((trac: TaxonomyTerm) => (
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
            Back to Outsoles
          </Link>
          <button
            id="admin-save-outsole-btn"
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="admin-login-spinner" style={{ width: "14px", height: "14px" }} />
                <span>Saving Changes…</span>
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
