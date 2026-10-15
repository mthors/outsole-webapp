import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { FactoryInfoRowItem } from "@/lib/factory-info-types";
import {
  updateAdminFactoryInfoRow,
  uploadAdminFactoryInfoImage,
} from "@/lib/admin-factory-info.functions";

const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

interface FactoryInfoRowEditorCardProps {
  row: FactoryInfoRowItem;
  tableExists: boolean;
  onSaved: () => Promise<void> | void;
}

export function FactoryInfoRowEditorCard({
  row,
  tableExists,
  onSaved,
}: FactoryInfoRowEditorCardProps) {
  const [activeLang, setActiveLang] = useState<"id" | "en">("id");

  // Indonesian field state
  const [titleId, setTitleId] = useState(row.title_id || "");
  const [descriptionId, setDescriptionId] = useState(row.description_id || "");
  const [altTextId, setAltTextId] = useState(row.alt_text_id || "");

  // English field state
  const [titleEn, setTitleEn] = useState(row.title_en || "");
  const [descriptionEn, setDescriptionEn] = useState(row.description_en || "");
  const [altTextEn, setAltTextEn] = useState(row.alt_text_en || "");

  // Publication state
  const [isPublished, setIsPublished] = useState(row.is_published ?? true);

  // Image upload & preview state
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(row.image_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever row prop changes
  useEffect(() => {
    setTitleId(row.title_id || "");
    setDescriptionId(row.description_id || "");
    setAltTextId(row.alt_text_id || "");
    setTitleEn(row.title_en || "");
    setDescriptionEn(row.description_en || "");
    setAltTextEn(row.alt_text_en || "");
    setIsPublished(row.is_published ?? true);
    setCurrentImageUrl(row.image_url);
  }, [row]);

  const isDirty =
    titleId !== (row.title_id || "") ||
    descriptionId !== (row.description_id || "") ||
    altTextId !== (row.alt_text_id || "") ||
    titleEn !== (row.title_en || "") ||
    descriptionEn !== (row.description_en || "") ||
    altTextEn !== (row.alt_text_en || "") ||
    isPublished !== (row.is_published ?? true);

  // Check missing translation fields
  const missingEnFields: string[] = [];
  if (!titleEn.trim()) missingEnFields.push("heading");
  if (!descriptionEn.trim()) missingEnFields.push("description");
  if (!altTextEn.trim()) missingEnFields.push("alt text");

  const missingIdFields: string[] = [];
  if (!titleId.trim()) missingIdFields.push("heading");
  if (!descriptionId.trim()) missingIdFields.push("description");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null);
    setSuccessMsg(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMsg("Invalid file type. Only JPG, PNG, and WebP images are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`Selected image is ${sizeMb} MB. Maximum allowed size is 8 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objUrl);
  }

  function handleClearFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleUploadImage() {
    if (!selectedFile || isUploading) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploading(true);
    setUploadStatus("Reading image file…");

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const idx = res.indexOf(",");
          resolve(idx !== -1 ? res.slice(idx + 1) : res);
        };
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(selectedFile);
      });

      setUploadStatus("Validating and uploading to private storage…");

      const mime =
        selectedFile.type && ALLOWED_MIME_TYPES.includes(selectedFile.type)
          ? (selectedFile.type as (typeof ALLOWED_MIME_TYPES)[number])
          : "image/jpeg";

      const res = await uploadAdminFactoryInfoImage({
        data: {
          id: row.id,
          fileName: selectedFile.name,
          contentType: mime,
          fileBase64: base64,
        },
      });

      if (res.success) {
        setCurrentImageUrl(res.imageUrl);
        handleClearFile();
        setSuccessMsg("Image uploaded successfully and published for this row.");
        toast.success(`Image uploaded for ${row.id === "row_1" ? "Row 1" : "Row 2"}`);
        await onSaved();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
    }
  }

  async function handleSaveRow() {
    if (!titleId.trim()) {
      setErrorMsg("Indonesian heading is required.");
      return;
    }
    if (!descriptionId.trim()) {
      setErrorMsg("Indonesian description is required.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const res = await updateAdminFactoryInfoRow({
        data: {
          id: row.id,
          title_id: titleId.trim(),
          title_en: titleEn.trim(),
          description_id: descriptionId.trim(),
          description_en: descriptionEn.trim(),
          alt_text_id: altTextId.trim(),
          alt_text_en: altTextEn.trim(),
          is_published: isPublished,
        },
      });

      if (res.success) {
        setSuccessMsg("Row text and publication status saved successfully.");
        toast.success(`Saved changes for ${row.id === "row_1" ? "Row 1" : "Row 2"}`);
        await onSaved();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save row changes.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setTitleId(row.title_id || "");
    setDescriptionId(row.description_id || "");
    setAltTextId(row.alt_text_id || "");
    setTitleEn(row.title_en || "");
    setDescriptionEn(row.description_en || "");
    setAltTextEn(row.alt_text_en || "");
    setIsPublished(row.is_published ?? true);
    setErrorMsg(null);
    setSuccessMsg(null);
    handleClearFile();
  }

  const rowFriendlyTitle =
    row.id === "row_1"
      ? "Row 01 — Machinery & Press Lines (Upper Row)"
      : "Row 02 — Process & Compound Engineering (Lower Row)";

  return (
    <div
      id={`factory-info-card-${row.id}`}
      style={{
        background: "var(--admin-card-bg)",
        border: isDirty || selectedFile ? "1px solid var(--charcoal)" : "1px solid var(--admin-card-border)",
        borderRadius: "4px",
        overflow: "hidden",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          padding: "1rem 1.25rem",
          background: "var(--admin-bg)",
          borderBottom: "1px solid var(--admin-card-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "var(--admin-text-main)",
              letterSpacing: "-0.01em",
            }}
          >
            {rowFriendlyTitle}
          </h2>

          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.6875rem",
              padding: "0.2rem 0.5rem",
              background: "var(--admin-badge-bg)",
              color: "var(--admin-text-muted)",
              borderRadius: "4px",
              border: "1px solid var(--admin-card-border)",
            }}
          >
            {row.id}
          </span>

          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              background: isPublished ? "var(--admin-status-active-bg)" : "var(--admin-bg)",
              color: isPublished ? "var(--admin-status-active-text)" : "var(--admin-text-muted)",
              border: `1px solid ${isPublished ? "var(--admin-status-active-border)" : "var(--admin-card-border)"}`,
            }}
          >
            {isPublished ? "Published" : "Hidden / Draft"}
          </span>

          {missingEnFields.length > 0 && (
            <span
              style={{
                fontSize: "0.6875rem",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: "rgba(168, 108, 37, 0.12)",
                color: "var(--ochre)",
                border: "1px solid rgba(168, 108, 37, 0.3)",
              }}
            >
              EN missing: {missingEnFields.join(", ")}
            </span>
          )}

          {isDirty && (
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--ochre)",
                background: "rgba(168, 108, 37, 0.12)",
                padding: "0.2rem 0.45rem",
                borderRadius: "4px",
                border: "1px solid rgba(168, 108, 37, 0.3)",
              }}
            >
              Unsaved Changes
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--admin-text-muted)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Updated {formatDate(row.updated_at)}
          </span>
        </div>
      </div>

      {/* Target Scope Notice */}
      <div
        style={{
          padding: "0.625rem 1.25rem",
          background: "var(--admin-bg)",
          borderBottom: "1px solid var(--admin-card-border)",
          fontSize: "0.75rem",
          color: "var(--admin-text-muted)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--admin-text-main)" }}>Page Target:</span>
        <a
          href="/about#factory-gallery"
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: "var(--font-mono, monospace)",
            padding: "0.15rem 0.4rem",
            background: "var(--admin-badge-bg)",
            borderRadius: "4px",
            color: "var(--admin-text-main)",
            textDecoration: "none",
          }}
        >
          /about#factory-gallery ↗
        </a>
        <span>· Public About page factory information horizontal row</span>
      </div>

      {/* Pending Migration Banner if table does not exist */}
      {!tableExists && (
        <div
          role="alert"
          style={{
            padding: "0.75rem 1.25rem",
            background: "rgba(168, 108, 37, 0.08)",
            borderBottom: "1px solid rgba(168, 108, 37, 0.25)",
            color: "var(--charcoal)",
            fontSize: "0.8125rem",
            lineHeight: 1.5,
          }}
        >
          <strong>Notice:</strong> Database table <code>factory_info_rows</code> has not been created yet in your Supabase project.
          Public About page is currently serving authentic code defaults. To persist live edits and image uploads, apply migration{" "}
          <code>supabase/migrations/20261014140000_factory_info_rows.sql</code>.
        </div>
      )}

      {/* Card Content Body */}
      <div style={{ padding: "1.25rem", display: "grid", gap: "1.5rem" }}>
        {/* Feedback Banners */}
        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "4px",
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              color: "var(--admin-danger-text)",
              fontSize: "0.8125rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: "0 0.25rem",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "4px",
              background: "var(--admin-status-active-bg)",
              border: "1px solid var(--admin-status-active-border)",
              color: "var(--admin-status-active-text)",
              fontSize: "0.8125rem",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Missing image warning if published without image */}
        {isPublished && !row.image_path && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "4px",
              background: "rgba(168, 108, 37, 0.1)",
              border: "1px solid rgba(168, 108, 37, 0.3)",
              color: "var(--charcoal)",
              fontSize: "0.8125rem",
            }}
          >
            ⚠️ <strong>Warning:</strong> This row is published but has no image configured. A fallback schematic will be displayed publicly.
          </div>
        )}

        {/* 1. VISUAL CURRENT IMAGE & PREVIEW */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.625rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <label
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--admin-text-main)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Row Image (Aspect Ratio 4:3)
            </label>
            {row.image_path && (
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontFamily: "var(--font-mono, monospace)",
                  color: "var(--admin-text-muted)",
                  background: "var(--admin-bg)",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--admin-card-border)",
                }}
              >
                Path: {row.image_path}
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* Current Active Image Display */}
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginBottom: "0.35rem", display: "block" }}>
                Current Public Image:
              </span>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/3",
                  maxHeight: "220px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  border: "1px solid var(--admin-card-border)",
                  background: "#1F201C",
                }}
              >
                {currentImageUrl ? (
                  <img
                    src={currentImageUrl}
                    alt={altTextId || altTextEn || "Current factory row photograph"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      height: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--admin-text-muted)",
                      fontSize: "0.8125rem",
                    }}
                  >
                    No image configured
                  </div>
                )}
                {row.is_placeholder && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "0.5rem",
                      left: "0.5rem",
                      fontSize: "0.625rem",
                      fontFamily: "var(--font-mono, monospace)",
                      textTransform: "uppercase",
                      padding: "0.2rem 0.4rem",
                      borderRadius: "2px",
                      background: "rgba(41, 41, 37, 0.85)",
                      color: "var(--ochre)",
                      border: "1px solid rgba(229, 222, 210, 0.2)",
                    }}
                  >
                    Schematic Placeholder
                  </span>
                )}
              </div>
            </div>

            {/* Replace Image Upload Dropzone */}
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginBottom: "0.35rem", display: "block" }}>
                Upload Replacement Image:
              </span>
              <div
                style={{
                  padding: "1rem",
                  border: "1px dashed var(--admin-card-border)",
                  borderRadius: "4px",
                  background: "var(--admin-bg)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: "180px",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  style={{ display: "none" }}
                  id={`file-input-${row.id}`}
                />

                {!selectedFile ? (
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8125rem", color: "var(--admin-text-main)" }}>
                      JPG, PNG, or WebP up to 8 MB.
                    </p>
                    <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                      Recommended: 800×600 or 4:3 aspect ratio.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                    >
                      Select Image File…
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Selected preview"
                          style={{
                            width: "60px",
                            height: "45px",
                            objectFit: "cover",
                            borderRadius: "2px",
                            border: "1px solid var(--admin-card-border)",
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {selectedFile.name}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                          {(selectedFile.size / 1024).toFixed(0)} KB · Ready to upload
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={handleUploadImage}
                        disabled={isUploading}
                        className="admin-btn admin-btn-primary admin-btn-sm"
                      >
                        {isUploading ? (uploadStatus || "Uploading…") : "Upload & Replace Image"}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        disabled={isUploading}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. BILINGUAL EDITING TABS */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
              borderBottom: "1px solid var(--admin-card-border)",
              paddingBottom: "0.5rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setActiveLang("id")}
                className={`admin-btn admin-btn-sm ${activeLang === "id" ? "admin-btn-primary" : "admin-btn-secondary"}`}
              >
                🇮🇩 Bahasa Indonesia (Default)
              </button>
              <button
                type="button"
                onClick={() => setActiveLang("en")}
                className={`admin-btn admin-btn-sm ${activeLang === "en" ? "admin-btn-primary" : "admin-btn-secondary"}`}
              >
                🇬🇧 English
              </button>
            </div>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer",
                fontSize: "0.8125rem",
                color: "var(--admin-text-main)",
              }}
            >
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <span>Published on public About page</span>
            </label>
          </div>

          {/* Indonesian Language Fields */}
          {activeLang === "id" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <div className="admin-form-group">
                <label className="admin-label">
                  Indonesian Heading (Judul Utama) <span style={{ color: "var(--admin-danger-text)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="admin-input"
                  value={titleId}
                  onChange={(e) => setTitleId(e.target.value)}
                  placeholder="e.g. Lini Pengepresan & Vulkanisasi Outsole"
                  maxLength={255}
                />
                <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                  Do not translate the word &ldquo;outsole&rdquo;.
                </span>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">
                  Indonesian Description (Deskripsi Rinci) <span style={{ color: "var(--admin-danger-text)" }}>*</span>
                </label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  value={descriptionId}
                  onChange={(e) => setDescriptionId(e.target.value)}
                  placeholder="Deskripsi kemampuan mesin atau proses pemrosesan kompon outsole..."
                  maxLength={3000}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Image Alt Text (Teks Aksesibilitas Gambar - ID)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={altTextId}
                  onChange={(e) => setAltTextId(e.target.value)}
                  placeholder="Deskripsi foto untuk pembaca layar..."
                  maxLength={300}
                />
              </div>
            </div>
          )}

          {/* English Language Fields */}
          {activeLang === "en" && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <div className="admin-form-group">
                <label className="admin-label">English Heading</label>
                <input
                  type="text"
                  className="admin-input"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. Outsole Pressing & Vulcanization Lines"
                  maxLength={255}
                />
                <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                  If left empty, falls back to Indonesian heading.
                </span>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">English Description</label>
                <textarea
                  className="admin-textarea"
                  rows={4}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  placeholder="Detailed description of facility machinery or compounding process..."
                  maxLength={3000}
                />
                <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                  If left empty, falls back to Indonesian description.
                </span>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">English Image Alt Text</label>
                <input
                  type="text"
                  className="admin-input"
                  value={altTextEn}
                  onChange={(e) => setAltTextEn(e.target.value)}
                  placeholder="Screen reader alt text for English locale..."
                  maxLength={300}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. CARD ACTIONS FOOTER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "1rem",
            borderTop: "1px solid var(--admin-card-border)",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleSaveRow}
              disabled={isSaving || !isDirty}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              {isSaving ? "Saving…" : "Save Text & Status"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving || (!isDirty && !selectedFile)}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              Reset
            </button>
          </div>

          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--admin-text-muted)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            {isDirty ? "● Unsaved edits" : "✓ In sync with database"}
          </span>
        </div>
      </div>
    </div>
  );
}
