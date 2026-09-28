import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useTransition, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  X,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Clock,
  Sparkles,
  Inbox,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import {
  listAdminInquiries,
  getAdminInquiry,
  updateAdminInquiryStatus,
  type AdminInquiryListItem,
  type AdminInquiryDetail,
  type InquiryStatus,
} from "@/lib/admin-inquiries.functions";

export type InquiriesSearch = {
  search?: string | undefined;
  status?: "all" | "pending" | "contacted" | "resolved" | undefined;
  page?: number | undefined;
  inquiry?: string | undefined;
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
    inquiry: str(s["inquiry"]),
  }),
  loaderDeps: ({ search }) => ({
    search: search.search,
    status: search.status,
    page: search.page,
    inquiry: search.inquiry,
  }),
  loader: async ({ deps }) => {
    const listRes = await listAdminInquiries({
      data: {
        search: deps.search,
        status: deps.status ?? "all",
        page: deps.page ?? 1,
        pageSize: 20,
      },
    });

    let selectedInquiry: AdminInquiryDetail | null = null;
    if (deps.inquiry) {
      try {
        const detailRes = await getAdminInquiry({ data: { id: deps.inquiry } });
        selectedInquiry = detailRes.inquiry;
      } catch {
        selectedInquiry = null;
      }
    }

    return {
      ...listRes,
      selectedInquiry,
    };
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);

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

  // Handle ESC key to close modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && search.inquiry) {
        closeDetail();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [search.inquiry]); // eslint-disable-line react-hooks/exhaustive-deps

  function openDetail(inquiryId: string) {
    navigate({
      search: (prev) => ({ ...prev, inquiry: inquiryId }),
    });
  }

  function closeDetail() {
    navigate({
      search: (prev) => ({ ...prev, inquiry: undefined }),
    });
  }

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

  function handleClearFilters() {
    setSearchInput("");
    navigate({
      search: () => ({ page: 1, status: "all" }),
    });
  }

  async function handleStatusChange(inquiryId: string, newStatus: InquiryStatus) {
    setUpdatingId(inquiryId);
    try {
      await updateAdminInquiryStatus({ data: { id: inquiryId, status: newStatus } });
      await router.invalidate();
      const labels: Record<InquiryStatus, string> = {
        pending: "Pending",
        contacted: "Contacted",
        resolved: "Resolved",
      };
      toast.success(`Inquiry marked as ${labels[newStatus]}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  function copyToClipboard(text: string, field: "email" | "phone") {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.info(`Copied ${field} to clipboard`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  const { inquiries, total, page, pageSize, totalPages, statusCounts, selectedInquiry } = data;
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  // Active inquiry for modal: either loaded directly by URL or matched from current page list
  const activeInquiry = useMemo(() => {
    if (selectedInquiry) return selectedInquiry;
    if (search.inquiry) {
      const matched = inquiries.find((i) => i.id === search.inquiry);
      if (matched) {
        return {
          ...matched,
          outsole: matched.outsole
            ? {
                ...matched.outsole,
                description: null,
              }
            : null,
        } as AdminInquiryDetail;
      }
    }
    return null;
  }, [selectedInquiry, search.inquiry, inquiries]);

  return (
    <div className="admin-page" style={{ maxWidth: "1200px" }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="admin-page-title">Sample Inquiries</h1>
          <p className="admin-page-subtitle">
            Review B2B customer sample requests, inspect requested outsole designs, and track follow-ups.
          </p>
        </div>

        {statusCounts.pending > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 0.85rem",
              background: "oklch(0.78 0.155 71 / 0.12)",
              border: "1px solid oklch(0.78 0.155 71 / 0.3)",
              borderRadius: "2px",
              fontSize: "0.75rem",
              color: "oklch(0.85 0.155 71)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            <Sparkles size={14} />
            <span>{statusCounts.pending} pending sample {statusCounts.pending === 1 ? "request" : "requests"} awaiting review</span>
          </div>
        )}
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
          const isActive = (search.status ?? "all") === tab.id;
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
        <div style={{ position: "relative", flex: 1, maxWidth: "440px", minWidth: "260px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "oklch(0.5 0.008 85)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer, company, email, or product…"
            style={{
              width: "100%",
              padding: "0.55rem 2.25rem 0.55rem 2.25rem",
              background: "oklch(0.185 0.004 285)",
              border: "1px solid oklch(0.26 0.004 285)",
              borderRadius: "2px",
              color: "oklch(0.94 0.008 85)",
              fontSize: "0.8125rem",
              outline: "none",
            }}
          />
          {searchInput.length > 0 && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              style={{
                position: "absolute",
                right: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "oklch(0.55 0.008 85)",
                cursor: "pointer",
                padding: "0.2rem",
                display: "flex",
                alignItems: "center",
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
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
          <div style={{ padding: "4rem 1.5rem", textAlign: "center", color: "oklch(0.6 0.008 85)" }}>
            <Inbox size={40} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.9375rem", fontWeight: 600, color: "oklch(0.85 0.008 85)" }}>
              No inquiries found
            </p>
            <p style={{ margin: "0 0 1.25rem", fontSize: "0.8125rem", color: "oklch(0.55 0.008 85)" }}>
              {search.search || (search.status && search.status !== "all")
                ? "No sample inquiries match your current search and filter criteria."
                : "No customer sample inquiries have been received yet."}
            </p>
            {(search.search || (search.status && search.status !== "all")) && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.85rem",
                  background: "oklch(0.22 0.004 285)",
                  border: "1px solid oklch(0.3 0.004 285)",
                  borderRadius: "2px",
                  color: "oklch(0.9 0.008 85)",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={13} />
                Reset filters & show all
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8125rem", minWidth: "860px" }}>
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
              {inquiries.map((item) => {
                const isNew = item.status === "pending" && (Date.now() - new Date(item.created_at).getTime()) < 48 * 60 * 60 * 1000;
                const isUpdating = updatingId === item.id;

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid oklch(0.22 0.004 285)",
                      transition: "background 0.1s",
                      background: search.inquiry === item.id ? "oklch(0.78 0.155 71 / 0.04)" : "transparent",
                    }}
                  >
                    {/* Customer */}
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span style={{ fontWeight: 600, color: "oklch(0.92 0.008 85)" }}>{item.client_name}</span>
                        {isNew && (
                          <span
                            style={{
                              fontSize: "0.625rem",
                              fontWeight: 700,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              background: "oklch(0.78 0.155 71 / 0.2)",
                              color: "oklch(0.85 0.155 71)",
                              padding: "0.1rem 0.35rem",
                              borderRadius: "2px",
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "oklch(0.65 0.008 85)", marginTop: "1px" }}>{item.company_name}</div>
                      <div style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", color: "oklch(0.55 0.008 85)", marginTop: "2px" }}>
                        {item.email}
                      </div>
                    </td>

                    {/* Requested Product */}
                    <td style={{ padding: "0.875rem 1rem" }}>
                      {item.outsole ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                          {item.outsole.primary_image_url && (
                            <img
                              src={item.outsole.primary_image_url}
                              alt={item.outsole.name}
                              style={{
                                width: "36px",
                                height: "36px",
                                objectFit: "cover",
                                borderRadius: "2px",
                                border: "1px solid oklch(0.28 0.004 285)",
                                background: "oklch(0.14 0.003 285)",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.15rem 0.45rem",
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
                      <div>
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "oklch(0.45 0.008 85)", marginTop: "1px" }}>
                        {formatRelativeTime(item.created_at)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "0.875rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                        {/* Quick progression buttons */}
                        {item.status === "pending" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(item.id, "contacted")}
                            style={{
                              background: "oklch(0.65 0.14 230 / 0.12)",
                              border: "1px solid oklch(0.65 0.14 230 / 0.3)",
                              color: "oklch(0.75 0.14 230)",
                              borderRadius: "2px",
                              padding: "0.35rem 0.6rem",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              cursor: isUpdating ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                            title="Mark as Contacted"
                          >
                            {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Contacted
                          </button>
                        )}

                        {item.status === "contacted" && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(item.id, "resolved")}
                            style={{
                              background: "oklch(0.65 0.15 155 / 0.12)",
                              border: "1px solid oklch(0.65 0.15 155 / 0.3)",
                              color: "oklch(0.75 0.15 155)",
                              borderRadius: "2px",
                              padding: "0.35rem 0.6rem",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              cursor: isUpdating ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                            title="Mark as Resolved"
                          >
                            {isUpdating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Resolved
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => openDetail(item.id)}
                          style={{
                            background: "transparent",
                            border: "1px solid oklch(0.28 0.004 285)",
                            borderRadius: "2px",
                            color: "oklch(0.85 0.008 85)",
                            padding: "0.35rem 0.65rem",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* ── Enhanced Detail Modal ── */}
      {activeInquiry && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "oklch(0 0 0 / 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !updatingId) closeDetail();
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
              maxWidth: "640px",
              width: "100%",
              boxShadow: "0 24px 64px oklch(0 0 0 / 0.55)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <h2
                    id="inquiry-detail-title"
                    style={{
                      margin: 0,
                      fontSize: "1.1875rem",
                      fontWeight: 700,
                      color: "oklch(0.95 0.008 85)",
                    }}
                  >
                    Sample Request Detail
                  </h2>
                  {activeInquiry.status === "pending" && (
                    <span
                      style={{
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        background: "oklch(0.78 0.155 71 / 0.2)",
                        color: "oklch(0.85 0.155 71)",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "2px",
                      }}
                    >
                      Awaiting Action
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "0.75rem", fontFamily: "var(--font-mono, monospace)", color: "oklch(0.55 0.008 85)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={13} />
                  Submitted on {new Date(activeInquiry.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })} ({formatRelativeTime(activeInquiry.created_at)})
                </p>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "oklch(0.6 0.008 85)",
                  cursor: "pointer",
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Workflow Status Bar & Quick Actions */}
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
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                <span style={{ display: "block", fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", marginBottom: "4px" }}>
                  Current Status
                </span>
                <StatusBadge status={activeInquiry.status} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                {/* One-click workflow transition actions */}
                {activeInquiry.status === "pending" && (
                  <button
                    type="button"
                    disabled={updatingId === activeInquiry.id}
                    onClick={() => handleStatusChange(activeInquiry.id, "contacted")}
                    style={{
                      padding: "0.38rem 0.75rem",
                      background: "oklch(0.65 0.14 230 / 0.15)",
                      border: "1px solid oklch(0.65 0.14 230 / 0.4)",
                      borderRadius: "2px",
                      color: "oklch(0.85 0.14 230)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Check size={13} />
                    Mark as Contacted
                  </button>
                )}

                {activeInquiry.status === "contacted" && (
                  <button
                    type="button"
                    disabled={updatingId === activeInquiry.id}
                    onClick={() => handleStatusChange(activeInquiry.id, "resolved")}
                    style={{
                      padding: "0.38rem 0.75rem",
                      background: "oklch(0.65 0.15 155 / 0.15)",
                      border: "1px solid oklch(0.65 0.15 155 / 0.4)",
                      borderRadius: "2px",
                      color: "oklch(0.85 0.15 155)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Check size={13} />
                    Mark as Resolved
                  </button>
                )}

                {/* Status Dropdown */}
                <select
                  id="modal-status-select"
                  value={activeInquiry.status}
                  disabled={updatingId === activeInquiry.id}
                  onChange={(e) => handleStatusChange(activeInquiry.id, e.target.value as InquiryStatus)}
                  style={{
                    padding: "0.38rem 0.65rem",
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

            {/* Requested Product Context */}
            {activeInquiry.outsole ? (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "1rem",
                  background: "oklch(0.16 0.003 285)",
                  border: "1px solid oklch(0.24 0.004 285)",
                  borderRadius: "2px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", letterSpacing: "0.05em" }}>
                    Requested Outsole Model
                  </span>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <a
                      href={`/outsoles/${activeInquiry.outsole.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.75rem",
                        color: "oklch(0.78 0.155 71)",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      View in Catalog
                      <ExternalLink size={12} />
                    </a>
                    <a
                      href={`/admin/outsoles/${activeInquiry.outsole.id}/edit`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.75rem",
                        color: "oklch(0.75 0.008 85)",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      Edit Outsole
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  {activeInquiry.outsole.primary_image_url ? (
                    <img
                      src={activeInquiry.outsole.primary_image_url}
                      alt={activeInquiry.outsole.name}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "2px",
                        border: "1px solid oklch(0.28 0.004 285)",
                        background: "oklch(0.12 0.003 285)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "2px",
                        border: "1px solid oklch(0.24 0.004 285)",
                        background: "oklch(0.14 0.003 285)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "oklch(0.4 0.008 85)",
                        flexShrink: 0,
                      }}
                    >
                      <Inbox size={24} />
                    </div>
                  )}

                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, color: "oklch(0.95 0.008 85)", fontSize: "1rem" }}>
                        {activeInquiry.outsole.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: "0.75rem",
                          color: "oklch(0.78 0.155 71)",
                          background: "oklch(0.78 0.155 71 / 0.12)",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "2px",
                          border: "1px solid oklch(0.78 0.155 71 / 0.25)",
                        }}
                      >
                        {activeInquiry.outsole.model_number}
                      </span>
                    </div>
                    {activeInquiry.outsole.description && (
                      <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "oklch(0.65 0.008 85)", lineHeight: 1.4 }}>
                        {activeInquiry.outsole.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "0.875rem 1rem",
                  background: "oklch(0.15 0.003 285)",
                  border: "1px solid oklch(0.22 0.004 285)",
                  borderRadius: "2px",
                  fontSize: "0.8125rem",
                  color: "oklch(0.65 0.008 85)",
                }}
              >
                <span style={{ fontWeight: 600, color: "oklch(0.85 0.008 85)" }}>General Inquiry:</span> No specific outsole model was attached to this request.
              </div>
            )}

            {/* Customer Details Box */}
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
                  Email Address
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px" }}>
                  <a
                    href={`mailto:${activeInquiry.email}`}
                    style={{
                      color: "oklch(0.78 0.155 71)",
                      fontSize: "0.8125rem",
                      fontFamily: "var(--font-mono, monospace)",
                      textDecoration: "underline",
                      wordBreak: "break-all",
                    }}
                  >
                    {activeInquiry.email}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeInquiry.email, "email")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "oklch(0.6 0.008 85)",
                      cursor: "pointer",
                      padding: "2px",
                      display: "inline-flex",
                    }}
                    title="Copy email"
                  >
                    {copiedField === "email" ? <Check size={13} style={{ color: "oklch(0.75 0.15 155)" }} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono, monospace)", textTransform: "uppercase", color: "oklch(0.55 0.008 85)", display: "block" }}>
                  Phone Number
                </span>
                {activeInquiry.phone ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px" }}>
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
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeInquiry.phone!, "phone")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "oklch(0.6 0.008 85)",
                        cursor: "pointer",
                        padding: "2px",
                        display: "inline-flex",
                      }}
                      title="Copy phone"
                    >
                      {copiedField === "phone" ? <Check size={13} style={{ color: "oklch(0.75 0.15 155)" }} /> : <Copy size={13} />}
                    </button>
                  </div>
                ) : (
                  <span style={{ color: "oklch(0.45 0.008 85)", fontStyle: "italic", fontSize: "0.8125rem", marginTop: "2px", display: "inline-block" }}>
                    Not provided
                  </span>
                )}
              </div>
            </div>

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
                  padding: "1rem",
                  fontSize: "0.875rem",
                  lineHeight: 1.55,
                  color: "oklch(0.92 0.008 85)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {activeInquiry.message}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a
                href={`mailto:${activeInquiry.email}?subject=${encodeURIComponent(
                  `Re: Sample Request — ${activeInquiry.outsole ? `${activeInquiry.outsole.name} (${activeInquiry.outsole.model_number})` : "Outsole Works"}`,
                )}&body=${encodeURIComponent(
                  `Dear ${activeInquiry.client_name},\n\nThank you for reaching out to Outsole Works regarding your footwear program${
                    activeInquiry.outsole ? ` and the ${activeInquiry.outsole.name} (${activeInquiry.outsole.model_number})` : ""
                  }.\n\nBest regards,\nOutsole Works Team`,
                )}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 0.95rem",
                  background: "oklch(0.78 0.155 71)",
                  color: "oklch(0.14 0.003 285)",
                  borderRadius: "2px",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <Mail size={14} />
                Reply via Email
              </a>

              <button
                type="button"
                onClick={closeDetail}
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
// Sub-components & Helpers
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

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
