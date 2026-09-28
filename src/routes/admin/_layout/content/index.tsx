import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  listAdminSiteContent,
  updateAdminSiteContentEntry,
  type AdminSiteContentEntry,
  type ContentKey,
} from "@/lib/admin-content.functions";

export const Route = createFileRoute("/admin/_layout/content/")({
  loader: async () => {
    return await listAdminSiteContent();
  },
  component: AdminContentPage,
});

interface ContentMetadata {
  friendlyTitle: string;
  category: "homepage" | "about" | "contact";
  categoryLabel: string;
  pageTarget: string;
  titleHint: string;
  contentHint: string;
  defaultRows: number;
}

const METADATA_MAP: Record<ContentKey, ContentMetadata> = {
  homepage_hero: {
    friendlyTitle: "Homepage Hero Banner",
    category: "homepage",
    categoryLabel: "Homepage",
    pageTarget: "Homepage (/) · Hero Section",
    titleHint: "Main headline displayed on the homepage hero.",
    contentHint: "Introductory tagline explaining outsole engineering & volume production capabilities.",
    defaultRows: 3,
  },
  homepage_capabilities: {
    friendlyTitle: "Homepage Capabilities Overview",
    category: "homepage",
    categoryLabel: "Homepage",
    pageTarget: "Homepage (/) · Section 03",
    titleHint: "Section eyebrow / title for the manufacturing capability block.",
    contentHint: "Brief overview of mold making, compound formulation, and volume pressing.",
    defaultRows: 3,
  },
  about_company: {
    friendlyTitle: "Factory History & Background",
    category: "about",
    categoryLabel: "About Factory",
    pageTarget: "About Page (/about) · Primary Narrative",
    titleHint: "Main headline for the factory profile and history.",
    contentHint: "Company background, manufacturing history, facility scale, and quality standards.",
    defaultRows: 4,
  },
  about_oem: {
    friendlyTitle: "OEM Manufacturing Capabilities",
    category: "about",
    categoryLabel: "About Factory",
    pageTarget: "About Page (/about) · OEM Section",
    titleHint: "Section headline for OEM production.",
    contentHint: "Build-to-print production details: tooling transfer, compound matching, and lead times.",
    defaultRows: 4,
  },
  about_odm: {
    friendlyTitle: "ODM Design & Prototyping",
    category: "about",
    categoryLabel: "About Factory",
    pageTarget: "About Page (/about) · ODM Section",
    titleHint: "Section headline for ODM development.",
    contentHint: "In-house design, 3D tooling design, rapid sampling cycles, and compound selection.",
    defaultRows: 4,
  },
  contact_information: {
    friendlyTitle: "Company & Facility Contact Coordinates",
    category: "contact",
    categoryLabel: "Contact Coordinates",
    pageTarget: "Contact Page (/contact) · Facility Details",
    titleHint: "Headline for the contact & inquiry page.",
    contentHint: "Official physical address, direct sales email, phone, WhatsApp hotline, and operating hours.",
    defaultRows: 5,
  },
};

type FilterCategory = "all" | "homepage" | "about" | "contact";

