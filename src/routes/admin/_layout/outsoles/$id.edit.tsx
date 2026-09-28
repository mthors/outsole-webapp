import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import {
  getAdminOutsole,
  getAdminTaxonomy,
  updateAdminOutsole,
  getAdminOutsoleImages,
  setPrimaryOutsoleImage,
  reorderOutsoleImages,
  updateOutsoleImageMetadata,
  removeOutsoleImage,
  type UpdateOutsoleInput,
  type AdminOutsoleDetail,
  type AdminOutsoleImage,
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

  // Images state — initialised from loader data, refreshed after mutations
  const [images, setImages] = useState<AdminOutsoleImage[]>(() =>
    [...initialOutsole.images]
      .map((img) => ({ ...img, outsole_id: initialOutsole.id }))
      .sort(
        (a, b) =>
          Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order,
      ),
  );

  const refreshImages = useCallback(async () => {
    try {
      const { images: fresh } = await getAdminOutsoleImages({ data: { outsoleId: initialOutsole.id } });
      setImages(
        [...fresh].sort(
          (a, b) =>
            Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order,
        ),
      );
    } catch {
      /* best-effort refresh — don't surface to user */
    }
  }, [initialOutsole.id]);

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

    if (!form.name.trim()) { setError("Product name is required."); return; }
    if (!form.slug.trim()) { setError("Slug is required."); return; }
    if (!form.model_number.trim()) { setError("Model number / SKU is required."); return; }
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
          <h2 className="admin-form-section-title">Taxonomy &amp; Classifications</h2>
          <p className="admin-form-section-desc">Associate categories, compound materials, and lug traction profiles.</p>

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

      {/* ─── Product Images Panel ─── */}
      <ProductImagesPanel
        outsoleId={initialOutsole.id}
        outsoleName={currentName}
        images={images}
        onImagesChanged={refreshImages}
      />
    </div>
  );
}

// ─── Product Images Panel ───────────────────────────────────────────────────

interface ProductImagesPanelProps {
  outsoleId: string;
  outsoleName: string;
  images: AdminOutsoleImage[];
  onImagesChanged: () => Promise<void>;
}

