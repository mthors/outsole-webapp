import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useTransition } from "react";
import { z } from "zod";
import {
  listAdminInquiries,
  updateAdminInquiryStatus,
  type AdminInquiryListItem,
  type InquiryStatus,
} from "@/lib/admin-inquiries.functions";

export type InquiriesSearch = {
  search?: string | undefined;
  status?: "all" | "pending" | "contacted" | "resolved" | undefined;
  page?: number | undefined;
};

const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v.slice(0, 100) : undefined);
const statusVal = (v: unknown): "all" | "pending" | "contacted" | "resolved" | undefined => {
  const valid = ["all", "pending", "contacted", "resolved"] as const;
  return typeof v === "string" && (valid as readonly string[]).includes(v)
    ? (v as "all" | "pending" | "contacted" | "resolved")
    : undefined;
};
const pageVal = (v: unknown): number | undefined => {
  if (typeof v === "number" && v > 0) return Math.floor(v);
  if (typeof v === "string") {
    const parsed = parseInt(v, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return undefined;
};

export const Route = createFileRoute("/admin/_layout/inquiries/")({
  validateSearch: (s: Record<string, unknown>): InquiriesSearch => ({
    search: str(s["search"]),
    status: statusVal(s["status"]),
    page: pageVal(s["page"]),
  }),
  loaderDeps: ({ search }) => ({
    search: search.search,
    status: search.status,
    page: search.page,
  }),
  loader: async ({ deps }) => {
    return await listAdminInquiries({
      data: {
        search: deps.search,
        status: deps.status ?? "all",
        page: deps.page ?? 1,
        pageSize: 20,
      },
    });
  },
  component: AdminInquiriesPage,
});

export function AdminInquiriesPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(search.search ?? "");
  const [activeInquiry, setActiveInquiry] = useState<AdminInquiryListItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(search.search ?? "");
  }, [search.search]);

  // Debounced search input handler
  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim() || undefined;
      if (next !== search.search) {
        startTransition(() => {
          navigate({
            search: (prev) => ({ ...prev, search: next, page: 1 }),
          });
        });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(newStatus: "all" | "pending" | "contacted" | "resolved") {
    navigate({
      search: (prev) => ({ ...prev, status: newStatus, page: 1 }),
    });
  }

  function handlePageChange(newPage: number) {
    navigate({
      search: (prev) => ({ ...prev, page: newPage }),
    });
  }

  async function handleStatusChange(inquiryId: string, newStatus: InquiryStatus) {
    setUpdatingId(inquiryId);
    setStatusError(null);
    try {
      await updateAdminInquiryStatus({ data: { id: inquiryId, status: newStatus } });
      await router.invalidate();
      if (activeInquiry && activeInquiry.id === inquiryId) {
        setActiveInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: unknown) {
      setStatusError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const { inquiries, total, page, pageSize, totalPages, statusCounts } = data;
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="admin-page" style={{ maxWidth: "1160px" }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 className="admin-page-title">Sample Inquiries</h1>
        <p className="admin-page-subtitle">
          Review customer sample requests and manage communication workflow.
        </p>
      </div>

      {/* ── Status Tabs ── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid oklch(0.24 0.004 285)",
          marginBottom: "1.5rem",
          gap: "0.5rem",
          overflowX: "auto",
        }}
      >
        {(
          [
            { id: "all", label: "All Inquiries", count: statusCounts.all },
            { id: "pending", label: "Pending", count: statusCounts.pending },
            { id: "contacted", label: "Contacted", count: statusCounts.contacted },
            { id: "resolved", label: "Resolved", count: statusCounts.resolved },
          ] as const
        ).map((tab) => {
          const isActive = search.status === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid oklch(0.78 0.155 71)" : "2px solid transparent",
                color: isActive ? "oklch(0.94 0.008 85)" : "oklch(0.65 0.008 85)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono, monospace)",
                  background: isActive ? "oklch(0.78 0.155 71 / 0.2)" : "oklch(0.22 0.004 285)",
                  color: isActive ? "oklch(0.78 0.155 71)" : "oklch(0.6 0.008 85)",
                  padding: "0.1rem 0.45rem",
                  borderRadius: "2px",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search Bar & Filter Meta ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: "420px", minWidth: "260px" }}>
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
              color: "oklch(0.5 0.008 85)",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer, company, email, or product…"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.25rem",
              background: "oklch(0.185 0.004 285)",
              border: "1px solid oklch(0.26 0.004 285)",
              borderRadius: "2px",
              color: "oklch(0.94 0.008 85)",
              fontSize: "0.8125rem",
              outline: "none",
            }}
          />
        </div>

        {total > 0 && (
          <span
            style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono, monospace)",
              color: "oklch(0.55 0.008 85)",
            }}
          >
            Showing {startIdx}–{endIdx} of {total}
          </span>
        )}
      </div>

      {/* ── Table Container ── */}
      <div
        style={{
          background: "oklch(0.185 0.004 285)",
          border: "1px solid oklch(0.26 0.004 285)",
          borderRadius: "2px",
          overflowX: "auto",
        }}
      >
        {inquiries.length === 0 ? (
          <div style={{ padding: "3.5rem 1.5rem", textAlign: "center", color: "oklch(0.55 0.008 85)", fontSize: "0.875rem" }}>
            No sample inquiries found matching the current criteria.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem", minWidth: "800px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.24 0.004 285)", background: "oklch(0.16 0.003 285)" }}>
                <th style={{ padding: "0.75rem 1rem", color: "oklch(0.55 0.008 85)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Customer</th>
                <th style={{ padding: "0.75rem 1rem", color: "oklch(0.55 0.008 85)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Requested Product</th>
                <th style={{ padding: "0.75rem 1rem", color: "oklch(0.55 0.008 85)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Message</th>
                <th style={{ padding: "0.75rem 1rem", color: "oklch(0.55 0.008 85)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", color: "oklch(0.55 0.008 85)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>Date</th>
                <th style={{ padding: "0.75rem 1rem", color: "oklch(0.55 0.008 85)", fontWeight: 600, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.08em", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid oklch(0.22 0.004 285)",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Customer */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <div style={{ fontWeight: 600, color: "oklch(0.92 0.008 85)" }}>{item.client_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "oklch(0.65 0.008 85)" }}>{item.company_name}</div>
                    <div style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", color: "oklch(0.55 0.008 85)", marginTop: "2px" }}>
                      {item.email}
                    </div>
                  </td>

                  {/* Requested Product */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    {item.outsole ? (
                      <div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "2px",
                            fontSize: "0.6875rem",
                            fontFamily: "var(--font-mono, monospace)",
                            background: "oklch(0.78 0.155 71 / 0.12)",
                            color: "oklch(0.78 0.155 71)",
                            border: "1px solid oklch(0.78 0.155 71 / 0.25)",
                            marginBottom: "2px",
                          }}
                        >
                          {item.outsole.model_number}
                        </span>
                        <div style={{ fontWeight: 500, color: "oklch(0.85 0.008 85)", fontSize: "0.75rem" }}>
                          {item.outsole.name}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: "oklch(0.45 0.008 85)", fontStyle: "italic", fontSize: "0.75rem" }}>
                        General Inquiry
                      </span>
                    )}
                  </td>

                  {/* Message Preview */}
                  <td style={{ padding: "0.875rem 1rem", maxWidth: "260px" }}>
                    <p
                      style={{
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        color: "oklch(0.7 0.008 85)",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.message}
                    </p>
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <StatusBadge status={item.status} />
                  </td>

                  {/* Date */}
                  <td style={{ padding: "0.875rem 1rem", fontSize: "0.75rem", fontFamily: "var(--font-mono, monospace)", color: "oklch(0.6 0.008 85)", whiteSpace: "nowrap" }}>
                    {new Date(item.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "0.875rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={() => setActiveInquiry(item)}
                      style={{
                        background: "transparent",
                        border: "1px solid oklch(0.28 0.004 285)",
                        borderRadius: "2px",
                        color: "oklch(0.82 0.008 85)",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination Bar ── */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1.25rem",
            padding: "0.5rem 0",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "oklch(0.55 0.008 85)", fontFamily: "var(--font-mono, monospace)" }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              style={{
                padding: "0.4rem 0.75rem",
                background: "oklch(0.185 0.004 285)",
                border: "1px solid oklch(0.28 0.004 285)",
                borderRadius: "2px",
                color: page <= 1 ? "oklch(0.4 0.008 85)" : "oklch(0.85 0.008 85)",
                fontSize: "0.75rem",
                cursor: page <= 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              style={{
                padding: "0.4rem 0.75rem",
                background: "oklch(0.185 0.004 285)",
                border: "1px solid oklch(0.28 0.004 285)",
                borderRadius: "2px",
                color: page >= totalPages ? "oklch(0.4 0.008 85)" : "oklch(0.85 0.008 85)",
                fontSize: "0.75rem",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {activeInquiry && (
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
            if (e.target === e.currentTarget && !updatingId) setActiveInquiry(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-detail-title"
            style={{
              background: "oklch(0.185 0.004 285)",
              border: "1px solid oklch(0.3 0.004 285)",
              borderRadius: "2px",
              padding: "1.75rem 2rem",
              maxWidth: "560px",
              width: "100%",
              boxShadow: "0 24px 64px oklch(0 0 0 / 0.5)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h2
                  id="inquiry-detail-title"
                  style={{
                    margin: "0 0 0.25rem",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "oklch(0.94 0.008 85)",
                  }}
                >
                  Sample Request Detail
                </h2>
                <p style={{ margin: 0, fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", color: "oklch(0.55 0.008 85)" }}>
                  Submitted on {new Date(activeInquiry.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveInquiry(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "oklch(0.6 0.008 85)",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  lineHeight: 1,
                  padding: "0.25rem",
                }}
              >
                ✕
              </button>
            </div>

            {statusError && (
              <div
                style={{
                  background: "oklch(0.65 0.2 25 / 0.12)",
                  border: "1px solid oklch(0.65 0.2 25 / 0.35)",
                  color: "oklch(0.85 0.15 25)",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "2px",
                  fontSize: "0.8125rem",
                  marginBottom: "1rem",
                }}
              >
                {statusError}
              </div>
            )}

            {/* Workflow Status Selector */}
            <div
              style={{
                background: "oklch(0.14 0.003 285)",
                border: "1px solid oklch(0.24 0.004 285)",
                borderRadius: "2px",
                padding: "0.875rem 1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <span style={{ display: "block", fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)" }}>
                  Workflow Status
                </span>
                <span style={{ marginTop: "4px", display: "inline-block" }}>
                  <StatusBadge status={activeInquiry.status} />
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label htmlFor="modal-status-select" className="sr-only">
                  Update Status
                </label>
                <select
                  id="modal-status-select"
                  value={activeInquiry.status}
                  disabled={updatingId === activeInquiry.id}
                  onChange={(e) => handleStatusChange(activeInquiry.id, e.target.value as InquiryStatus)}
                  style={{
                    padding: "0.375rem 0.65rem",
                    background: "oklch(0.2 0.004 285)",
                    border: "1px solid oklch(0.3 0.004 285)",
                    borderRadius: "2px",
                    color: "oklch(0.92 0.008 85)",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Customer Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1.25rem",
                padding: "1rem",
                background: "oklch(0.16 0.003 285)",
                border: "1px solid oklch(0.24 0.004 285)",
                borderRadius: "2px",
              }}
            >
              <div>
                <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", display: "block" }}>
                  Client Name
                </span>
                <span style={{ fontWeight: 600, color: "oklch(0.94 0.008 85)", fontSize: "0.875rem" }}>
                  {activeInquiry.client_name}
                </span>
              </div>
              <div>
                <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", display: "block" }}>
                  Company
                </span>
                <span style={{ fontWeight: 600, color: "oklch(0.94 0.008 85)", fontSize: "0.875rem" }}>
                  {activeInquiry.company_name}
                </span>
              </div>
              <div>
                <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", display: "block" }}>
                  Email
                </span>
                <a
                  href={`mailto:${activeInquiry.email}`}
                  style={{
                    color: "oklch(0.78 0.155 71)",
                    fontSize: "0.8125rem",
                    fontFamily: "var(--font-mono, monospace)",
                    textDecoration: "underline",
                  }}
                >
                  {activeInquiry.email}
                </a>
              </div>
              <div>
                <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", display: "block" }}>
                  Phone
                </span>
                {activeInquiry.phone ? (
                  <a
                    href={`tel:${activeInquiry.phone}`}
                    style={{
                      color: "oklch(0.85 0.008 85)",
                      fontSize: "0.8125rem",
                      fontFamily: "var(--font-mono, monospace)",
                      textDecoration: "none",
                    }}
                  >
                    {activeInquiry.phone}
                  </a>
                ) : (
                  <span style={{ color: "oklch(0.45 0.008 85)", fontStyle: "italic", fontSize: "0.8125rem" }}>
                    Not provided
                  </span>
                )}
              </div>
            </div>

            {/* Requested Product Context */}
            {activeInquiry.outsole && (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "0.875rem 1rem",
                  background: "oklch(0.16 0.003 285)",
                  border: "1px solid oklch(0.24 0.004 285)",
                  borderRadius: "2px",
                }}
              >
                <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", display: "block", marginBottom: "0.25rem" }}>
                  Requested Outsole Model
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 700, color: "oklch(0.94 0.008 85)", fontSize: "0.9375rem" }}>
                    {activeInquiry.outsole.name}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem", color: "oklch(0.78 0.155 71)" }}>
                    {activeInquiry.outsole.model_number}
                  </span>
                </div>
              </div>
            )}

            {/* Customer Message */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", display: "block", marginBottom: "0.375rem" }}>
                Program / Inquiry Message
              </span>
              <div
                style={{
                  background: "oklch(0.14 0.003 285)",
                  border: "1px solid oklch(0.24 0.004 285)",
                  borderRadius: "2px",
                  padding: "0.875rem 1rem",
                  fontSize: "0.875rem",
                  lineHeight: 1.5,
                  color: "oklch(0.9 0.008 85)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {activeInquiry.message}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setActiveInquiry(null)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "oklch(0.24 0.004 285)",
                  border: "1px solid oklch(0.32 0.004 285)",
                  borderRadius: "2px",
                  color: "oklch(0.94 0.008 85)",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InquiryStatus }) {
  const styles: Record<InquiryStatus, { bg: string; color: string; border: string; label: string }> = {
    pending: {
      bg: "oklch(0.78 0.155 71 / 0.12)",
      color: "oklch(0.78 0.155 71)",
      border: "oklch(0.78 0.155 71 / 0.3)",
      label: "Pending",
    },
    contacted: {
      bg: "oklch(0.65 0.14 230 / 0.12)",
      color: "oklch(0.7 0.14 230)",
      border: "oklch(0.65 0.14 230 / 0.3)",
      label: "Contacted",
    },
    resolved: {
      bg: "oklch(0.65 0.15 155 / 0.12)",
      color: "oklch(0.72 0.15 155)",
      border: "oklch(0.65 0.15 155 / 0.3)",
      label: "Resolved",
    },
  };

  const s = styles[status] ?? styles.pending;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
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