function formatDate(isoString: string): string {
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

export function AdminContentPage() {
  const { items } = Route.useLoaderData();
  const router = useRouter();

  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const meta = METADATA_MAP[item.content_key as ContentKey];
      if (filterCategory !== "all" && meta?.category !== filterCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = item.title?.toLowerCase().includes(q) ?? false;
        const contentMatch = item.content?.toLowerCase().includes(q) ?? false;
        const keyMatch = item.content_key.toLowerCase().includes(q);
        const friendlyMatch = meta?.friendlyTitle.toLowerCase().includes(q) ?? false;
        return titleMatch || contentMatch || keyMatch || friendlyMatch;
      }
      return true;
    });
  }, [items, filterCategory, searchQuery]);

  return (
    <div className="admin-page" style={{ maxWidth: "1100px" }}>
      <header className="admin-page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 className="admin-page-title">Site Content Management</h1>
            <p className="admin-page-subtitle">
              Manage editable copy for the Homepage, Factory About profile, OEM/ODM capabilities, and Contact coordinates.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              style={{ textDecoration: "none" }}
            >
              View Homepage ↗
            </a>
            <a
              href="/about"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              style={{ textDecoration: "none" }}
            >
              View About ↗
            </a>
            <a
              href="/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              style={{ textDecoration: "none" }}
            >
              View Contact ↗
            </a>
          </div>
        </div>
      </header>

      {/* Filter Tabs & Search Bar */}
      <div className="admin-toolbar" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-toolbar-group">
          {(
            [
              { id: "all", label: "All Sections" },
              { id: "homepage", label: "Homepage" },
              { id: "about", label: "About Factory" },
              { id: "contact", label: "Contact Coordinates" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`content-tab-${tab.id}`}
              onClick={() => setFilterCategory(tab.id)}
              className={`admin-btn admin-btn-sm ${
                filterCategory === tab.id ? "admin-btn-primary" : "admin-btn-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="admin-toolbar-group">
          <input
            type="search"
            id="content-search-input"
            className="admin-search-input"
            placeholder="Search content or keys…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span style={{ fontSize: "0.75rem", color: "oklch(0.6 0.008 85)", fontFamily: "var(--font-mono, monospace)" }}>
            Showing {filteredItems.length} of {items.length} section{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Content Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {filteredItems.map((entry) => (
          <ContentCard
            key={entry.content_key}
            entry={entry}
            onSaved={async () => {
              await router.invalidate();
            }}
          />
        ))}

        {filteredItems.length === 0 && (
          <div
            style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
              background: "oklch(0.16 0.003 285)",
              border: "1px dashed oklch(0.26 0.004 285)",
              borderRadius: "2px",
              color: "oklch(0.6 0.008 85)",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.875rem" }}>
              No site content sections match the current filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContentCardProps {
  entry: AdminSiteContentEntry;
  onSaved: () => Promise<void>;
}

function ContentCard({ entry, onSaved }: ContentCardProps) {
  const meta = METADATA_MAP[entry.content_key as ContentKey] ?? {
    friendlyTitle: entry.content_key,
    category: "homepage",
    categoryLabel: "General",
    pageTarget: "Public Showcase",
    titleHint: "Headline text.",
    contentHint: "Narrative body.",
    defaultRows: 3,
  };

  const [title, setTitle] = useState(entry.title ?? "");
  const [content, setContent] = useState(entry.content ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDirty = (entry.title ?? "") !== title || (entry.content ?? "") !== content;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setErrorMsg("Title cannot be empty.");
      return;
    }
    if (trimmedTitle.length > 255) {
      setErrorMsg("Title must not exceed 255 characters.");
      return;
    }
    if (!trimmedContent) {
      setErrorMsg("Content cannot be empty.");
      return;
    }
    if (trimmedContent.length > 5000) {
      setErrorMsg("Content must not exceed 5000 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminSiteContentEntry({
        data: {
          content_key: entry.content_key,
          title: trimmedTitle,
          content: trimmedContent,
        },
      });
      setSuccessMsg("Changes saved successfully!");
      toast.success(`Updated "${meta.friendlyTitle}"`);
      await onSaved();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update content";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setTitle(entry.title ?? "");
    setContent(entry.content ?? "");
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  return (
    <div
      id={`content-card-${entry.content_key}`}
      style={{
        background: "oklch(0.165 0.003 285)",
        border: isDirty
          ? "1px solid oklch(0.78 0.155 71 / 0.6)"
          : "1px solid oklch(0.25 0.004 285)",
        borderRadius: "2px",
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
          background: "oklch(0.18 0.004 285)",
          borderBottom: "1px solid oklch(0.24 0.004 285)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "oklch(0.94 0.008 85)",
              letterSpacing: "-0.01em",
            }}
          >
            {meta.friendlyTitle}
          </h2>
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.6875rem",
              padding: "0.2rem 0.5rem",
              background: "oklch(0.22 0.004 285)",
              color: "oklch(0.75 0.008 85)",
              borderRadius: "2px",
              border: "1px solid oklch(0.28 0.004 285)",
            }}
          >
            {entry.content_key}
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              padding: "0.2rem 0.5rem",
              background: "oklch(0.78 0.155 71 / 0.12)",
              color: "oklch(0.78 0.155 71)",
              borderRadius: "2px",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            {meta.pageTarget}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isDirty && (
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.6875rem",
                color: "oklch(0.78 0.155 71)",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              ● Unsaved changes
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "0.6875rem",
              color: "oklch(0.55 0.008 85)",
            }}
            title={entry.updated_at}
          >
            Updated: {formatDate(entry.updated_at)}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <form onSubmit={handleSave} style={{ padding: "1.25rem" }}>
        {/* Error Feedback */}
        {errorMsg && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 0.875rem",
              marginBottom: "1rem",
              background: "oklch(0.62 0.2 25 / 0.12)",
              border: "1px solid oklch(0.62 0.2 25 / 0.4)",
              borderRadius: "2px",
              color: "oklch(0.85 0.12 25)",
              fontSize: "0.8125rem",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 0.875rem",
              marginBottom: "1rem",
              background: "oklch(0.7 0.15 150 / 0.12)",
              border: "1px solid oklch(0.7 0.15 150 / 0.4)",
              borderRadius: "2px",
              color: "oklch(0.85 0.13 150)",
              fontSize: "0.8125rem",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Title Field */}
        <div className="admin-field" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label
              htmlFor={`title-${entry.content_key}`}
              className="admin-field-label"
              style={{ fontWeight: 600 }}
            >
              Headline / Title
            </label>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.6875rem",
                color: title.length > 240 ? "oklch(0.78 0.155 71)" : "oklch(0.5 0.008 85)",
              }}
            >
              {title.length} / 255
            </span>
          </div>
          <input
            id={`title-${entry.content_key}`}
            type="text"
            className="admin-field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            placeholder={meta.titleHint}
            maxLength={255}
          />
          <span style={{ fontSize: "0.6875rem", color: "oklch(0.55 0.008 85)" }}>
            {meta.titleHint}
          </span>
        </div>

        {/* Content Field */}
        <div className="admin-field" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label
              htmlFor={`content-${entry.content_key}`}
              className="admin-field-label"
              style={{ fontWeight: 600 }}
            >
              Narrative Copy / Content
            </label>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.6875rem",
                color: content.length > 4800 ? "oklch(0.78 0.155 71)" : "oklch(0.5 0.008 85)",
              }}
            >
              {content.length} / 5000
            </span>
          </div>
          <textarea
            id={`content-${entry.content_key}`}
            className="admin-field-input"
            rows={meta.defaultRows}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            placeholder={meta.contentHint}
            maxLength={5000}
            style={{ resize: "vertical", lineHeight: 1.5 }}
          />
          <span style={{ fontSize: "0.6875rem", color: "oklch(0.55 0.008 85)" }}>
            {meta.contentHint}
          </span>
        </div>

        {/* Actions Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid oklch(0.22 0.004 285)",
          }}
        >
          {isDirty && (
            <button
              type="button"
              id={`reset-btn-${entry.content_key}`}
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Discard Changes
            </button>
          )}

          <button
            type="submit"
            id={`save-btn-${entry.content_key}`}
            className="admin-btn admin-btn-primary admin-btn-sm"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "12px",
                    height: "12px",
                    border: "2px solid oklch(0.17 0.02 60 / 0.3)",
                    borderTopColor: "oklch(0.17 0.02 60)",
                    borderRadius: "50%",
                    animation: "admin-spin 0.65s linear infinite",
                  }}
                />
                <span>Saving…</span>
              </>
            ) : (
              "Save Section"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