function ProductImagesPanel({ outsoleId, outsoleName, images, onImagesChanged }: ProductImagesPanelProps) {
  const [busy, setBusy] = useState<string | null>(null); // imageId currently processing
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelSuccess, setPanelSuccess] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminOutsoleImage | null>(null);

  // Alt text editing state (per-image)
  const [editingAlt, setEditingAlt] = useState<string | null>(null); // imageId being edited
  const [altDraft, setAltDraft] = useState("");

  function flash(successMsg: string) {
    setPanelError(null);
    setPanelSuccess(successMsg);
    setTimeout(() => setPanelSuccess(null), 5000);
  }

  function flashError(msg: string) {
    setPanelSuccess(null);
    setPanelError(msg);
  }

  async function handleSetPrimary(imageId: string) {
    if (busy) return;
    setBusy(imageId);
    setPanelError(null);
    try {
      await setPrimaryOutsoleImage({ data: { outsoleId, imageId } });
      await onImagesChanged();
      flash("Primary image updated.");
    } catch (err: unknown) {
      flashError(err instanceof Error ? err.message : "Failed to set primary image.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReorder(imageId: string, direction: "up" | "down") {
    if (busy) return;
    setBusy(imageId + direction);
    setPanelError(null);
    try {
      await reorderOutsoleImages({ data: { outsoleId, imageId, direction } });
      await onImagesChanged();
    } catch (err: unknown) {
      flashError(err instanceof Error ? err.message : "Failed to reorder image.");
    } finally {
      setBusy(null);
    }
  }

  function startEditAlt(img: AdminOutsoleImage) {
    setEditingAlt(img.id);
    setAltDraft(img.alt_text ?? "");
  }

  async function handleSaveAlt(imageId: string) {
    if (busy) return;
    setBusy(imageId + "alt");
    setPanelError(null);
    try {
      await updateOutsoleImageMetadata({ data: { outsoleId, imageId, alt_text: altDraft || null } });
      await onImagesChanged();
      setEditingAlt(null);
      flash("Alt text updated.");
    } catch (err: unknown) {
      flashError(err instanceof Error ? err.message : "Failed to update alt text.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget || busy) return;
    const img = removeTarget;
    setBusy(img.id + "remove");
    setPanelError(null);
    setRemoveTarget(null);
    try {
      await removeOutsoleImage({ data: { outsoleId, imageId: img.id } });
      await onImagesChanged();
      flash(
        img.is_primary
          ? `Primary image removed. No other images will be set as primary automatically.`
          : `Image "${img.file_path.split("/").pop()}" removed.`,
      );
    } catch (err: unknown) {
      flashError(err instanceof Error ? err.message : "Failed to remove image.");
    } finally {
      setBusy(null);
    }
  }

  const filename = (path: string) => path.split("/").pop() ?? path;

  return (
    <div style={{ maxWidth: "800px", marginTop: "2rem" }}>
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid oklch(0.24 0.004 285)",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "oklch(0.94 0.008 85)",
            }}
          >
            Product Images
          </h2>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "oklch(0.6 0.008 85)" }}>
            {images.length === 0
              ? "No images attached to this product."
              : `${images.length} image${images.length === 1 ? "" : "s"} — manage primary, order, and alt text.`}
          </p>
        </div>
        <div
          style={{
            fontSize: "0.6875rem",
            fontFamily: "var(--font-mono, monospace)",
            color: "oklch(0.5 0.008 85)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Phase 6A
        </div>
      </div>

      {/* Panel feedback */}
      {panelError && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            background: "oklch(0.62 0.2 25 / 0.1)",
            border: "1px solid oklch(0.62 0.2 25 / 0.4)",
            borderRadius: "2px",
            fontSize: "0.8125rem",
            color: "oklch(0.8 0.12 25)",
            lineHeight: "1.5",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: "2px" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{panelError}</span>
        </div>
      )}
      {panelSuccess && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1rem",
            marginBottom: "1rem",
            background: "oklch(0.7 0.15 150 / 0.12)",
            border: "1px solid oklch(0.7 0.15 150 / 0.35)",
            borderRadius: "2px",
            fontSize: "0.8125rem",
            color: "oklch(0.82 0.13 150)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{panelSuccess}</span>
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && (
        <div
          style={{
            background: "oklch(0.16 0.003 285)",
            border: "1px dashed oklch(0.3 0.004 285)",
            borderRadius: "2px",
            padding: "3rem 2rem",
            textAlign: "center",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            style={{ color: "oklch(0.4 0.004 285)", marginBottom: "0.75rem" }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "oklch(0.6 0.008 85)", fontWeight: 500 }}>
            No images attached
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "oklch(0.45 0.008 85)" }}>
            Image uploads will be available in Phase 6B.
          </p>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {images.map((img, idx) => {
            const isBusyRow = busy?.startsWith(img.id);
            const isEditingThisAlt = editingAlt === img.id;

            return (
              <div
                key={img.id}
                id={`image-row-${img.id}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1rem",
                  background: img.is_primary
                    ? "oklch(0.78 0.155 71 / 0.06)"
                    : "oklch(0.16 0.003 285)",
                  border: img.is_primary
                    ? "1px solid oklch(0.78 0.155 71 / 0.3)"
                    : "1px solid oklch(0.24 0.004 285)",
                  borderRadius: "2px",
                  opacity: isBusyRow ? 0.65 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {/* Thumbnail */}
                <div style={{ flexShrink: 0, position: "relative" }}>
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.alt_text ?? img.file_path}
                      style={{
                        width: "72px",
                        height: "72px",
                        objectFit: "cover",
                        borderRadius: "2px",
                        border: "1px solid oklch(0.28 0.004 285)",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "72px",
                        height: "72px",
                        background: "oklch(0.13 0.003 285)",
                        border: "1px solid oklch(0.24 0.004 285)",
                        borderRadius: "2px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "oklch(0.4 0.004 285)",
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  {/* Primary badge overlay */}
                  {img.is_primary && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0",
                        left: "0",
                        right: "0",
                        background: "oklch(0.78 0.155 71)",
                        color: "oklch(0.17 0.02 60)",
                        fontSize: "0.5rem",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono, monospace)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        textAlign: "center",
                        padding: "2px 0",
                      }}
                    >
                      Primary
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Filename + order */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "0.75rem",
                        color: "oklch(0.82 0.1 71)",
                        wordBreak: "break-all",
                      }}
                    >
                      {filename(img.file_path)}
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontFamily: "var(--font-mono, monospace)",
                        color: "oklch(0.5 0.008 85)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      order:{img.display_order}
                    </span>
                    {img.is_primary && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontFamily: "var(--font-mono, monospace)",
                          fontWeight: 700,
                          color: "oklch(0.78 0.155 71)",
                          background: "oklch(0.78 0.155 71 / 0.12)",
                          border: "1px solid oklch(0.78 0.155 71 / 0.3)",
                          borderRadius: "2px",
                          padding: "1px 5px",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Primary
                      </span>
                    )}
                  </div>

                  {/* Full path */}
                  <div
                    style={{
                      fontSize: "0.65rem",
                      fontFamily: "var(--font-mono, monospace)",
                      color: "oklch(0.48 0.006 285)",
                      marginBottom: "0.5rem",
                      wordBreak: "break-all",
                    }}
                  >
                    {img.file_path}
                  </div>

                  {/* Alt text */}
                  {isEditingThisAlt ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                      <input
                        id={`alt-input-${img.id}`}
                        type="text"
                        className="admin-field-input"
                        style={{ flex: 1, fontSize: "0.8125rem", padding: "0.4rem 0.6rem" }}
                        value={altDraft}
                        onChange={(e) => setAltDraft(e.target.value)}
                        maxLength={500}
                        placeholder="Describe the image for screen readers and SEO..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleSaveAlt(img.id); }
                          if (e.key === "Escape") { setEditingAlt(null); }
                        }}
                        disabled={isBusyRow}
                        autoFocus
                      />
                      <button
                        id={`alt-save-${img.id}`}
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-primary"
                        onClick={() => handleSaveAlt(img.id)}
                        disabled={isBusyRow}
                      >
                        {busy === img.id + "alt" ? "…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                        onClick={() => setEditingAlt(null)}
                        disabled={isBusyRow}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: img.alt_text ? "oklch(0.78 0.008 85)" : "oklch(0.45 0.004 285)",
                        fontStyle: img.alt_text ? "normal" : "italic",
                        marginBottom: "0.5rem",
                        lineHeight: "1.4",
                      }}
                    >
                      {img.alt_text || "No alt text set"}
                    </div>
                  )}

                  {/* Action row */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {/* Set Primary */}
                    {!img.is_primary && (
                      <button
                        id={`set-primary-${img.id}`}
                        type="button"
                        className="admin-btn admin-btn-sm"
                        style={{
                          background: "oklch(0.78 0.155 71 / 0.1)",
                          color: "oklch(0.78 0.155 71)",
                          border: "1px solid oklch(0.78 0.155 71 / 0.3)",
                        }}
                        onClick={() => handleSetPrimary(img.id)}
                        disabled={!!busy}
                        title="Set as primary image"
                      >
                        {busy === img.id ? (
                          <span className="admin-login-spinner" style={{ width: "10px", height: "10px" }} />
                        ) : (
                          "Set Primary"
                        )}
                      </button>
                    )}

                    {/* Move Up */}
                    <button
                      id={`move-up-${img.id}`}
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => handleReorder(img.id, "up")}
                      disabled={!!busy || idx === 0}
                      title="Move up in display order"
                      style={{ opacity: idx === 0 ? 0.35 : 1 }}
                    >
                      {busy === img.id + "up" ? (
                        <span className="admin-login-spinner" style={{ width: "10px", height: "10px" }} />
                      ) : (
                        "↑ Up"
                      )}
                    </button>

                    {/* Move Down */}
                    <button
                      id={`move-down-${img.id}`}
                      type="button"
                      className="admin-btn admin-btn-sm admin-btn-secondary"
                      onClick={() => handleReorder(img.id, "down")}
                      disabled={!!busy || idx === images.length - 1}
                      title="Move down in display order"
                      style={{ opacity: idx === images.length - 1 ? 0.35 : 1 }}
                    >
                      {busy === img.id + "down" ? (
                        <span className="admin-login-spinner" style={{ width: "10px", height: "10px" }} />
                      ) : (
                        "↓ Down"
                      )}
                    </button>

                    {/* Edit Alt */}
                    {!isEditingThisAlt && (
                      <button
                        id={`edit-alt-${img.id}`}
                        type="button"
                        className="admin-btn admin-btn-sm admin-btn-secondary"
                        onClick={() => startEditAlt(img)}
                        disabled={!!busy}
                        title="Edit alt text"
                      >
                        Edit Alt
                      </button>
                    )}

                    {/* Remove */}
                    <button
                      id={`remove-img-${img.id}`}
                      type="button"
                      className="admin-btn admin-btn-sm"
                      style={{
                        background: "oklch(0.62 0.2 25 / 0.1)",
                        color: "oklch(0.75 0.12 25)",
                        border: "1px solid oklch(0.62 0.2 25 / 0.3)",
                        marginLeft: "auto",
                      }}
                      onClick={() => setRemoveTarget(img)}
                      disabled={!!busy}
                      title="Remove image permanently"
                    >
                      {busy === img.id + "remove" ? (
                        <span className="admin-login-spinner" style={{ width: "10px", height: "10px" }} />
                      ) : (
                        "Remove"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Remove Confirmation Dialog ── */}
      {removeTarget && (
        <RemoveImageDialog
          image={removeTarget}
          outsoleName={outsoleName}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveTarget(null)}
          isRemoving={busy === removeTarget.id + "remove"}
        />
      )}
    </div>
  );
}

// ─── Remove Image Confirmation Dialog ───────────────────────────────────────

interface RemoveImageDialogProps {
  image: AdminOutsoleImage;
  outsoleName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isRemoving: boolean;
}

function RemoveImageDialog({ image, outsoleName, onConfirm, onCancel, isRemoving }: RemoveImageDialogProps) {
  const filename = image.file_path.split("/").pop() ?? image.file_path;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "oklch(0 0 0 / 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRemoving) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-img-dialog-title"
        aria-describedby="remove-img-dialog-desc"
        style={{
          background: "oklch(0.185 0.004 285)",
          border: "1px solid oklch(0.3 0.004 285)",
          borderRadius: "2px",
          padding: "1.75rem 2rem",
          maxWidth: "480px",
          width: "100%",
          boxShadow: "0 24px 64px oklch(0 0 0 / 0.5)",
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
              background: "oklch(0.62 0.2 25 / 0.15)",
              border: "1px solid oklch(0.62 0.2 25 / 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "oklch(0.78 0.12 25)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </div>
          <div>
            <h2
              id="remove-img-dialog-title"
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "oklch(0.94 0.008 85)",
              }}
            >
              Remove Image?
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.6875rem",
                fontFamily: "var(--font-mono, monospace)",
                color: "oklch(0.55 0.008 85)",
                letterSpacing: "0.04em",
                wordBreak: "break-all",
              }}
            >
              {filename}
            </p>
          </div>
        </div>

        <p id="remove-img-dialog-desc" style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", lineHeight: "1.6", color: "oklch(0.78 0.008 85)" }}>
          This will permanently remove the image from{" "}
          <strong style={{ color: "oklch(0.92 0.008 85)" }}>{outsoleName}</strong>.
        </p>

        <div
          style={{
            margin: "0 0 1.25rem",
            padding: "0.625rem 0.875rem",
            fontSize: "0.8125rem",
            lineHeight: "1.5",
            color: "oklch(0.8 0.12 25)",
            background: "oklch(0.62 0.2 25 / 0.06)",
            border: "1px solid oklch(0.62 0.2 25 / 0.25)",
            borderRadius: "2px",
          }}
        >
          <strong>This action cannot be undone.</strong> Both the image file in Storage
          {" ("}outsole-images/{image.file_path}{")"} and its database record will be permanently deleted.
          {image.is_primary && (
            <span style={{ display: "block", marginTop: "0.5rem" }}>
              ⚠ This is the <strong>primary image</strong>. After removal, no primary image will be set for this product.
            </span>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            id="remove-img-cancel-btn"
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onCancel}
            disabled={isRemoving}
          >
            Cancel
          </button>
          <button
            id="remove-img-confirm-btn"
            type="button"
            onClick={onConfirm}
            disabled={isRemoving}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "2px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              border: "1px solid oklch(0.62 0.2 25 / 0.5)",
              background: isRemoving ? "oklch(0.55 0.15 25 / 0.15)" : "oklch(0.62 0.2 25 / 0.2)",
              color: isRemoving ? "oklch(0.65 0.1 25)" : "oklch(0.8 0.15 25)",
              cursor: isRemoving ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {isRemoving ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid oklch(0.65 0.1 25 / 0.3)",
                    borderTopColor: "oklch(0.65 0.1 25)",
                    borderRadius: "50%",
                    animation: "admin-spin 0.65s linear infinite",
                  }}
                />
                <span>Removing…</span>
              </>
            ) : (
              "Remove Permanently"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
