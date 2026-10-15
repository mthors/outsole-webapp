import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  listAdminGallery,
  createAdminGalleryItem,
  updateAdminGalleryItem,
  deleteAdminGalleryItem,
  reorderAdminGalleryItems,
  type AllowedGalleryMimeType,
} from "@/lib/admin-gallery.functions";
import type { GalleryItem, GalleryCategory } from "@/lib/gallery-types";
import { GALLERY_CATEGORIES, GALLERY_CATEGORY_LIST, FALLBACK_PLACEHOLDERS } from "@/lib/gallery-types";

export const Route = createFileRoute("/admin/_layout/gallery/")({
  loader: async () => {
    return await listAdminGallery();
  },
  component: AdminGalleryPage,
});

// ── Upload Modal ──
interface UploadModalProps {
  onClose: () => void;
  onCreated: (item: GalleryItem) => void;
  nextOrder: number;
}

function UploadModal({ onClose, onCreated, nextOrder }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<GalleryCategory>("factory_office");
  const [captionId, setCaptionId] = useState("");
  const [captionEn, setCaptionEn] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (selected.size > 8 * 1024 * 1024) {
      setError("File size exceeds 8MB limit.");
      return;
    }

    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select an image file to upload.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      const res = await createAdminGalleryItem({
        data: {
          fileName: file.name,
          contentType: file.type as AllowedGalleryMimeType,
          fileBase64: base64,
          category,
          caption_id: captionId || null,
          caption_en: captionEn || null,
          is_featured: isFeatured,
          is_published: isPublished,
          display_order: nextOrder,
        },
      });

      toast.success("Gallery photograph uploaded successfully.");
      onCreated(res.item);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "1.75rem 2rem",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(41, 41, 37, 0.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 id="upload-modal-title" style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--charcoal)" }}>
            Upload Factory Photograph
          </h2>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: "0.25rem 0.5rem" }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              color: "var(--admin-danger-text)",
              fontSize: "0.8125rem",
              borderRadius: "2px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* File Picker */}
          <div>
            <label className="admin-label" htmlFor="gallery-file-input">
              Image File <span style={{ color: "var(--admin-danger-text)" }}>*</span>
            </label>
            <input
              id="gallery-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              disabled={isSubmitting}
              className="admin-input"
              style={{ padding: "0.5rem" }}
            />
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--muted-olive)" }}>
              Supported formats: JPG, PNG, WebP. Max file size: 8MB.
            </p>
          </div>

          {previewUrl && (
            <div style={{ position: "relative", height: "180px", background: "var(--sand)", borderRadius: "2px", overflow: "hidden" }}>
              <img
                src={previewUrl}
                alt="Upload preview"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          )}

          {/* Category Dropdown */}
          <div>
            <label className="admin-label" htmlFor="gallery-category-select">
              Category <span style={{ color: "var(--admin-danger-text)" }}>*</span>
            </label>
            <select
              id="gallery-category-select"
              className="admin-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as GalleryCategory)}
              disabled={isSubmitting}
            >
              {GALLERY_CATEGORY_LIST.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.code} — {cat.name_en} ({cat.name_id})
                </option>
              ))}
            </select>
          </div>

          {/* Indonesian Caption */}
          <div>
            <label className="admin-label" htmlFor="gallery-caption-id">
              Indonesian Caption (ID)
            </label>
            <input
              id="gallery-caption-id"
              type="text"
              className="admin-input"
              value={captionId}
              onChange={(e) => setCaptionId(e.target.value)}
              placeholder="Contoh: Lini mesin press hidrolik vulkanisasi bertekanan tinggi"
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>

          {/* English Caption */}
          <div>
            <label className="admin-label" htmlFor="gallery-caption-en">
              English Caption (EN)
            </label>
            <input
              id="gallery-caption-en"
              type="text"
              className="admin-input"
              value={captionEn}
              onChange={(e) => setCaptionEn(e.target.value)}
              placeholder="e.g. High-pressure hydraulic vulcanizing press production line"
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: "2rem", paddingTop: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Mark as Featured Photograph</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Publish Immediately</span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={isSubmitting || !file}
            >
              {isSubmitting ? "Uploading…" : "Save Photograph"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ──
interface EditModalProps {
  item: GalleryItem;
  onClose: () => void;
  onUpdated: (updatedItem: Partial<GalleryItem>) => void;
}

function EditModal({ item, onClose, onUpdated }: EditModalProps) {
  const [category, setCategory] = useState<GalleryCategory>(item.category);
  const [captionId, setCaptionId] = useState(item.caption_id || "");
  const [captionEn, setCaptionEn] = useState(item.caption_en || "");
  const [isFeatured, setIsFeatured] = useState(item.is_featured);
  const [isPublished, setIsPublished] = useState(item.is_published);
  const [displayOrder, setDisplayOrder] = useState(item.display_order);

  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [replacementPreview, setReplacementPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleReplacementFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      setError("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (selected.size > 8 * 1024 * 1024) {
      setError("File size exceeds 8MB limit.");
      return;
    }

    setError(null);
    setReplacementFile(selected);
    setReplacementPreview(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let newImagePayload:
        | { fileName: string; contentType: AllowedGalleryMimeType; fileBase64: string }
        | undefined;

      if (replacementFile) {
        const buffer = await replacementFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        newImagePayload = {
          fileName: replacementFile.name,
          contentType: replacementFile.type as AllowedGalleryMimeType,
          fileBase64: base64,
        };
      }

      await updateAdminGalleryItem({
        data: {
          id: item.id,
          category,
          caption_id: captionId || null,
          caption_en: captionEn || null,
          is_featured: isFeatured,
          is_published: isPublished,
          display_order: displayOrder,
          newImage: newImagePayload,
        },
      });

      toast.success("Gallery item updated successfully.");
      onUpdated({
        category,
        caption_id: captionId || null,
        caption_en: captionEn || null,
        is_featured: isFeatured,
        is_published: isPublished,
        display_order: displayOrder,
        ...(replacementPreview ? { image_url: replacementPreview, is_placeholder: false } : {}),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update item.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
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
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "1.75rem 2rem",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(41, 41, 37, 0.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--charcoal)" }}>
            Edit Gallery Item
          </h2>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ padding: "0.25rem 0.5rem" }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              color: "var(--admin-danger-text)",
              fontSize: "0.8125rem",
              borderRadius: "2px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Current Image & Replacement Option */}
          <div>
            <label className="admin-label">Current Photograph</label>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", background: "var(--sand)", padding: "0.75rem", borderRadius: "2px" }}>
              <img
                src={replacementPreview || item.image_url}
                alt="Preview"
                style={{ width: "90px", height: "60px", objectFit: "cover", borderRadius: "2px", border: "1px solid var(--border)" }}
              />
              <div style={{ fontSize: "0.8125rem" }}>
                {item.is_placeholder && !replacementPreview && (
                  <div style={{ color: "var(--ochre)", fontWeight: 600, marginBottom: "4px" }}>
                    ⚠️ Temporary Placeholder
                  </div>
                )}
                <div style={{ color: "var(--muted-olive)" }}>
                  {replacementFile ? `New file: ${replacementFile.name}` : item.image_path}
                </div>
              </div>
            </div>

            {/* Replace photo input */}
            <div style={{ marginTop: "0.75rem" }}>
              <label className="admin-label" htmlFor="replace-image-file" style={{ fontSize: "0.75rem" }}>
                Replace With Real Photograph (Optional)
              </label>
              <input
                id="replace-image-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleReplacementFileChange}
                disabled={isSubmitting}
                className="admin-input"
                style={{ padding: "0.4rem" }}
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="admin-label" htmlFor="edit-category-select">
              Category
            </label>
            <select
              id="edit-category-select"
              className="admin-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as GalleryCategory)}
              disabled={isSubmitting}
            >
              {GALLERY_CATEGORY_LIST.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.code} — {cat.name_en} ({cat.name_id})
                </option>
              ))}
            </select>
          </div>

          {/* Indonesian Caption */}
          <div>
            <label className="admin-label" htmlFor="edit-caption-id">
              Indonesian Caption (ID)
            </label>
            <input
              id="edit-caption-id"
              type="text"
              className="admin-input"
              value={captionId}
              onChange={(e) => setCaptionId(e.target.value)}
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>

          {/* English Caption */}
          <div>
            <label className="admin-label" htmlFor="edit-caption-en">
              English Caption (EN)
            </label>
            <input
              id="edit-caption-en"
              type="text"
              className="admin-input"
              value={captionEn}
              onChange={(e) => setCaptionEn(e.target.value)}
              maxLength={500}
              disabled={isSubmitting}
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="admin-label" htmlFor="edit-display-order">
              Display Order
            </label>
            <input
              id="edit-display-order"
              type="number"
              className="admin-input"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              disabled={isSubmitting}
              style={{ width: "120px" }}
            />
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: "2rem", paddingTop: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Mark as Featured</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                disabled={isSubmitting}
              />
              <span>Published on Website</span>
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Dialog ──
interface DeleteDialogProps {
  item: GalleryItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteDialog({ item, onClose, onDeleted }: DeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAdminGalleryItem({ data: { id: item.id } });
      toast.success("Gallery item deleted.");
      onDeleted(item.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Deletion failed.";
      setError(msg);
      toast.error(msg);
      setIsDeleting(false);
    }
  }

  return (
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
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
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
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.125rem", fontWeight: 600, color: "var(--admin-danger-text)" }}>
          Delete Gallery Photograph
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", lineHeight: "1.6", color: "var(--charcoal)" }}>
          Are you sure you want to delete this photograph from the factory gallery?
          {item.is_placeholder
            ? " This is currently a temporary placeholder schematic."
            : " The uploaded image file will also be permanently deleted from cloud storage."}
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.625rem 0.75rem",
              marginBottom: "1rem",
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              color: "var(--admin-danger-text)",
              fontSize: "0.8125rem",
              borderRadius: "2px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Yes, Delete Photograph"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Gallery Page ──
function AdminGalleryPage() {
  const { items: initialItems } = Route.useLoaderData();
  const router = useRouter();

  const [items, setItems] = useState<GalleryItem[]>(initialItems);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [placeholderFilter, setPlaceholderFilter] = useState<string>("all");

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GalleryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (statusFilter === "published" && !item.is_published) return false;
      if (statusFilter === "unpublished" && item.is_published) return false;
      if (placeholderFilter === "placeholders" && !item.is_placeholder) return false;
      if (placeholderFilter === "real" && item.is_placeholder) return false;
      return true;
    });
  }, [items, categoryFilter, statusFilter, placeholderFilter]);

  // Quick reorder helpers
  async function handleMoveOrder(item: GalleryItem, direction: "up" | "down") {
    const sorted = [...items].sort((a, b) => a.display_order - b.display_order);
    const index = sorted.findIndex((i) => i.id === item.id);
    if (index === -1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const targetItem = sorted[swapIndex];
    if (!targetItem) return;
    const currentOrder = item.display_order;
    const targetOrder = targetItem.display_order;

    // Swap display orders
    const newItems = items.map((i) => {
      if (i.id === item.id) return { ...i, display_order: targetOrder };
      if (i.id === targetItem.id) return { ...i, display_order: currentOrder };
      return i;
    });

    setItems(newItems);

    try {
      await reorderAdminGalleryItems({
        data: {
          items: [
            { id: item.id, display_order: targetOrder },
            { id: targetItem.id, display_order: currentOrder },
          ],
        },
      });
      toast.success("Order updated.");
    } catch (err: unknown) {
      toast.error("Failed to persist order change.");
      router.invalidate();
    }
  }

  async function handleTogglePublish(item: GalleryItem) {
    const nextPublished = !item.is_published;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_published: nextPublished } : i)),
    );

    try {
      await updateAdminGalleryItem({
        data: {
          id: item.id,
          category: item.category,
          caption_id: item.caption_id,
          caption_en: item.caption_en,
          is_featured: item.is_featured,
          is_published: nextPublished,
          display_order: item.display_order,
        },
      });
      toast.success(nextPublished ? "Item published to gallery." : "Item unpublished.");
    } catch {
      toast.error("Failed to update status.");
      router.invalidate();
    }
  }

  async function handleToggleFeatured(item: GalleryItem) {
    const nextFeatured = !item.is_featured;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_featured: nextFeatured } : i)),
    );

    try {
      await updateAdminGalleryItem({
        data: {
          id: item.id,
          category: item.category,
          caption_id: item.caption_id,
          caption_en: item.caption_en,
          is_featured: nextFeatured,
          is_published: item.is_published,
          display_order: item.display_order,
        },
      });
      toast.success(nextFeatured ? "Marked as featured photograph." : "Unmarked as featured.");
    } catch {
      toast.error("Failed to update featured flag.");
      router.invalidate();
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
        <div>
          <h1 className="admin-title" style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700, color: "var(--charcoal)" }}>
            Factory Gallery Management
          </h1>
          <p className="admin-subtitle" style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted-olive)" }}>
            Curate photographs of Outsole by ODE facilities, machinery, manufacturing processes, and warehouse storage.
          </p>
        </div>
        <button
          id="admin-upload-gallery-btn"
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => setUploadModalOpen(true)}
        >
          + Upload Photograph
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="admin-card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          padding: "1rem 1.25rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
          <select
            id="gallery-filter-category"
            className="admin-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {GALLERY_CATEGORY_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>

          <select
            id="gallery-filter-status"
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="published">Published Only</option>
            <option value="unpublished">Unpublished Only</option>
          </select>

          <select
            id="gallery-filter-placeholder"
            className="admin-select"
            value={placeholderFilter}
            onChange={(e) => setPlaceholderFilter(e.target.value)}
          >
            <option value="all">All Assets</option>
            <option value="real">Real Photographs Only</option>
            <option value="placeholders">Temporary Placeholders Only</option>
          </select>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)", fontFamily: "var(--font-mono, monospace)" }}>
          Showing {filteredItems.length} of {items.length} item{items.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Gallery Table */}
      <div className="admin-table-card">
        {filteredItems.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted-olive)" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>No gallery photographs found</p>
            <p style={{ margin: 0, fontSize: "0.75rem" }}>Try adjusting filter options or upload a new factory photograph.</p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-table" id="admin-gallery-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>Order</th>
                  <th style={{ width: "80px" }}>Thumbnail</th>
                  <th>Category</th>
                  <th>Captions (ID / EN)</th>
                  <th>Type</th>
                  <th>Featured</th>
                  <th>Published</th>
                  <th style={{ textAlign: "right", width: "160px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, idx) => {
                  const catMeta = GALLERY_CATEGORIES[item.category];
                  return (
                    <tr key={item.id} id={`gallery-row-${item.id}`}>
                      {/* Order Controls */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(item, "up")}
                            disabled={idx === 0}
                            style={{
                              border: "none",
                              background: "none",
                              cursor: idx === 0 ? "default" : "pointer",
                              opacity: idx === 0 ? 0.2 : 0.7,
                              padding: 0,
                            }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem" }}>
                            {item.display_order}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(item, "down")}
                            disabled={idx === filteredItems.length - 1}
                            style={{
                              border: "none",
                              background: "none",
                              cursor: idx === filteredItems.length - 1 ? "default" : "pointer",
                              opacity: idx === filteredItems.length - 1 ? 0.2 : 0.7,
                              padding: 0,
                            }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                      </td>

                      {/* Thumbnail */}
                      <td>
                        <img
                          src={item.image_url}
                          alt={item.caption_en || item.caption_id || "Gallery preview"}
                          className="admin-table-thumb"
                          style={{ width: "64px", height: "48px", objectFit: "cover", borderRadius: "2px" }}
                          onError={(e) => {
                            const fallback = FALLBACK_PLACEHOLDERS[item.category];
                            if (!e.currentTarget.src.endsWith(fallback)) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />
                      </td>

                      {/* Category */}
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--charcoal)", fontSize: "0.8125rem" }}>
                          {catMeta?.name_en ?? item.category}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted-olive)" }}>
                          {catMeta?.name_id}
                        </div>
                      </td>

                      {/* Captions */}
                      <td style={{ maxWidth: "280px" }}>
                        <div style={{ fontSize: "0.8125rem", color: "var(--charcoal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--primary)", marginRight: "4px" }}>ID:</span>
                          {item.caption_id || <span style={{ color: "var(--muted-olive)", fontStyle: "italic" }}>None</span>}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "var(--muted-olive)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--ochre)", marginRight: "4px" }}>EN:</span>
                          {item.caption_en || <span style={{ fontStyle: "italic" }}>None</span>}
                        </div>
                      </td>

                      {/* Type (Placeholder vs Real) */}
                      <td>
                        {item.is_placeholder ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: "2px",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              background: "var(--sand)",
                              color: "var(--ochre)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            Placeholder
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 6px",
                              borderRadius: "2px",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              background: "rgba(8, 59, 123, 0.08)",
                              color: "var(--deep-blue)",
                              border: "1px solid rgba(8, 59, 123, 0.2)",
                            }}
                          >
                            Real Photo
                          </span>
                        )}
                      </td>

                      {/* Featured Toggle */}
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(item)}
                          style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontSize: "1.125rem",
                            color: item.is_featured ? "var(--ochre)" : "var(--border)",
                          }}
                          title={item.is_featured ? "Featured (Click to unfeature)" : "Standard (Click to feature)"}
                        >
                          {item.is_featured ? "★" : "☆"}
                        </button>
                      </td>

                      {/* Published Toggle */}
                      <td>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(item)}
                          className={item.is_published ? "admin-badge admin-badge-active" : "admin-badge admin-badge-draft"}
                          style={{ cursor: "pointer" }}
                        >
                          {item.is_published ? "Published" : "Draft"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary"
                            onClick={() => setEditTarget(item)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() => setDeleteTarget(item)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <UploadModal
          nextOrder={items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 1}
          onClose={() => setUploadModalOpen(false)}
          onCreated={(newItem) => {
            setItems((prev) => [...prev, newItem]);
            setUploadModalOpen(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditModal
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(updatedFields) => {
            setItems((prev) =>
              prev.map((i) => (i.id === editTarget.id ? { ...i, ...updatedFields } : i)),
            );
            setEditTarget(null);
          }}
        />
      )}

      {/* Delete Dialog */}
      {deleteTarget && (
        <DeleteDialog
          item={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={(id) => {
            setItems((prev) => prev.filter((i) => i.id !== id));
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
