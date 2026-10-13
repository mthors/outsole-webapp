import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  getAdminTaxonomyList,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  createAdminMaterial,
  updateAdminMaterial,
  deleteAdminMaterial,
  createAdminTractionType,
  updateAdminTractionType,
  deleteAdminTractionType,
  type CategoryItem,
  type MaterialItem,
  type TractionTypeItem,
} from "@/lib/admin-taxonomy.functions";
import { slugify } from "@/lib/catalog-types";

export const Route = createFileRoute("/admin/_layout/taxonomy/")({
  loader: async () => {
    return await getAdminTaxonomyList();
  },
  component: AdminTaxonomyPage,
});

type TabType = "categories" | "materials" | "traction";

// Dialog state types
type ModalMode = "create" | "edit" | null;

interface ActiveItem {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  productCount: number;
}

export function AdminTaxonomyPage() {
  const data = Route.useLoaderData();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("categories");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingItem, setEditingItem] = useState<ActiveItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<ActiveItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion state
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter lists based on search
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.categories;
    return data.categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [data.categories, searchQuery]);

  const filteredMaterials = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.materials;
    return data.materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q)),
    );
  }, [data.materials, searchQuery]);

  const filteredTractionTypes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.tractionTypes;
    return data.tractionTypes.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)),
    );
  }, [data.tractionTypes, searchQuery]);

  function openCreateModal() {
    setModalMode("create");
    setEditingItem(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormError(null);
  }

  function openEditModal(item: ActiveItem) {
    setModalMode("edit");
    setEditingItem(item);
    setFormName(item.name);
    setFormSlug(item.slug ?? "");
    setFormDescription(item.description ?? "");
    setFormError(null);
  }

  function closeModal() {
    if (isSubmitting) return;
    setModalMode(null);
    setEditingItem(null);
    setFormError(null);
  }

  function openDeleteDialog(item: ActiveItem) {
    setDeletingItem(item);
    setDeleteError(null);
  }

  function closeDeleteDialog() {
    if (isDeleting) return;
    setDeletingItem(null);
    setDeleteError(null);
  }

  function handleNameChange(name: string) {
    setFormName(name);
    if (activeTab === "categories") {
      const prevAutoSlug = slugify(formName);
      if (!formSlug || formSlug === prevAutoSlug) {
        setFormSlug(slugify(name));
      }
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError("Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === "categories") {
        const trimmedSlug = formSlug.trim().toLowerCase();
        if (!trimmedSlug) {
          throw new Error("Slug is required for categories.");
        }
        if (modalMode === "create") {
          await createAdminCategory({ data: { name: trimmedName, slug: trimmedSlug } });
        } else if (modalMode === "edit" && editingItem) {
          await updateAdminCategory({
            data: { id: editingItem.id, name: trimmedName, slug: trimmedSlug },
          });
        }
      } else if (activeTab === "materials") {
        const trimmedDesc = formDescription.trim() || null;
        if (modalMode === "create") {
          await createAdminMaterial({ data: { name: trimmedName, description: trimmedDesc } });
        } else if (modalMode === "edit" && editingItem) {
          await updateAdminMaterial({
            data: { id: editingItem.id, name: trimmedName, description: trimmedDesc },
          });
        }
      } else if (activeTab === "traction") {
        const trimmedDesc = formDescription.trim() || null;
        if (modalMode === "create") {
          await createAdminTractionType({
            data: { name: trimmedName, description: trimmedDesc },
          });
        } else if (modalMode === "edit" && editingItem) {
          await updateAdminTractionType({
            data: { id: editingItem.id, name: trimmedName, description: trimmedDesc },
          });
        }
      }

      await router.invalidate();
      closeModal();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      if (activeTab === "categories") {
        await deleteAdminCategory({ data: { id: deletingItem.id } });
      } else if (activeTab === "materials") {
        await deleteAdminMaterial({ data: { id: deletingItem.id } });
      } else if (activeTab === "traction") {
        await deleteAdminTractionType({ data: { id: deletingItem.id } });
      }

      await router.invalidate();
      closeDeleteDialog();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setIsDeleting(false);
    }
  }

  const tabLabels: Record<TabType, { singular: string; plural: string }> = {
    categories: { singular: "Category", plural: "Categories" },
    materials: { singular: "Material", plural: "Materials" },
    traction: { singular: "Traction Type", plural: "Traction Types" },
  };

  return (
    <div className="admin-page" style={{ maxWidth: "1080px" }}>
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 className="admin-page-title">Taxonomy Management</h1>
          <p className="admin-page-subtitle">
            Manage product categories, compounds, and traction pattern classifications.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="admin-btn admin-btn-primary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add {tabLabels[activeTab].singular}
        </button>
      </div>

      {/* ── Tab Switcher ── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--admin-card-border)",
          marginBottom: "1.5rem",
          gap: "0.5rem",
        }}
      >
        {(["categories", "materials", "traction"] as TabType[]).map((tab) => {
          const count =
            tab === "categories"
              ? data.categories.length
              : tab === "materials"
                ? data.materials.length
                : data.tractionTypes.length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery("");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid var(--admin-accent)" : "2px solid transparent",
                color: isActive ? "var(--admin-text-main)" : "var(--admin-text-muted)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tabLabels[tab].plural}
              <span
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono, monospace)",
                  background: isActive ? "var(--admin-badge-bg)" : "var(--admin-bg)",
                  color: isActive ? "var(--charcoal)" : "var(--admin-text-muted)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "2px",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search Bar ── */}
      <div style={{ marginBottom: "1.25rem", display: "flex", gap: "1rem" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--admin-text-muted)",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${tabLabels[activeTab].plural.toLowerCase()}…`}
            className="admin-field-input"
            style={{
              paddingLeft: "2.25rem",
            }}
          />
        </div>
      </div>

      {/* ── Table Container ── */}
      <div
        style={{
          background: "var(--admin-card-bg)",
          border: "1px solid var(--admin-card-border)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {activeTab === "categories" && (
          <CategoriesTable
            items={filteredCategories}
            onEdit={openEditModal}
            onDelete={openDeleteDialog}
          />
        )}
        {activeTab === "materials" && (
          <MaterialsTable
            items={filteredMaterials}
            onEdit={openEditModal}
            onDelete={openDeleteDialog}
          />
        )}
        {activeTab === "traction" && (
          <TractionTable
            items={filteredTractionTypes}
            onEdit={openEditModal}
            onDelete={openDeleteDialog}
          />
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(41, 41, 37, 0.45)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="taxonomy-modal-title"
            style={{
              background: "var(--admin-card-bg)",
              border: "1px solid var(--admin-card-border)",
              borderRadius: "6px",
              padding: "1.75rem 2rem",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 48px rgba(0, 0, 0, 0.12)",
            }}
          >
            <h2
              id="taxonomy-modal-title"
              style={{
                margin: "0 0 1.25rem",
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--admin-text-main)",
              }}
            >
              {modalMode === "create" ? "Add" : "Edit"} {tabLabels[activeTab].singular}
            </h2>

            {formError && (
              <div
                style={{
                  background: "var(--admin-danger-bg)",
                  border: "1px solid var(--admin-danger-border)",
                  color: "var(--admin-danger-text)",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "4px",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Name */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.6875rem",
                    fontFamily: "var(--font-mono, monospace)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--admin-text-muted)",
                    marginBottom: "0.375rem",
                  }}
                >
                  Name <span style={{ color: "var(--destructive)" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={`e.g. ${
                    activeTab === "categories"
                      ? "Trail Running"
                      : activeTab === "materials"
                        ? "Vibram Rubber"
                        : "Chevron Lug"
                  }`}
                  className="admin-field-input"
                />
              </div>

              {/* Slug (Categories only) */}
              {activeTab === "categories" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--admin-text-muted)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Slug <span style={{ color: "var(--destructive)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    placeholder="e.g. trail-running"
                    className="admin-field-input"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                  />
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                    Used for URL filtering. Lowercase alphanumeric and hyphens only.
                  </p>
                </div>
              )}

              {/* Description (Materials and Traction Types) */}
              {(activeTab === "materials" || activeTab === "traction") && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--admin-text-muted)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Description <span style={{ color: "var(--admin-text-muted)" }}>(Optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of the material or traction geometry..."
                    className="admin-field-input"
                    style={{ resize: "vertical" }}
                  />
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-primary"
                >
                  {isSubmitting ? "Saving…" : modalMode === "create" ? "Create" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deletingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(41, 41, 37, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) closeDeleteDialog();
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            aria-describedby="delete-dialog-desc"
            style={{
              background: "var(--admin-card-bg)",
              border: "1px solid var(--admin-card-border)",
              borderRadius: "6px",
              padding: "1.75rem 2rem",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 48px rgba(0, 0, 0, 0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "4px",
                  background: deletingItem.productCount > 0 ? "var(--admin-badge-bg)" : "var(--admin-danger-bg)",
                  border: deletingItem.productCount > 0 ? "1px solid var(--admin-card-border)" : "1px solid var(--admin-danger-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: deletingItem.productCount > 0 ? "var(--charcoal)" : "var(--admin-danger-text)",
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h2
                  id="delete-dialog-title"
                  style={{
                    margin: "0 0 0.25rem",
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--admin-text-main)",
                  }}
                >
                  Delete {deletingItem.name}?
                </h2>
                <p style={{ margin: 0, fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", color: "var(--admin-text-muted)", textTransform: "uppercase" }}>
                  {tabLabels[activeTab].singular}
                </p>
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  background: "var(--admin-danger-bg)",
                  border: "1px solid var(--admin-danger-border)",
                  color: "var(--admin-danger-text)",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "4px",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                }}
              >
                {deleteError}
              </div>
            )}

            {deletingItem.productCount > 0 ? (
              <div>
                <p id="delete-dialog-desc" style={{ fontSize: "0.875rem", color: "var(--admin-text-secondary)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  This {tabLabels[activeTab].singular.toLowerCase()} cannot be deleted because it is currently assigned to{" "}
                  <strong style={{ color: "var(--admin-text-main)" }}>{deletingItem.productCount}</strong> product{deletingItem.productCount === 1 ? "" : "s"}.
                </p>
                <div
                  style={{
                    background: "var(--admin-bg)",
                    border: "1px solid var(--admin-card-border)",
                    borderRadius: "4px",
                    padding: "0.75rem",
                    fontSize: "0.8125rem",
                    color: "var(--admin-text-muted)",
                    marginBottom: "1.25rem",
                  }}
                >
                  To safely delete this {tabLabels[activeTab].singular.toLowerCase()}, first open the assigned products in the admin panel and remove this taxonomy assignment.
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    className="admin-btn admin-btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p id="delete-dialog-desc" style={{ fontSize: "0.875rem", color: "var(--admin-text-secondary)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  Are you sure you want to delete <strong style={{ color: "var(--admin-text-main)" }}>{deletingItem.name}</strong>? This item is not assigned to any products and will be permanently removed.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    disabled={isDeleting}
                    className="admin-btn admin-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    style={{
                      padding: "0.5rem 1rem",
                      background: isDeleting ? "var(--admin-danger-bg)" : "var(--destructive)",
                      color: "#fff",
                      border: "1px solid var(--admin-danger-border)",
                      borderRadius: "4px",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: isDeleting ? "not-allowed" : "pointer",
                      opacity: isDeleting ? 0.7 : 1,
                    }}
                  >
                    {isDeleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components: Tables
// ────────────────────────────────────────────────────────────────────────────

function CategoriesTable({
  items,
  onEdit,
  onDelete,
}: {
  items: CategoryItem[];
  onEdit: (item: ActiveItem) => void;
  onDelete: (item: ActiveItem) => void;
}) {
  if (items.length === 0) {
    return <EmptyTable message="No categories found matching your search." />;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--admin-card-border)", background: "var(--admin-bg)" }}>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Name</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Slug</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Assigned Products</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", textAlign: "right" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((c) => (
          <tr key={c.id} style={{ borderBottom: "1px solid var(--admin-card-border)" }}>
            <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--admin-text-main)" }}>{c.name}</td>
            <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono, monospace)", color: "var(--admin-text-muted)", fontSize: "0.75rem" }}>{c.slug}</td>
            <td style={{ padding: "0.875rem 1rem" }}>
              <ProductCountBadge count={c.productCount} />
            </td>
            <td style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
              <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => onEdit(c)}
                  className="admin-btn admin-btn-sm admin-btn-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  className="admin-btn admin-btn-sm"
                  style={{
                    background: "var(--admin-danger-bg)",
                    border: "1px solid var(--admin-danger-border)",
                    color: "var(--admin-danger-text)",
                  }}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MaterialsTable({
  items,
  onEdit,
  onDelete,
}: {
  items: MaterialItem[];
  onEdit: (item: ActiveItem) => void;
  onDelete: (item: ActiveItem) => void;
}) {
  if (items.length === 0) {
    return <EmptyTable message="No materials found matching your search." />;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--admin-card-border)", background: "var(--admin-bg)" }}>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", width: "24%" }}>Name</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Description</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", width: "18%" }}>Assigned Products</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", textAlign: "right", width: "16%" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((m) => (
          <tr key={m.id} style={{ borderBottom: "1px solid var(--admin-card-border)" }}>
            <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--admin-text-main)" }}>{m.name}</td>
            <td style={{ padding: "0.875rem 1rem", color: "var(--admin-text-secondary)", lineHeight: 1.4 }}>
              {m.description || <span style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>No description</span>}
            </td>
            <td style={{ padding: "0.875rem 1rem" }}>
              <ProductCountBadge count={m.productCount} />
            </td>
            <td style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
              <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => onEdit(m)}
                  className="admin-btn admin-btn-sm admin-btn-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(m)}
                  className="admin-btn admin-btn-sm"
                  style={{
                    background: "var(--admin-danger-bg)",
                    border: "1px solid var(--admin-danger-border)",
                    color: "var(--admin-danger-text)",
                  }}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TractionTable({
  items,
  onEdit,
  onDelete,
}: {
  items: TractionTypeItem[];
  onEdit: (item: ActiveItem) => void;
  onDelete: (item: ActiveItem) => void;
}) {
  if (items.length === 0) {
    return <EmptyTable message="No traction types found matching your search." />;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem" }}>
      <thead>
        <tr style={{ borderBottom: "1px solid var(--admin-card-border)", background: "var(--admin-bg)" }}>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", width: "24%" }}>Name</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Description</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", width: "18%" }}>Assigned Products</th>
          <th style={{ padding: "0.75rem 1rem", color: "var(--admin-text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", textAlign: "right", width: "16%" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr key={t.id} style={{ borderBottom: "1px solid var(--admin-card-border)" }}>
            <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--admin-text-main)" }}>{t.name}</td>
            <td style={{ padding: "0.875rem 1rem", color: "var(--admin-text-secondary)", lineHeight: 1.4 }}>
              {t.description || <span style={{ color: "var(--admin-text-muted)", fontStyle: "italic" }}>No description</span>}
            </td>
            <td style={{ padding: "0.875rem 1rem" }}>
              <ProductCountBadge count={t.productCount} />
            </td>
            <td style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
              <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => onEdit(t)}
                  className="admin-btn admin-btn-sm admin-btn-secondary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(t)}
                  className="admin-btn admin-btn-sm"
                  style={{
                    background: "var(--admin-danger-bg)",
                    border: "1px solid var(--admin-danger-border)",
                    color: "var(--admin-danger-text)",
                  }}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductCountBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.2rem 0.5rem",
          borderRadius: "4px",
          fontSize: "0.6875rem",
          fontFamily: "var(--font-mono, monospace)",
          background: "var(--admin-bg)",
          color: "var(--admin-text-muted)",
          border: "1px solid var(--admin-card-border)",
          letterSpacing: "0.04em",
        }}
      >
        0 products
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
        borderRadius: "4px",
        fontSize: "0.6875rem",
        fontFamily: "var(--font-mono, monospace)",
        background: "var(--admin-badge-bg)",
        color: "var(--charcoal)",
        border: "1px solid var(--admin-card-border)",
        letterSpacing: "0.04em",
      }}
    >
      {count} {count === 1 ? "product" : "products"}
    </span>
  );
}

function EmptyTable({ message }: { message: string }) {
  return (
    <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--admin-text-muted)", fontSize: "0.875rem" }}>
      {message}
    </div>
  );
}
