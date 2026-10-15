import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  listAdminOutsoles,
  archiveAdminOutsole,
  restoreAdminOutsole,
  bulkArchiveAdminOutsoles,
  bulkRestoreAdminOutsoles,
  deleteAdminOutsole,
  bulkDeleteAdminOutsoles,
  type AdminOutsoleListItem,
} from "@/lib/admin-outsoles.functions";

export const Route = createFileRoute("/admin/_layout/outsoles/")({
  loader: async () => {
    return await listAdminOutsoles();
  },
  component: AdminOutsolesListPage,
});

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG 1: Single Archive Dialog
// ─────────────────────────────────────────────────────────────────────────────
interface ArchiveDialogProps {
  item: AdminOutsoleListItem;
  onClose: () => void;
  onArchived: (id: string, name: string) => void;
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
        onArchived(item.id, item.name);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Archive failed. Please try again.");
      setIsArchiving(false);
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
        if (e.target === e.currentTarget && !isArchiving) onClose();
      }}
    >
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
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "40px",
              height: "40px",
              borderRadius: "2px",
              background: "rgba(119, 121, 107, 0.12)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--charcoal)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            <p
              style={{
                margin: 0,
                fontSize: "0.6875rem",
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--muted-olive)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {item.model_number} · {item.slug}
            </p>
          </div>
        </div>

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
          ℹ This is not a permanent deletion. You can restore this product to the public catalog at
          any time.
        </p>

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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

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
              background: "var(--charcoal)",
              color: "#FFFFFF",
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
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "#FFFFFF",
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

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG 2: Bulk Archive Dialog
// ─────────────────────────────────────────────────────────────────────────────
interface BulkArchiveDialogProps {
  items: AdminOutsoleListItem[];
  onClose: () => void;
  onArchived: (count: number, skipped: number) => void;
}

function BulkArchiveDialog({ items, onClose, onArchived }: BulkArchiveDialogProps) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = useMemo(() => items.filter((i) => i.status !== "archived"), [items]);
  const alreadyArchived = useMemo(() => items.filter((i) => i.status === "archived"), [items]);

  async function handleBulkArchive() {
    if (eligible.length === 0) {
      onClose();
      return;
    }
    setIsArchiving(true);
    setError(null);
    try {
      const result = await bulkArchiveAdminOutsoles({
        data: { ids: eligible.map((i) => i.id) },
      });
      if (result.success) {
        onArchived(result.archivedCount, result.skippedCount + alreadyArchived.length);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bulk archive failed. Please try again.");
      setIsArchiving(false);
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
        if (e.target === e.currentTarget && !isArchiving) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="bulk-archive-dialog-title"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "1.75rem 2rem",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 24px 64px rgba(41, 41, 37, 0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "40px",
              height: "40px",
              borderRadius: "2px",
              background: "rgba(119, 121, 107, 0.12)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--charcoal)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 8v13H3V8" />
              <path d="M1 3h22v5H1z" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </div>
          <div>
            <h2
              id="bulk-archive-dialog-title"
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--charcoal)",
              }}
            >
              Archive {eligible.length} Selected Product{eligible.length === 1 ? "" : "s"}?
            </h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-olive)" }}>
              {items.length} total product{items.length === 1 ? "" : "s"} currently selected
            </p>
          </div>
        </div>

        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.875rem",
            lineHeight: "1.6",
            color: "var(--charcoal)",
          }}
        >
          The selected products will be removed from the public catalog. All product data, technical
          specifications, and images will remain manageable in the admin panel and can be restored
          at any time.
        </p>

        {alreadyArchived.length > 0 && (
          <p
            style={{
              margin: "0 0 1rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.75rem",
              background: "rgba(119, 121, 107, 0.08)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              color: "var(--muted-olive)",
            }}
          >
            ℹ <strong>{alreadyArchived.length}</strong> selected product
            {alreadyArchived.length === 1 ? " is" : "s are"} already archived and will not be
            modified.
          </p>
        )}

        {/* Selected products list preview */}
        <div
          style={{
            maxHeight: "140px",
            overflowY: "auto",
            marginBottom: "1.25rem",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            padding: "0.5rem",
            background: "var(--sand)",
          }}
        >
          {eligible.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.3rem 0.5rem",
                fontSize: "0.75rem",
                borderBottom: "1px solid rgba(41, 41, 37, 0.08)",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--charcoal)" }}>{item.name}</span>
              <span
                style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--muted-olive)" }}
              >
                {item.model_number}
              </span>
            </div>
          ))}
        </div>

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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isArchiving}
          >
            Cancel
          </button>
          <button
            id="bulk-archive-dialog-confirm-btn"
            type="button"
            onClick={handleBulkArchive}
            disabled={isArchiving || eligible.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "2px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              border: "none",
              background: "var(--charcoal)",
              color: "#FFFFFF",
              cursor: isArchiving || eligible.length === 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              opacity: isArchiving || eligible.length === 0 ? 0.6 : 1,
            }}
          >
            {isArchiving ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "#FFFFFF",
                    borderRadius: "50%",
                    animation: "admin-spin 0.65s linear infinite",
                  }}
                />
                <span>Archiving…</span>
              </>
            ) : (
              `Archive (${eligible.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG 3: Restore Dialog (Single or Bulk)
// ─────────────────────────────────────────────────────────────────────────────
interface RestoreDialogProps {
  items: AdminOutsoleListItem[];
  onClose: () => void;
  onRestored: (count: number, skipped: number) => void;
}

function RestoreDialog({ items, onClose, onRestored }: RestoreDialogProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = useMemo(() => items.filter((i) => i.status === "archived"), [items]);
  const alreadyActive = useMemo(() => items.filter((i) => i.status !== "archived"), [items]);

  async function handleRestore() {
    if (eligible.length === 0) {
      onClose();
      return;
    }
    setIsRestoring(true);
    setError(null);
    const firstEligible = eligible[0];
    try {
      if (eligible.length === 1 && items.length === 1 && firstEligible) {
        const result = await restoreAdminOutsole({ data: { id: firstEligible.id } });
        if (result.success) {
          onRestored(1, 0);
        }
      } else {
        const result = await bulkRestoreAdminOutsoles({
          data: { ids: eligible.map((i) => i.id) },
        });
        if (result.success) {
          onRestored(result.restoredCount, result.skippedCount + alreadyActive.length);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Restore failed. Please try again.");
      setIsRestoring(false);
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
        if (e.target === e.currentTarget && !isRestoring) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="restore-dialog-title"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "1.75rem 2rem",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 24px 64px rgba(41, 41, 37, 0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "40px",
              height: "40px",
              borderRadius: "2px",
              background: "rgba(8, 59, 123, 0.08)",
              border: "1px solid rgba(8, 59, 123, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--deep-blue)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </div>
          <div>
            <h2
              id="restore-dialog-title"
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--charcoal)",
              }}
            >
              Restore{" "}
              {eligible.length === 1
                ? (eligible[0]?.name ?? "Product")
                : `${eligible.length} Products`}{" "}
              to Active?
            </h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted-olive)" }}>
              Restoring product{eligible.length === 1 ? "" : "s"} to public showcase
            </p>
          </div>
        </div>

        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.875rem",
            lineHeight: "1.6",
            color: "var(--charcoal)",
          }}
        >
          {eligible.length === 1 ? (
            <>
              Restoring <strong style={{ color: "var(--charcoal)" }}>{eligible[0]?.name}</strong>{" "}
              will return its status to <strong>Active</strong>, immediately making it visible in
              the public digital showcase and catalog.
            </>
          ) : (
            <>
              Restoring the {eligible.length} selected products will return their status to{" "}
              <strong>Active</strong>, immediately displaying them in the public catalog.
            </>
          )}
        </p>

        {alreadyActive.length > 0 && (
          <p
            style={{
              margin: "0 0 1rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.75rem",
              background: "rgba(119, 121, 107, 0.08)",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              color: "var(--muted-olive)",
            }}
          >
            ℹ <strong>{alreadyActive.length}</strong> selected product
            {alreadyActive.length === 1 ? " is" : "s are"} already active or draft and will not be
            affected.
          </p>
        )}

        {eligible.length > 1 && (
          <div
            style={{
              maxHeight: "130px",
              overflowY: "auto",
              marginBottom: "1.25rem",
              border: "1px solid var(--border)",
              borderRadius: "2px",
              padding: "0.5rem",
              background: "var(--sand)",
            }}
          >
            {eligible.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.3rem 0.5rem",
                  fontSize: "0.75rem",
                  borderBottom: "1px solid rgba(41, 41, 37, 0.08)",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--charcoal)" }}>{item.name}</span>
                <span
                  style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--muted-olive)" }}
                >
                  {item.model_number}
                </span>
              </div>
            ))}
          </div>
        )}

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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={onClose}
            disabled={isRestoring}
          >
            Cancel
          </button>
          <button
            id="restore-dialog-confirm-btn"
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleRestore}
            disabled={isRestoring || eligible.length === 0}
            style={{ opacity: isRestoring || eligible.length === 0 ? 0.6 : 1 }}
          >
            {isRestoring ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "#FFFFFF",
                    borderRadius: "50%",
                    animation: "admin-spin 0.65s linear infinite",
                  }}
                />
                <span>Restoring…</span>
              </>
            ) : eligible.length === 1 ? (
              "Restore Product"
            ) : (
              `Restore (${eligible.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DIALOG 4: Permanent Deletion Dialog (Single or Bulk)
// ─────────────────────────────────────────────────────────────────────────────
interface PermanentDeleteDialogProps {
  items: AdminOutsoleListItem[];
  onClose: () => void;
  onDeleted: (deletedCount: number, rejectedCount: number, warnings?: string[]) => void;
}

function PermanentDeleteDialog({ items, onClose, onDeleted }: PermanentDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strictly filter only archived items for permanent deletion
  const eligibleArchived = useMemo(() => items.filter((i) => i.status === "archived"), [items]);
  const ineligibleNonArchived = useMemo(
    () => items.filter((i) => i.status !== "archived"),
    [items],
  );

  async function handleDelete() {
    if (eligibleArchived.length === 0) {
      setError(
        "No archived products selected for deletion. Active and draft products must be archived first.",
      );
      return;
    }

    setIsDeleting(true);
    setError(null);
    const firstArchived = eligibleArchived[0];
    try {
      if (eligibleArchived.length === 1 && items.length === 1 && firstArchived) {
        const result = await deleteAdminOutsole({ data: { id: firstArchived.id } });
        if (result.success) {
          onDeleted(1, 0, result.storageCleanupErrors);
        }
      } else {
        const result = await bulkDeleteAdminOutsoles({
          data: { ids: eligibleArchived.map((i) => i.id) },
        });
        if (result.success) {
          if (result.deletedCount === 0) {
            setError(
              result.rejected[0]?.reason ??
                "None of the selected products could be deleted from the database.",
            );
            setIsDeleting(false);
            return;
          }
          onDeleted(
            result.deletedCount,
            result.rejectedCount + ineligibleNonArchived.length,
            result.storageCleanupErrors,
          );
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deletion failed. Please try again.");
      setIsDeleting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(41, 41, 37, 0.55)",
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
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--border)",
          borderRadius: "2px",
          padding: "1.75rem 2rem",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 24px 64px rgba(41, 41, 37, 0.16)",
        }}
      >
        {/* Header with destructive warning */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "44px",
              height: "44px",
              borderRadius: "2px",
              background: "oklch(0.55 0.16 28 / 0.12)",
              border: "1px solid oklch(0.55 0.16 28 / 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--destructive)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <div>
            <h2
              id="delete-dialog-title"
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1.0625rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--charcoal)",
              }}
            >
              Permanently Delete{" "}
              {eligibleArchived.length === 1
                ? (eligibleArchived[0]?.name ?? "Product")
                : `${eligibleArchived.length} Archived Products`}
              ?
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.6875rem",
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--destructive)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              ⚠ Irreversible Destructive Action
            </p>
          </div>
        </div>

        {/* Description & Warnings */}
        <p
          id="delete-dialog-desc"
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.875rem",
            lineHeight: "1.6",
            color: "var(--charcoal)",
          }}
        >
          This action <strong>cannot be undone</strong>. The selected product records, technical
          specifications, hardness scales, taxonomy associations, and associated product images in
          Storage will be <strong>permanently destroyed</strong>.
        </p>

        <p
          style={{
            margin: "0 0 1rem",
            padding: "0.625rem 0.875rem",
            fontSize: "0.8125rem",
            lineHeight: "1.5",
            color: "var(--charcoal)",
            background: "var(--sand)",
            border: "1px solid var(--border)",
            borderRadius: "2px",
          }}
        >
          🛡 <strong>Data Preservation:</strong> Any customer sample inquiries referencing these
          products will be preserved in your inquiry history as general records, ensuring zero loss
          of business leads.
        </p>

        {ineligibleNonArchived.length > 0 && (
          <div
            style={{
              margin: "0 0 1rem",
              padding: "0.625rem 0.875rem",
              fontSize: "0.75rem",
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              borderRadius: "2px",
              color: "var(--admin-danger-text)",
            }}
          >
            <strong>Note:</strong> {ineligibleNonArchived.length} selected product
            {ineligibleNonArchived.length === 1 ? " is" : "s are"} active/draft and{" "}
            <strong>cannot</strong> be deleted. Only archived products can be permanently deleted.
          </div>
        )}

        {/* Products list preview */}
        <div
          style={{
            maxHeight: "130px",
            overflowY: "auto",
            marginBottom: "1.25rem",
            border: "1px solid var(--border)",
            borderRadius: "2px",
            padding: "0.5rem",
            background: "#FAFAFA",
          }}
        >
          {eligibleArchived.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.3rem 0.5rem",
                fontSize: "0.75rem",
                borderBottom: "1px solid rgba(41, 41, 37, 0.08)",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--charcoal)" }}>{item.name}</span>
              <span
                style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--muted-olive)" }}
              >
                {item.model_number} · /{item.slug}
              </span>
            </div>
          ))}
        </div>

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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
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
            id="delete-dialog-confirm-btn"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || eligibleArchived.length === 0}
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
              color: "#FFFFFF",
              cursor: isDeleting || eligibleArchived.length === 0 ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              opacity: isDeleting || eligibleArchived.length === 0 ? 0.6 : 1,
            }}
          >
            {isDeleting ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "#FFFFFF",
                    borderRadius: "50%",
                    animation: "admin-spin 0.65s linear infinite",
                  }}
                />
                <span>Deleting Permanently…</span>
              </>
            ) : eligibleArchived.length === 1 ? (
              "Permanently Delete"
            ) : (
              `Permanently Delete (${eligibleArchived.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function AdminOutsolesListPage() {
  const { outsoles: initialOutsoles } = Route.useLoaderData();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [samplingFilter, setSamplingFilter] = useState<string>("all");

  // Selection state (keyed by stable product ID)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog targets
  const [archiveTarget, setArchiveTarget] = useState<AdminOutsoleListItem | null>(null);
  const [bulkArchiveOpen, setBulkArchiveOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<AdminOutsoleListItem | null>(null);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminOutsoleListItem[] | null>(null);

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Filtered dataset based on search and filters
  const filteredOutsoles = useMemo(() => {
    return initialOutsoles.filter((item: AdminOutsoleListItem) => {
      // Search filter (name, model number, slug)
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

  // Prune any stale IDs when initialOutsoles reloads
  useEffect(() => {
    const validIds = new Set(initialOutsoles.map((p) => p.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [initialOutsoles]);

  // Current view IDs & selection calculations
  const displayedIds = useMemo(() => filteredOutsoles.map((p) => p.id), [filteredOutsoles]);
  const selectedDisplayedCount = useMemo(() => {
    return displayedIds.filter((id) => selectedIds.has(id)).length;
  }, [displayedIds, selectedIds]);

  const isAllSelected = displayedIds.length > 0 && selectedDisplayedCount === displayedIds.length;
  const isIndeterminate =
    selectedDisplayedCount > 0 && selectedDisplayedCount < displayedIds.length;

  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  function handleSelectAll() {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        displayedIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        displayedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function handleToggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  // Selected products breakdown
  const selectedProducts = useMemo(() => {
    return initialOutsoles.filter((item) => selectedIds.has(item.id));
  }, [initialOutsoles, selectedIds]);

  const eligibleArchiveCount = useMemo(() => {
    return selectedProducts.filter((p) => p.status !== "archived").length;
  }, [selectedProducts]);

  const eligibleRestoreCount = useMemo(() => {
    return selectedProducts.filter((p) => p.status === "archived").length;
  }, [selectedProducts]);

  const eligibleDeleteCount = useMemo(() => {
    return selectedProducts.filter((p) => p.status === "archived").length;
  }, [selectedProducts]);

  // ── Action Handlers ──
  async function handleSingleArchived(id: string, name: string) {
    setArchiveTarget(null);
    setSuccessMessage(`"${name}" has been archived and removed from the public catalog.`);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    await router.invalidate();
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  async function handleBulkArchived(archivedCount: number, skippedCount: number) {
    setBulkArchiveOpen(false);
    let msg = `Successfully archived ${archivedCount} product${archivedCount === 1 ? "" : "s"}.`;
    if (skippedCount > 0) {
      msg += ` (${skippedCount} product${skippedCount === 1 ? " was" : "s were"} already archived and skipped.)`;
    }
    setSuccessMessage(msg);
    handleClearSelection();
    await router.invalidate();
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  async function handleRestored(restoredCount: number, skippedCount: number) {
    setRestoreTarget(null);
    setBulkRestoreOpen(false);
    let msg = `Successfully restored ${restoredCount} product${restoredCount === 1 ? "" : "s"} to active catalog.`;
    if (skippedCount > 0) {
      msg += ` (${skippedCount} product${skippedCount === 1 ? " was" : "s were"} already active and skipped.)`;
    }
    setSuccessMessage(msg);
    handleClearSelection();
    await router.invalidate();
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  async function handleDeleted(deletedCount: number, rejectedCount: number, warnings?: string[]) {
    setDeleteTarget(null);
    handleClearSelection();
    await router.invalidate();

    if (deletedCount === 0) {
      const failMsg = `No products were deleted.${rejectedCount > 0 ? ` (${rejectedCount} product${rejectedCount === 1 ? " was" : "s were"} ineligible or skipped.)` : ""}`;
      setWarningMessage(failMsg);
      setTimeout(() => setWarningMessage(null), 10000);
      return;
    }

    if (warnings && warnings.length > 0) {
      let partialMsg = `Database record${deletedCount === 1 ? "" : "s"} permanently deleted (${deletedCount} product${deletedCount === 1 ? "" : "s"}), but Storage cleanup encountered an issue: ${warnings.join("; ")}`;
      if (rejectedCount > 0) {
        partialMsg += ` (${rejectedCount} product${rejectedCount === 1 ? " was" : "s were"} ineligible or skipped.)`;
      }
      setWarningMessage(partialMsg);
      setTimeout(() => setWarningMessage(null), 12000);
      return;
    }

    let msg = `Permanently deleted ${deletedCount} product${deletedCount === 1 ? "" : "s"}.`;
    if (rejectedCount > 0) {
      msg += ` (${rejectedCount} product${rejectedCount === 1 ? " was" : "s were"} ineligible or skipped.)`;
    }
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 6000);
  }

  return (
    <div className="admin-page" style={{ maxWidth: "1200px" }}>
      <header
        className="admin-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="admin-page-title">Outsole Catalog</h1>
          <p className="admin-page-subtitle">
            Manage outsole products, technical specifications, bulk actions, and lifecycle status.
          </p>
        </div>
        <Link
          to="/admin/outsoles/new"
          className="admin-btn admin-btn-primary"
          id="admin-create-outsole-btn"
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
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Warning / Partial failure feedback */}
      {warningMessage && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            background: "var(--admin-danger-bg)",
            border: "1px solid var(--admin-danger-border)",
            borderRadius: "2px",
            color: "var(--admin-danger-text)",
            fontSize: "0.8125rem",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ wordBreak: "break-word" }}>{warningMessage}</span>
        </div>
      )}

      {/* Bulk Action Toolbar — visible only when products are selected */}
      {selectedIds.size > 0 && (
        <div
          id="admin-bulk-toolbar"
          role="region"
          aria-label="Bulk actions"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            background: "#FFFFFF",
            border: "1px solid var(--deep-blue)",
            borderRadius: "2px",
            boxShadow: "0 2px 8px rgba(8, 59, 123, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--charcoal)" }}>
              {selectedIds.size} product{selectedIds.size === 1 ? "" : "s"} selected
            </span>
            {selectedDisplayedCount !== selectedIds.size && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted-olive)" }}>
                ({selectedDisplayedCount} visible in current view)
              </span>
            )}
            <button
              id="admin-bulk-clear-btn"
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={handleClearSelection}
              title="Clear selection"
            >
              Deselect all
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Bulk Archive button */}
            <button
              id="admin-bulk-archive-btn"
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={() => setBulkArchiveOpen(true)}
              disabled={eligibleArchiveCount === 0}
              style={{
                opacity: eligibleArchiveCount === 0 ? 0.5 : 1,
                cursor: eligibleArchiveCount === 0 ? "not-allowed" : "pointer",
              }}
              title={
                eligibleArchiveCount === 0
                  ? "Selected products are already archived"
                  : `Archive ${eligibleArchiveCount} active product${eligibleArchiveCount === 1 ? "" : "s"}`
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 8v13H3V8" />
                <path d="M1 3h22v5H1z" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
              Archive ({eligibleArchiveCount})
            </button>

            {/* Bulk Restore button */}
            <button
              id="admin-bulk-restore-btn"
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={() => setBulkRestoreOpen(true)}
              disabled={eligibleRestoreCount === 0}
              style={{
                opacity: eligibleRestoreCount === 0 ? 0.5 : 1,
                cursor: eligibleRestoreCount === 0 ? "not-allowed" : "pointer",
              }}
              title={
                eligibleRestoreCount === 0
                  ? "No archived products selected"
                  : `Restore ${eligibleRestoreCount} archived product${eligibleRestoreCount === 1 ? "" : "s"} to active catalog`
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Restore ({eligibleRestoreCount})
            </button>

            {/* Bulk Delete button (destructive) */}
            <button
              id="admin-bulk-delete-btn"
              type="button"
              className="admin-btn admin-btn-danger admin-btn-sm"
              onClick={() => setDeleteTarget(selectedProducts)}
              disabled={eligibleDeleteCount === 0}
              style={{
                opacity: eligibleDeleteCount === 0 ? 0.5 : 1,
                cursor: eligibleDeleteCount === 0 ? "not-allowed" : "pointer",
              }}
              title={
                eligibleDeleteCount === 0
                  ? "Permanent deletion is only permitted for archived products"
                  : `Permanently delete ${eligibleDeleteCount} archived product${eligibleDeleteCount === 1 ? "" : "s"}`
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Permanently Delete ({eligibleDeleteCount})
            </button>
          </div>
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

        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--muted-olive)",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          Showing {filteredOutsoles.length} of {initialOutsoles.length} product
          {initialOutsoles.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-table-card">
        {filteredOutsoles.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--muted-olive)" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 500 }}>
              No products matched your criteria
            </p>
            <p style={{ margin: 0, fontSize: "0.75rem" }}>
              Try clearing search keywords or filter dropdowns.
            </p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-table" id="admin-outsoles-table">
              <thead>
                <tr>
                  <th style={{ width: "44px", textAlign: "center", padding: "0.75rem 0.5rem" }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      id="admin-select-all-outsoles"
                      aria-label="Select all displayed products"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      style={{
                        cursor: "pointer",
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--deep-blue)",
                      }}
                    />
                  </th>
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
                {filteredOutsoles.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      id={`outsole-row-${item.slug}`}
                      style={{
                        background: isSelected ? "rgba(8, 59, 123, 0.05)" : undefined,
                      }}
                    >
                      <td style={{ width: "44px", textAlign: "center", padding: "0.75rem 0.5rem" }}>
                        <input
                          type="checkbox"
                          id={`select-outsole-${item.slug}`}
                          aria-label={`Select ${item.name}`}
                          checked={isSelected}
                          onChange={() => handleToggleRow(item.id)}
                          style={{
                            cursor: "pointer",
                            width: "16px",
                            height: "16px",
                            accentColor: "var(--deep-blue)",
                          }}
                        />
                      </td>
                      <td>
                        {item.primaryImageUrl ? (
                          <img
                            src={item.primaryImageUrl}
                            alt={item.primaryImageAlt ?? item.name}
                            className="admin-table-thumb"
                          />
                        ) : (
                          <div className="admin-table-thumb">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td>
                        <div
                          style={{ fontWeight: 600, color: "var(--charcoal)", marginBottom: "2px" }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--muted-olive)",
                            fontFamily: "var(--font-mono, monospace)",
                          }}
                        >
                          /{item.slug}
                        </div>
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: "0.75rem",
                          color: "var(--charcoal)",
                          fontWeight: 500,
                        }}
                      >
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
                          <span
                            style={{
                              color: "var(--muted-olive)",
                              opacity: 0.6,
                              fontSize: "0.75rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge--${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.is_featured ? (
                          <span
                            style={{
                              color: "var(--charcoal)",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                            }}
                          >
                            Yes
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--muted-olive)",
                              opacity: 0.6,
                              fontSize: "0.75rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        {item.is_sampling_available ? (
                          <span
                            style={{
                              color: "var(--admin-status-active-text)",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                            }}
                          >
                            Available
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "var(--muted-olive)",
                              opacity: 0.6,
                              fontSize: "0.75rem",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <Link
                          to="/admin/outsoles/$id/edit"
                          params={{ id: item.id }}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          style={{ marginRight: "0.4rem" }}
                          title="Edit product"
                        >
                          Edit
                        </Link>

                        {/* Archive button for active/draft products */}
                        {item.status !== "archived" && (
                          <button
                            id={`archive-btn-${item.slug}`}
                            type="button"
                            className="admin-btn admin-btn-sm"
                            style={{
                              background: "rgba(119, 121, 107, 0.12)",
                              color: "var(--charcoal)",
                              border: "1px solid var(--border)",
                            }}
                            title="Archive product"
                            onClick={() => setArchiveTarget(item)}
                          >
                            Archive
                          </button>
                        )}

                        {/* Restore and Permanent Delete buttons for archived products */}
                        {item.status === "archived" && (
                          <>
                            <button
                              id={`restore-btn-${item.slug}`}
                              type="button"
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              style={{ marginRight: "0.4rem" }}
                              title="Restore product to active catalog"
                              onClick={() => setRestoreTarget(item)}
                            >
                              Restore
                            </button>
                            <button
                              id={`delete-btn-${item.slug}`}
                              type="button"
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              title="Permanently delete product"
                              onClick={() => setDeleteTarget([item])}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Single Product Archive Dialog */}
      {archiveTarget && (
        <ArchiveDialog
          item={archiveTarget}
          onClose={() => setArchiveTarget(null)}
          onArchived={handleSingleArchived}
        />
      )}

      {/* Bulk Archive Dialog */}
      {bulkArchiveOpen && (
        <BulkArchiveDialog
          items={selectedProducts}
          onClose={() => setBulkArchiveOpen(false)}
          onArchived={handleBulkArchived}
        />
      )}

      {/* Single or Bulk Restore Dialog */}
      {(restoreTarget || bulkRestoreOpen) && (
        <RestoreDialog
          items={restoreTarget ? [restoreTarget] : selectedProducts}
          onClose={() => {
            setRestoreTarget(null);
            setBulkRestoreOpen(false);
          }}
          onRestored={handleRestored}
        />
      )}

      {/* Single or Bulk Permanent Deletion Dialog */}
      {deleteTarget && (
        <PermanentDeleteDialog
          items={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
