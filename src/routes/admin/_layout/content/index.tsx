import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  listAdminSiteContent,
  updateAdminSiteContentEntry,
  getInteriorHeroAdminPreview,
  uploadInteriorHeroImage,
  updateInteriorHeroMetadata,
  type AdminSiteContentEntry,
  type ContentKey,
} from "@/lib/admin-content.functions";
import {
  parseContactContent,
  contactContentSchema,
  DEFAULT_CONTACT_CONTENT,
  DEFAULT_CONTACT_CONTENT_ID,
  type ContactContent,
} from "@/lib/contact-content";
import { parseInteriorHero, type InteriorHeroConfig } from "@/lib/interior-hero";

export const Route = createFileRoute("/admin/_layout/content/")({
  loader: async () => {
    return await listAdminSiteContent();
  },
  component: AdminContentPage,
});

interface ContentMetadata {
  friendlyTitle: string;
  category: "homepage" | "about" | "contact" | "shared";
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
  interior_hero: {
    friendlyTitle: "Interior Pages Hero Background",
    category: "shared",
    categoryLabel: "Shared",
    pageTarget: "/catalog, /about, /contact, /request-sample · Page Header",
    titleHint: "Unused — per-page titles are injected by each route.",
    contentHint: 'JSON: { "imagePath": "interior/hero.jpg", "altText": "...", "eyebrow": "", "title": "", "description": "" }. imagePath must be a Storage path in the outsole-images bucket. Leave imagePath empty for dark gradient fallback.',
    defaultRows: 5,
  },
};

type FilterCategory = "all" | "homepage" | "about" | "contact" | "shared";

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
              { id: "shared", label: "Shared" },
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
          <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
            Showing {filteredItems.length} of {items.length} section{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Content Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {filteredItems.map((entry) =>
          entry.content_key === "contact_information" ? (
            <ContactContentCard
              key={entry.content_key}
              entry={entry}
              onSaved={async () => {
                await router.invalidate();
              }}
            />
          ) : entry.content_key === "interior_hero" ? (
            <InteriorHeroContentCard
              key={entry.content_key}
              entry={entry}
              onSaved={async () => {
                await router.invalidate();
              }}
            />
          ) : (
            <ContentCard
              key={entry.content_key}
              entry={entry}
              onSaved={async () => {
                await router.invalidate();
              }}
            />
          ),
        )}


        {filteredItems.length === 0 && (
          <div
            style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
              background: "var(--admin-card-bg)",
              border: "1px dashed var(--admin-card-border)",
              borderRadius: "4px",
              color: "var(--admin-text-muted)",
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
  const [titleEn, setTitleEn] = useState(entry.title_en ?? "");
  const [contentEn, setContentEn] = useState(entry.content_en ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDirty =
    (entry.title ?? "") !== title ||
    (entry.content ?? "") !== content ||
    (entry.title_en ?? "") !== titleEn ||
    (entry.content_en ?? "") !== contentEn;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const trimmedTitleEn = titleEn.trim();
    const trimmedContentEn = contentEn.trim();

    if (!trimmedTitle) {
      setErrorMsg("Indonesian title cannot be empty.");
      return;
    }
    if (trimmedTitle.length > 255) {
      setErrorMsg("Indonesian title must not exceed 255 characters.");
      return;
    }
    if (!trimmedContent) {
      setErrorMsg("Indonesian content cannot be empty.");
      return;
    }
    if (trimmedContent.length > 5000) {
      setErrorMsg("Indonesian content must not exceed 5000 characters.");
      return;
    }
    if (trimmedTitleEn.length > 255) {
      setErrorMsg("English title must not exceed 255 characters.");
      return;
    }
    if (trimmedContentEn.length > 5000) {
      setErrorMsg("English content must not exceed 5000 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminSiteContentEntry({
        data: {
          content_key: entry.content_key,
          title: trimmedTitle,
          content: trimmedContent,
          title_en: trimmedTitleEn.length > 0 ? trimmedTitleEn : null,
          content_en: trimmedContentEn.length > 0 ? trimmedContentEn : null,
        },
      });
      setSuccessMsg("Bilingual changes saved successfully!");
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
    setTitleEn(entry.title_en ?? "");
    setContentEn(entry.content_en ?? "");
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  return (
    <div
      id={`content-card-${entry.content_key}`}
      style={{
        background: "var(--admin-card-bg)",
        border: isDirty
          ? "1px solid var(--charcoal)"
          : "1px solid var(--admin-card-border)",
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
            {meta.friendlyTitle}
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
            {entry.content_key}
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              padding: "0.2rem 0.5rem",
              background: "var(--sand)",
              color: "var(--charcoal)",
              borderRadius: "4px",
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
                color: "var(--charcoal)",
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
              color: "var(--admin-text-muted)",
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
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              borderRadius: "4px",
              color: "var(--admin-danger-text)",
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
              background: "var(--admin-status-active-bg)",
              border: "1px solid var(--admin-status-active-border)",
              borderRadius: "4px",
              color: "var(--admin-status-active-text)",
              fontSize: "0.8125rem",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Section 1: Indonesian Content */}
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.25rem",
            background: "var(--admin-bg)",
            border: "1px solid var(--admin-card-border)",
            borderRadius: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: "var(--sand)",
                color: "var(--charcoal)",
                border: "1px solid var(--admin-card-border)",
              }}
            >
              Bahasa Indonesia (Default)
            </span>
          </div>

          {/* Title Field (ID) */}
          <div className="admin-field" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label
                htmlFor={`title-${entry.content_key}`}
                className="admin-field-label"
                style={{ fontWeight: 600 }}
              >
                Headline / Title (ID)
              </label>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  color: title.length > 240 ? "var(--charcoal)" : "var(--admin-text-muted)",
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
            <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
              {meta.titleHint}
            </span>
          </div>

          {/* Content Field (ID) */}
          <div className="admin-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label
                htmlFor={`content-${entry.content_key}`}
                className="admin-field-label"
                style={{ fontWeight: 600 }}
              >
                Narrative Copy / Content (ID)
              </label>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  color: content.length > 4800 ? "var(--charcoal)" : "var(--admin-text-muted)",
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
            <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
              {meta.contentHint}
            </span>
          </div>
        </div>

        {/* Section 2: English Content */}
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.25rem",
            background: "var(--admin-bg)",
            border: "1px solid var(--admin-card-border)",
            borderRadius: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: "var(--sand)",
                color: "var(--charcoal)",
                border: "1px solid var(--admin-card-border)",
              }}
            >
              English (EN)
            </span>
            <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
              (Optional — falls back to Indonesian if omitted)
            </span>
          </div>

          {/* Title Field (EN) */}
          <div className="admin-field" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label
                htmlFor={`title-en-${entry.content_key}`}
                className="admin-field-label"
                style={{ fontWeight: 600 }}
              >
                Headline / Title (EN)
              </label>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  color: titleEn.length > 240 ? "var(--charcoal)" : "var(--admin-text-muted)",
                }}
              >
                {titleEn.length} / 255
              </span>
            </div>
            <input
              id={`title-en-${entry.content_key}`}
              type="text"
              className="admin-field-input"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              disabled={isSubmitting}
              placeholder="English headline (displayed when visitor selects English)"
              maxLength={255}
            />
            <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
              English headline displayed on public site when English locale is selected.
            </span>
          </div>

          {/* Content Field (EN) */}
          <div className="admin-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label
                htmlFor={`content-en-${entry.content_key}`}
                className="admin-field-label"
                style={{ fontWeight: 600 }}
              >
                Narrative Copy / Content (EN)
              </label>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  color: contentEn.length > 4800 ? "var(--charcoal)" : "var(--admin-text-muted)",
                }}
              >
                {contentEn.length} / 5000
              </span>
            </div>
            <textarea
              id={`content-en-${entry.content_key}`}
              className="admin-field-input"
              rows={meta.defaultRows}
              value={contentEn}
              onChange={(e) => setContentEn(e.target.value)}
              disabled={isSubmitting}
              placeholder="English narrative copy (displayed when visitor selects English)"
              maxLength={5000}
              style={{ resize: "vertical", lineHeight: 1.5 }}
            />
            <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
              English narrative body copy.
            </span>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--admin-card-border)",
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
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "#FFFFFF",
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

interface ContactContentCardProps {
  entry: AdminSiteContentEntry;
  onSaved: () => Promise<void>;
}

function ContactContentCard({ entry, onSaved }: ContactContentCardProps) {
  const meta = METADATA_MAP.contact_information;

  function parseContact(raw: string | null | undefined, isId: boolean): ContactContent {
    if (!raw || !raw.trim()) {
      return isId ? DEFAULT_CONTACT_CONTENT_ID : DEFAULT_CONTACT_CONTENT;
    }
    try {
      const parsed = JSON.parse(raw);
      const result = contactContentSchema.safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // Fall back to default contact content when JSON parsing fails
    }
    return isId ? DEFAULT_CONTACT_CONTENT_ID : DEFAULT_CONTACT_CONTENT;
  }

  const initialParsed = useMemo(() => parseContact(entry.content, true), [entry.content]);
  const initialTitle = entry.title ?? "Kontak ODE Outsole";

  const initialParsedEn = useMemo(() => parseContact(entry.content_en, false), [entry.content_en]);
  const initialTitleEn = entry.title_en ?? "Contact ODE Outsole";

  const [title, setTitle] = useState(initialTitle);
  const [data, setData] = useState<ContactContent>(initialParsed);

  const [titleEn, setTitleEn] = useState(initialTitleEn);
  const [dataEn, setDataEn] = useState<ContactContent>(initialParsedEn);

  const [contactTab, setContactTab] = useState<"all" | "id" | "en">("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isTitleDirty = title !== initialTitle;
  const isTitleEnDirty = titleEn !== initialTitleEn;
  const isContentDirty = useMemo(() => {
    return JSON.stringify(data) !== JSON.stringify(initialParsed);
  }, [data, initialParsed]);
  const isContentEnDirty = useMemo(() => {
    return JSON.stringify(dataEn) !== JSON.stringify(initialParsedEn);
  }, [dataEn, initialParsedEn]);

  const isDirty = isTitleDirty || isTitleEnDirty || isContentDirty || isContentEnDirty;

  // Indonesian field updaters
  function updateFacilityField(field: keyof ContactContent["facility"], value: string) {
    setData((prev) => ({
      ...prev,
      facility: { ...prev.facility, [field]: value },
    }));
  }

  function updateDirectEmailField(field: keyof ContactContent["directEmail"], value: string) {
    setData((prev) => ({
      ...prev,
      directEmail: { ...prev.directEmail, [field]: value },
    }));
  }

  function updatePhoneWhatsappField(field: keyof ContactContent["phoneWhatsapp"], value: string) {
    setData((prev) => ({
      ...prev,
      phoneWhatsapp: { ...prev.phoneWhatsapp, [field]: value },
    }));
  }

  function updateOperatingHoursField(field: keyof ContactContent["operatingHours"], value: string) {
    setData((prev) => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, [field]: value },
    }));
  }

  // English field updaters
  function updateFacilityEnField(field: keyof ContactContent["facility"], value: string) {
    setDataEn((prev) => ({
      ...prev,
      facility: { ...prev.facility, [field]: value },
    }));
  }

  function updateDirectEmailEnField(field: keyof ContactContent["directEmail"], value: string) {
    setDataEn((prev) => ({
      ...prev,
      directEmail: { ...prev.directEmail, [field]: value },
    }));
  }

  function updatePhoneWhatsappEnField(field: keyof ContactContent["phoneWhatsapp"], value: string) {
    setDataEn((prev) => ({
      ...prev,
      phoneWhatsapp: { ...prev.phoneWhatsapp, [field]: value },
    }));
  }

  function updateOperatingHoursEnField(field: keyof ContactContent["operatingHours"], value: string) {
    setDataEn((prev) => ({
      ...prev,
      operatingHours: { ...prev.operatingHours, [field]: value },
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("Bahasa Indonesia Headline / Title cannot be empty.");
      return;
    }
    if (trimmedTitle.length > 255) {
      setErrorMsg("Bahasa Indonesia Headline / Title must not exceed 255 characters.");
      return;
    }

    const trimmedTitleEn = titleEn.trim();
    if (trimmedTitleEn && trimmedTitleEn.length > 255) {
      setErrorMsg("English Headline / Title must not exceed 255 characters.");
      return;
    }

    const validationResult = contactContentSchema.safeParse(data);
    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0];
      const fieldPath = firstIssue ? firstIssue.path.join(" -> ") : "";
      const msg = firstIssue
        ? `[Bahasa Indonesia ${fieldPath ? `${fieldPath}` : ""}] ${firstIssue.message}`
        : "Validation failed for Indonesian contact information.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    const validationResultEn = contactContentSchema.safeParse(dataEn);
    if (!validationResultEn.success) {
      const firstIssue = validationResultEn.error.issues[0];
      const fieldPath = firstIssue ? firstIssue.path.join(" -> ") : "";
      const msg = firstIssue
        ? `[English ${fieldPath ? `${fieldPath}` : ""}] ${firstIssue.message}`
        : "Validation failed for English contact information.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const serialized = JSON.stringify(validationResult.data, null, 2);
      const serializedEn = JSON.stringify(validationResultEn.data, null, 2);
      await updateAdminSiteContentEntry({
        data: {
          content_key: "contact_information",
          title: trimmedTitle,
          content: serialized,
          title_en: trimmedTitleEn || undefined,
          content_en: serializedEn,
        },
      });
      setSuccessMsg("Contact coordinates and cards updated successfully for both languages!");
      toast.success("Updated Contact Coordinates & Cards (Bilingual)");
      await onSaved();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update contact content";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setTitle(initialTitle);
    setData(initialParsed);
    setTitleEn(initialTitleEn);
    setDataEn(initialParsedEn);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  const subPanelStyle: React.CSSProperties = {
    background: "var(--admin-bg)",
    border: "1px solid var(--admin-card-border)",
    borderRadius: "4px",
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };

  const subHeaderStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "var(--charcoal)",
    textTransform: "uppercase",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const subHeaderEnStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "var(--charcoal)",
    textTransform: "uppercase",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  const showId = contactTab === "all" || contactTab === "id";
  const showEn = contactTab === "all" || contactTab === "en";

  return (
    <div
      id="content-card-contact_information"
      style={{
        background: "var(--admin-card-bg)",
        border: isDirty
          ? "1px solid var(--charcoal)"
          : "1px solid var(--admin-card-border)",
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
            {meta.friendlyTitle}
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
            {entry.content_key}
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              padding: "0.2rem 0.5rem",
              background: "var(--sand)",
              color: "var(--charcoal)",
              borderRadius: "4px",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Contact Page (/contact) · Bilingual Facility &amp; 4 Cards
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isDirty && (
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.6875rem",
                color: "var(--charcoal)",
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
              color: "var(--admin-text-muted)",
            }}
            title={entry.updated_at}
          >
            Updated: {formatDate(entry.updated_at)}
          </span>
        </div>
      </div>

      {/* Language View Switcher */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1.25rem",
          background: "var(--admin-bg)",
          borderBottom: "1px solid var(--admin-card-border)",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", fontWeight: 500 }}>
          View Fields:
        </span>
        <button
          type="button"
          id="contact-lang-tab-all"
          onClick={() => setContactTab("all")}
          className={`admin-btn ${contactTab === "all" ? "admin-btn-primary" : "admin-btn-secondary"} admin-btn-sm`}
          style={{ fontSize: "0.6875rem", padding: "0.25rem 0.6rem" }}
        >
          Show Both
        </button>
        <button
          type="button"
          id="contact-lang-tab-id"
          onClick={() => setContactTab("id")}
          className={`admin-btn ${contactTab === "id" ? "admin-btn-primary" : "admin-btn-secondary"} admin-btn-sm`}
          style={{ fontSize: "0.6875rem", padding: "0.25rem 0.6rem" }}
        >
          Bahasa Indonesia (ID){(isTitleDirty || isContentDirty) && " ●"}
        </button>
        <button
          type="button"
          id="contact-lang-tab-en"
          onClick={() => setContactTab("en")}
          className={`admin-btn ${contactTab === "en" ? "admin-btn-primary" : "admin-btn-secondary"} admin-btn-sm`}
          style={{ fontSize: "0.6875rem", padding: "0.25rem 0.6rem" }}
        >
          English (EN){(isTitleEnDirty || isContentEnDirty) && " ●"}
        </button>
      </div>

      {/* Card Form */}
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
              background: "var(--admin-danger-bg)",
              border: "1px solid var(--admin-danger-border)",
              borderRadius: "4px",
              color: "var(--admin-danger-text)",
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
              background: "var(--admin-status-active-bg)",
              border: "1px solid var(--admin-status-active-border)",
              borderRadius: "4px",
              color: "var(--admin-status-active-text)",
              fontSize: "0.8125rem",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 1: BAHASA INDONESIA (ID)                               */}
        {/* ============================================================== */}
        {showId && (
          <div
            style={{
              marginBottom: showEn ? "2rem" : "1.25rem",
              padding: "1.25rem",
              background: "var(--admin-card-bg)",
              border: "1px solid var(--admin-card-border)",
              borderRadius: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  background: "var(--sand)",
                  color: "var(--charcoal)",
                  border: "1px solid var(--admin-card-border)",
                }}
              >
                Bahasa Indonesia (ID) — Default Public
              </span>
            </div>

            {/* 1. Page Header Block (ID) */}
            <div style={subPanelStyle}>
              <div style={subHeaderStyle}>
                <span>Header Halaman Kontak</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div className="admin-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <label htmlFor="title-contact_information" className="admin-field-label" style={{ fontWeight: 600 }}>
                      Judul / Headline Halaman
                    </label>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                      {title.length} / 255
                    </span>
                  </div>
                  <input
                    id="title-contact_information"
                    type="text"
                    className="admin-field-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Kontak ODE Outsole"
                    maxLength={255}
                  />
                </div>

                <div className="admin-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <label htmlFor="contact-intro" className="admin-field-label" style={{ fontWeight: 600 }}>
                      Deskripsi Pengantar / Intro
                    </label>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                      {data.intro.length} / 1000
                    </span>
                  </div>
                  <textarea
                    id="contact-intro"
                    className="admin-field-input"
                    rows={2}
                    value={data.intro}
                    onChange={(e) => setData((prev) => ({ ...prev, intro: e.target.value }))}
                    disabled={isSubmitting}
                    placeholder="Hubungi langsung tim insinyur compounding rubber..."
                    maxLength={1000}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Facility Card (ID) */}
            <div style={subPanelStyle}>
              <div style={subHeaderStyle}>
                <span>1. Kartu Fasilitas Pabrik</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-facility-eyebrow" className="admin-field-label">
                      Label Seksi / Eyebrow
                    </label>
                    <input
                      id="contact-facility-eyebrow"
                      type="text"
                      className="admin-field-input"
                      value={data.facility.eyebrow}
                      onChange={(e) => updateFacilityField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Fasilitas"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-facility-heading" className="admin-field-label">
                      Judul Kartu
                    </label>
                    <input
                      id="contact-facility-heading"
                      type="text"
                      className="admin-field-input"
                      value={data.facility.heading}
                      onChange={(e) => updateFacilityField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="PT ODE CIPTA SEMESTA"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-facility-name" className="admin-field-label">
                    Nama Entitas / Perusahaan
                  </label>
                  <input
                    id="contact-facility-name"
                    type="text"
                    className="admin-field-input"
                    value={data.facility.name}
                    onChange={(e) => updateFacilityField("name", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="PT ODE CIPTA SEMESTA"
                    maxLength={200}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-facility-address" className="admin-field-label">
                    Alamat Lengkap Fasilitas
                  </label>
                  <textarea
                    id="contact-facility-address"
                    className="admin-field-input"
                    rows={3}
                    value={data.facility.address}
                    onChange={(e) => updateFacilityField("address", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Jl. Kidemang Singomenggolo..."
                    maxLength={500}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-facility-footernote" className="admin-field-label">
                    Catatan Kaki
                  </label>
                  <input
                    id="contact-facility-footernote"
                    type="text"
                    className="admin-field-input"
                    value={data.facility.footerNote}
                    onChange={(e) => updateFacilityField("footerNote", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Kunjungan audit pabrik berdasarkan perjanjian"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            {/* 3. Direct Email Card (ID) */}
            <div style={subPanelStyle}>
              <div style={subHeaderStyle}>
                <span>2. Kartu Email Langsung</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-email-eyebrow" className="admin-field-label">
                      Label Seksi / Eyebrow
                    </label>
                    <input
                      id="contact-email-eyebrow"
                      type="text"
                      className="admin-field-input"
                      value={data.directEmail.eyebrow}
                      onChange={(e) => updateDirectEmailField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Email Langsung"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-email-heading" className="admin-field-label">
                      Judul Kartu
                    </label>
                    <input
                      id="contact-email-heading"
                      type="text"
                      className="admin-field-input"
                      value={data.directEmail.heading}
                      onChange={(e) => updateDirectEmailField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Penjualan Outsole"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-email-description" className="admin-field-label">
                    Deskripsi
                  </label>
                  <textarea
                    id="contact-email-description"
                    className="admin-field-input"
                    rows={2}
                    value={data.directEmail.description}
                    onChange={(e) => updateDirectEmailField("description", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Hubungi kami melalui email..."
                    maxLength={500}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-email-address" className="admin-field-label">
                    Alamat Email Langsung
                  </label>
                  <input
                    id="contact-email-address"
                    type="email"
                    className="admin-field-input"
                    value={data.directEmail.email}
                    onChange={(e) => updateDirectEmailField("email", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="sales@ode.co.id"
                    maxLength={255}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-email-footernote" className="admin-field-label">
                    Catatan Kaki
                  </label>
                  <input
                    id="contact-email-footernote"
                    type="text"
                    className="admin-field-input"
                    value={data.directEmail.footerNote}
                    onChange={(e) => updateDirectEmailField("footerNote", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Respons biasanya dalam < 24 jam kerja"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            {/* 4. Phone & WhatsApp Card (ID) */}
            <div style={subPanelStyle}>
              <div style={subHeaderStyle}>
                <span>3. Kartu Telepon &amp; WhatsApp</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-eyebrow" className="admin-field-label">
                      Label Seksi / Eyebrow
                    </label>
                    <input
                      id="contact-phone-eyebrow"
                      type="text"
                      className="admin-field-input"
                      value={data.phoneWhatsapp.eyebrow}
                      onChange={(e) => updatePhoneWhatsappField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Saluran Langsung"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-heading" className="admin-field-label">
                      Judul Kartu
                    </label>
                    <input
                      id="contact-phone-heading"
                      type="text"
                      className="admin-field-input"
                      value={data.phoneWhatsapp.heading}
                      onChange={(e) => updatePhoneWhatsappField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Telepon & WhatsApp"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-phone-description" className="admin-field-label">
                    Deskripsi
                  </label>
                  <textarea
                    id="contact-phone-description"
                    className="admin-field-input"
                    rows={2}
                    value={data.phoneWhatsapp.description}
                    onChange={(e) => updatePhoneWhatsappField("description", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Bicara langsung dengan tim penjualan kami..."
                    maxLength={500}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-number" className="admin-field-label">
                      Nomor Telepon Kantor
                    </label>
                    <input
                      id="contact-phone-number"
                      type="text"
                      className="admin-field-input"
                      value={data.phoneWhatsapp.phone}
                      onChange={(e) => updatePhoneWhatsappField("phone", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="(031) 8929186"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-whatsapp" className="admin-field-label">
                      Nomor WhatsApp
                    </label>
                    <input
                      id="contact-phone-whatsapp"
                      type="text"
                      className="admin-field-input"
                      value={data.phoneWhatsapp.whatsapp}
                      onChange={(e) => updatePhoneWhatsappField("whatsapp", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="+62 123-456-789 (WhatsApp)"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-phone-footernote" className="admin-field-label">
                    Catatan Kaki
                  </label>
                  <input
                    id="contact-phone-footernote"
                    type="text"
                    className="admin-field-input"
                    value={data.phoneWhatsapp.footerNote}
                    onChange={(e) => updatePhoneWhatsappField("footerNote", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Melayani Bahasa Indonesia & English"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            {/* 5. Schedule / Operating Hours Card (ID) */}
            <div style={subPanelStyle}>
              <div style={subHeaderStyle}>
                <span>4. Kartu Jadwal &amp; Jam Operasional</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-eyebrow" className="admin-field-label">
                      Label Seksi / Eyebrow
                    </label>
                    <input
                      id="contact-hours-eyebrow"
                      type="text"
                      className="admin-field-input"
                      value={data.operatingHours.eyebrow}
                      onChange={(e) => updateOperatingHoursField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Jadwal Operasional"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-heading" className="admin-field-label">
                      Judul Kartu
                    </label>
                    <input
                      id="contact-hours-heading"
                      type="text"
                      className="admin-field-input"
                      value={data.operatingHours.heading}
                      onChange={(e) => updateOperatingHoursField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Jam Operasional"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-mondayfriday" className="admin-field-label">
                      Jam Kerja Senin – Jumat
                    </label>
                    <input
                      id="contact-hours-mondayfriday"
                      type="text"
                      className="admin-field-input"
                      value={data.operatingHours.mondayFriday}
                      onChange={(e) => updateOperatingHoursField("mondayFriday", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="08:00 – 16:00"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-saturday" className="admin-field-label">
                      Jam Kerja Sabtu
                    </label>
                    <input
                      id="contact-hours-saturday"
                      type="text"
                      className="admin-field-input"
                      value={data.operatingHours.saturday}
                      onChange={(e) => updateOperatingHoursField("saturday", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="08:00 – 14:00"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-sunday" className="admin-field-label">
                      Minggu &amp; Libur Nasional
                    </label>
                    <input
                      id="contact-hours-sunday"
                      type="text"
                      className="admin-field-input"
                      value={data.operatingHours.sunday}
                      onChange={(e) => updateOperatingHoursField("sunday", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Tutup"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-timezone" className="admin-field-label">
                      Zona Waktu
                    </label>
                    <input
                      id="contact-hours-timezone"
                      type="text"
                      className="admin-field-input"
                      value={data.operatingHours.timezone}
                      onChange={(e) => updateOperatingHoursField("timezone", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Waktu Indonesia Barat (WIB / UTC+7)"
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: ENGLISH (EN)                                        */}
        {/* ============================================================== */}
        {showEn && (
          <div
            style={{
              marginBottom: "1.25rem",
              padding: "1.25rem",
              background: "var(--admin-card-bg)",
              border: "1px solid var(--admin-card-border)",
              borderRadius: "4px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  background: "var(--sand)",
                  color: "var(--charcoal)",
                  border: "1px solid var(--admin-card-border)",
                }}
              >
                English (EN) — Bilingual Public
              </span>
              <span style={{ fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                (Shown when visitor selects English)
              </span>
            </div>

            {/* 1. Page Header Block (EN) */}
            <div style={subPanelStyle}>
              <div style={subHeaderEnStyle}>
                <span>Contact Page Header (EN)</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div className="admin-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <label htmlFor="title-en-contact_information" className="admin-field-label" style={{ fontWeight: 600 }}>
                      Headline / Title (EN)
                    </label>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                      {titleEn.length} / 255
                    </span>
                  </div>
                  <input
                    id="title-en-contact_information"
                    type="text"
                    className="admin-field-input"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Contact ODE Outsole"
                    maxLength={255}
                  />
                </div>

                <div className="admin-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <label htmlFor="contact-intro-en" className="admin-field-label" style={{ fontWeight: 600 }}>
                      Intro Narrative / Tagline (EN)
                    </label>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.6875rem", color: "var(--admin-text-muted)" }}>
                      {dataEn.intro.length} / 1000
                    </span>
                  </div>
                  <textarea
                    id="contact-intro-en"
                    className="admin-field-input"
                    rows={2}
                    value={dataEn.intro}
                    onChange={(e) => setDataEn((prev) => ({ ...prev, intro: e.target.value }))}
                    disabled={isSubmitting}
                    placeholder="Connect directly with our rubber compounding engineers, tooling mold specialists, and commercial sales team..."
                    maxLength={1000}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Facility Card (EN) */}
            <div style={subPanelStyle}>
              <div style={subHeaderEnStyle}>
                <span>1. Facility Card (EN)</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-facility-eyebrow-en" className="admin-field-label">
                      Section Label / Eyebrow (EN)
                    </label>
                    <input
                      id="contact-facility-eyebrow-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.facility.eyebrow}
                      onChange={(e) => updateFacilityEnField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Facility"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-facility-heading-en" className="admin-field-label">
                      Card Heading (EN)
                    </label>
                    <input
                      id="contact-facility-heading-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.facility.heading}
                      onChange={(e) => updateFacilityEnField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="PT ODE CIPTA SEMESTA"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-facility-name-en" className="admin-field-label">
                    Facility / Company Name
                  </label>
                  <input
                    id="contact-facility-name-en"
                    type="text"
                    className="admin-field-input"
                    value={dataEn.facility.name}
                    onChange={(e) => updateFacilityEnField("name", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="PT ODE CIPTA SEMESTA"
                    maxLength={200}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-facility-address-en" className="admin-field-label">
                    Facility Address (Line breaks preserved)
                  </label>
                  <textarea
                    id="contact-facility-address-en"
                    className="admin-field-input"
                    rows={3}
                    value={dataEn.facility.address}
                    onChange={(e) => updateFacilityEnField("address", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Jl. Kidemang Singomenggolo..."
                    maxLength={500}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-facility-footernote-en" className="admin-field-label">
                    Footer Note (EN)
                  </label>
                  <input
                    id="contact-facility-footernote-en"
                    type="text"
                    className="admin-field-input"
                    value={dataEn.facility.footerNote}
                    onChange={(e) => updateFacilityEnField("footerNote", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Factory audits by appointment"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            {/* 3. Direct Email Card (EN) */}
            <div style={subPanelStyle}>
              <div style={subHeaderEnStyle}>
                <span>2. Direct Email Card (EN)</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-email-eyebrow-en" className="admin-field-label">
                      Section Label / Eyebrow (EN)
                    </label>
                    <input
                      id="contact-email-eyebrow-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.directEmail.eyebrow}
                      onChange={(e) => updateDirectEmailEnField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Direct Email"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-email-heading-en" className="admin-field-label">
                      Card Heading (EN)
                    </label>
                    <input
                      id="contact-email-heading-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.directEmail.heading}
                      onChange={(e) => updateDirectEmailEnField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Outsole Sales"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-email-description-en" className="admin-field-label">
                    Description (EN)
                  </label>
                  <textarea
                    id="contact-email-description-en"
                    className="admin-field-input"
                    rows={2}
                    value={dataEn.directEmail.description}
                    onChange={(e) => updateDirectEmailEnField("description", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Contact Us by e-mail."
                    maxLength={500}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-email-address-en" className="admin-field-label">
                    Direct Email Address
                  </label>
                  <input
                    id="contact-email-address-en"
                    type="email"
                    className="admin-field-input"
                    value={dataEn.directEmail.email}
                    onChange={(e) => updateDirectEmailEnField("email", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="sales@ode.co.id"
                    maxLength={255}
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-email-footernote-en" className="admin-field-label">
                    Footer Note (EN)
                  </label>
                  <input
                    id="contact-email-footernote-en"
                    type="text"
                    className="admin-field-input"
                    value={dataEn.directEmail.footerNote}
                    onChange={(e) => updateDirectEmailEnField("footerNote", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Typical response: < 24 business hours"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            {/* 4. Phone & WhatsApp Card (EN) */}
            <div style={subPanelStyle}>
              <div style={subHeaderEnStyle}>
                <span>3. Phone &amp; WhatsApp Card (EN)</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-eyebrow-en" className="admin-field-label">
                      Section Label / Eyebrow (EN)
                    </label>
                    <input
                      id="contact-phone-eyebrow-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.phoneWhatsapp.eyebrow}
                      onChange={(e) => updatePhoneWhatsappEnField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Direct Line"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-heading-en" className="admin-field-label">
                      Card Heading (EN)
                    </label>
                    <input
                      id="contact-phone-heading-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.phoneWhatsapp.heading}
                      onChange={(e) => updatePhoneWhatsappEnField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Phone & WhatsApp"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-phone-description-en" className="admin-field-label">
                    Description (EN)
                  </label>
                  <textarea
                    id="contact-phone-description-en"
                    className="admin-field-input"
                    rows={2}
                    value={dataEn.phoneWhatsapp.description}
                    onChange={(e) => updatePhoneWhatsappEnField("description", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Speak directly with our sales team."
                    maxLength={500}
                    style={{ resize: "vertical", lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-number-en" className="admin-field-label">
                      Office Phone Number
                    </label>
                    <input
                      id="contact-phone-number-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.phoneWhatsapp.phone}
                      onChange={(e) => updatePhoneWhatsappEnField("phone", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="(031) 8929186"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-phone-whatsapp-en" className="admin-field-label">
                      WhatsApp Number
                    </label>
                    <input
                      id="contact-phone-whatsapp-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.phoneWhatsapp.whatsapp}
                      onChange={(e) => updatePhoneWhatsappEnField("whatsapp", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="+62 123-456-789 (WhatsApp)"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="contact-phone-footernote-en" className="admin-field-label">
                    Footer Note (EN)
                  </label>
                  <input
                    id="contact-phone-footernote-en"
                    type="text"
                    className="admin-field-input"
                    value={dataEn.phoneWhatsapp.footerNote}
                    onChange={(e) => updatePhoneWhatsappEnField("footerNote", e.target.value)}
                    disabled={isSubmitting}
                    placeholder="English & Indonesian supported"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            {/* 5. Schedule / Operating Hours Card (EN) */}
            <div style={subPanelStyle}>
              <div style={subHeaderEnStyle}>
                <span>4. Schedule / Operating Hours Card (EN)</span>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-eyebrow-en" className="admin-field-label">
                      Section Label / Eyebrow (EN)
                    </label>
                    <input
                      id="contact-hours-eyebrow-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.operatingHours.eyebrow}
                      onChange={(e) => updateOperatingHoursEnField("eyebrow", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Schedule"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-heading-en" className="admin-field-label">
                      Card Heading (EN)
                    </label>
                    <input
                      id="contact-hours-heading-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.operatingHours.heading}
                      onChange={(e) => updateOperatingHoursEnField("heading", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Operating Hours"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-mondayfriday-en" className="admin-field-label">
                      Monday – Friday Hours
                    </label>
                    <input
                      id="contact-hours-mondayfriday-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.operatingHours.mondayFriday}
                      onChange={(e) => updateOperatingHoursEnField("mondayFriday", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="08:00 – 16:00"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-saturday-en" className="admin-field-label">
                      Saturday Hours
                    </label>
                    <input
                      id="contact-hours-saturday-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.operatingHours.saturday}
                      onChange={(e) => updateOperatingHoursEnField("saturday", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="08:00 – 14:00"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-sunday-en" className="admin-field-label">
                      Sunday Hours
                    </label>
                    <input
                      id="contact-hours-sunday-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.operatingHours.sunday}
                      onChange={(e) => updateOperatingHoursEnField("sunday", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Closed"
                      maxLength={100}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="contact-hours-timezone-en" className="admin-field-label">
                      Timezone
                    </label>
                    <input
                      id="contact-hours-timezone-en"
                      type="text"
                      className="admin-field-input"
                      value={dataEn.operatingHours.timezone}
                      onChange={(e) => updateOperatingHoursEnField("timezone", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Western Indonesia (UTC+7)"
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--admin-card-border)",
          }}
        >
          {isDirty && (
            <button
              type="button"
              id="reset-btn-contact_information"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={handleReset}
              disabled={isSubmitting}
            >
              Discard Changes
            </button>
          )}

          <button
            type="submit"
            id="save-btn-contact_information"
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
                    border: "2px solid rgba(255, 255, 255, 0.3)",
                    borderTopColor: "#FFFFFF",
                    borderRadius: "50%",
                    animation: "admin-spin 0.65s linear infinite",
                  }}
                />
                <span>Saving…</span>
              </>
            ) : (
              "Save Contact Information"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// Interior Hero Content Card (Polish Pass 3 — Shared Interior Hero System)
// Visual image management for the interior hero across /catalog, /about, /contact, /request-sample
// ============================================================================

interface InteriorHeroContentCardProps {
  entry: AdminSiteContentEntry;
  onSaved: () => Promise<void>;
}

const HERO_ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp"] as const;
const HERO_ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
const HERO_MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

function InteriorHeroContentCard({ entry, onSaved }: InteriorHeroContentCardProps) {
  const meta = METADATA_MAP.interior_hero;
  const initialConfig = useMemo(() => parseInteriorHero(entry.content), [entry.content]);
  const initialConfigEn = useMemo(() => parseInteriorHero(entry.content_en), [entry.content_en]);

  // Server-signed URL for current hero image preview
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Metadata form state (Indonesian)
  const [altText, setAltText] = useState(initialConfig.altText);
  const [eyebrow, setEyebrow] = useState(initialConfig.eyebrow);
  const [title, setTitle] = useState(initialConfig.title);
  const [description, setDescription] = useState(initialConfig.description);

  // Metadata form state (English)
  const [altTextEn, setAltTextEn] = useState(initialConfigEn.altText || "");
  const [eyebrowEn, setEyebrowEn] = useState(initialConfigEn.eyebrow || "");
  const [titleEn, setTitleEn] = useState(initialConfigEn.title || "");
  const [descriptionEn, setDescriptionEn] = useState(initialConfigEn.description || "");

  // Sync metadata when entry changes if not dirty
  useEffect(() => {
    setAltText(initialConfig.altText);
    setEyebrow(initialConfig.eyebrow);
    setTitle(initialConfig.title);
    setDescription(initialConfig.description);

    setAltTextEn(initialConfigEn.altText || "");
    setEyebrowEn(initialConfigEn.eyebrow || "");
    setTitleEn(initialConfigEn.title || "");
    setDescriptionEn(initialConfigEn.description || "");
  }, [initialConfig, initialConfigEn]);

  // Load preview signed URL
  useEffect(() => {
    let active = true;
    if (initialConfig.imagePath) {
      setIsLoadingPreview(true);
      getInteriorHeroAdminPreview()
        .then((res) => {
          if (active) {
            setCurrentImageUrl(res.imageUrl);
          }
        })
        .catch((err) => {
          console.error("Failed to load interior hero preview:", err);
        })
        .finally(() => {
          if (active) setIsLoadingPreview(false);
        });
    } else {
      setCurrentImageUrl(null);
      setIsLoadingPreview(false);
    }
    return () => {
      active = false;
    };
  }, [initialConfig.imagePath]);

  // Local file selection & preview state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMetaDirty =
    altText !== initialConfig.altText ||
    eyebrow !== initialConfig.eyebrow ||
    title !== initialConfig.title ||
    description !== initialConfig.description ||
    altTextEn !== (initialConfigEn.altText || "") ||
    eyebrowEn !== (initialConfigEn.eyebrow || "") ||
    titleEn !== (initialConfigEn.title || "") ||
    descriptionEn !== (initialConfigEn.description || "");

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate extension
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!HERO_ALLOWED_EXTS.includes(ext as (typeof HERO_ALLOWED_EXTS)[number])) {
      setErrorMsg(`Unsupported file type ".${ext}". Please select a JPG, PNG, or WebP image.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size (8 MB)
    if (file.size > HERO_MAX_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`Selected image is ${sizeMb} MB. Maximum allowed size is 8 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Revoke previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objUrl);
  }

  async function handleUploadImage() {
    if (!selectedFile || isUploading) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsUploading(true);
    setUploadStatus("Reading image file…");

    try {
      // 1. Read base64
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
        selectedFile.type && HERO_ALLOWED_MIMES.includes(selectedFile.type as (typeof HERO_ALLOWED_MIMES)[number])
          ? (selectedFile.type as (typeof HERO_ALLOWED_MIMES)[number])
          : selectedFile.name.endsWith(".png")
            ? "image/png"
            : selectedFile.name.endsWith(".webp")
              ? "image/webp"
              : "image/jpeg";

      const res = await uploadInteriorHeroImage({
        data: {
          fileName: selectedFile.name,
          contentType: mime,
          fileBase64: base64,
          altText: altText.trim() || "Fasilitas manufaktur ODE Outsole",
          eyebrow: eyebrow.trim(),
          title: title.trim(),
          description: description.trim(),
          altText_en: altTextEn.trim() || undefined,
          eyebrow_en: eyebrowEn.trim() || undefined,
          title_en: titleEn.trim() || undefined,
          description_en: descriptionEn.trim() || undefined,
        },
      });

      if (res.success) {
        setCurrentImageUrl(res.imageUrl);
        handleClearFile();
        setSuccessMsg("Interior hero image uploaded and applied successfully.");
        toast.success("Interior hero image updated");
        await onSaved();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload image. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadStatus(null);
    }
  }

  async function handleSaveMetadata(e: React.FormEvent) {
    e.preventDefault();
    if (isSavingMeta || !isMetaDirty) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSavingMeta(true);

    try {
      await updateInteriorHeroMetadata({
        data: {
          altText: altText.trim() || "Fasilitas manufaktur ODE Outsole",
          eyebrow: eyebrow.trim(),
          title: title.trim(),
          description: description.trim(),
          altText_en: altTextEn.trim() || undefined,
          eyebrow_en: eyebrowEn.trim() || undefined,
          title_en: titleEn.trim() || undefined,
          description_en: descriptionEn.trim() || undefined,
        },
      });

      setSuccessMsg("Interior hero metadata updated successfully for both languages.");
      toast.success("Interior hero metadata saved");
      await onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update metadata.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsSavingMeta(false);
    }
  }

  function handleResetMetadata() {
    setAltText(initialConfig.altText);
    setEyebrow(initialConfig.eyebrow);
    setTitle(initialConfig.title);
    setDescription(initialConfig.description);
    setAltTextEn(initialConfigEn.altText || "");
    setEyebrowEn(initialConfigEn.eyebrow || "");
    setTitleEn(initialConfigEn.title || "");
    setDescriptionEn(initialConfigEn.description || "");
    setErrorMsg(null);
  }

  return (
    <div
      id={`content-card-${entry.content_key}`}
      style={{
        background: "var(--admin-card-bg)",
        border: selectedFile || isMetaDirty
          ? "1px solid var(--charcoal)"
          : "1px solid var(--admin-card-border)",
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
            {meta.friendlyTitle}
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
            {entry.content_key}
          </span>
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              background: "var(--sand)",
              color: "var(--charcoal)",
              border: "1px solid var(--admin-card-border)",
            }}
          >
            Shared Background
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--admin-text-muted)",
              fontFamily: "var(--font-mono, monospace)",
            }}
          >
            Updated {formatDate(entry.updated_at)}
          </span>
        </div>
      </div>

      {/* Scope / Affected Routes banner */}
      <div
        style={{
          padding: "0.75rem 1.25rem",
          background: "var(--admin-bg)",
          borderBottom: "1px solid var(--admin-card-border)",
          fontSize: "0.75rem",
          color: "var(--admin-text-muted)",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--admin-text-main)" }}>Public Scope:</span>
        <span
          style={{
            display: "inline-flex",
            gap: "0.35rem",
            alignItems: "center",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          <a
            href="/catalog"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.15rem 0.4rem",
              background: "var(--admin-badge-bg)",
              borderRadius: "4px",
              color: "var(--admin-text-main)",
              textDecoration: "none",
            }}
          >
            /catalog ↗
          </a>
          <a
            href="/about"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.15rem 0.4rem",
              background: "var(--admin-badge-bg)",
              borderRadius: "4px",
              color: "var(--admin-text-main)",
              textDecoration: "none",
            }}
          >
            /about ↗
          </a>
          <a
            href="/contact"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.15rem 0.4rem",
              background: "var(--admin-badge-bg)",
              borderRadius: "4px",
              color: "var(--admin-text-main)",
              textDecoration: "none",
            }}
          >
            /contact ↗
          </a>
          <a
            href="/request-sample"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.15rem 0.4rem",
              background: "var(--admin-badge-bg)",
              borderRadius: "4px",
              color: "var(--admin-text-main)",
              textDecoration: "none",
            }}
          >
            /request-sample ↗
          </a>
        </span>
        <span style={{ color: "var(--admin-text-muted)", marginLeft: "auto" }}>
          Homepage hero (/) is separate &amp; untouched.
        </span>
      </div>

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

        {/* 1. VISUAL CURRENT IMAGE DISPLAY */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.625rem",
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
              Current Hero Image
            </label>
            {initialConfig.imagePath && (
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
                {initialConfig.imagePath}
              </span>
            )}
          </div>

          {currentImageUrl ? (
            <div
              id="interior-hero-current-preview"
              style={{
                position: "relative",
                width: "100%",
                height: "220px",
                borderRadius: "4px",
                overflow: "hidden",
                border: "1px solid var(--admin-card-border)",
                background: "var(--admin-bg)",
              }}
            >
              <img
                src={currentImageUrl}
                alt={initialConfig.altText || "Current Interior Hero"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  display: "block",
                }}
              />
              {/* Subtle dark gradient overlay to simulate public look */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.65) 100%)",
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "0.75rem",
                  left: "1rem",
                  right: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  pointerEvents: "none",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#FFFFFF",
                      background: "rgba(41, 41, 37, 0.75)",
                      padding: "0.2rem 0.45rem",
                      borderRadius: "4px",
                      backdropFilter: "blur(4px)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Active Hero Image
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "#FFFFFF",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    }}
                  >
                    Alt: &ldquo;{initialConfig.altText || "ODE Outsole manufacturing facility"}&rdquo;
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "rgba(255, 255, 255, 0.8)",
                    background: "rgba(41, 41, 37, 0.75)",
                    padding: "0.2rem 0.45rem",
                    borderRadius: "4px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  Signed URL active
                </span>
              </div>
            </div>
          ) : isLoadingPreview ? (
            <div
              style={{
                width: "100%",
                height: "160px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background: "var(--admin-bg)",
                border: "1px dashed var(--admin-card-border)",
                borderRadius: "4px",
                color: "var(--admin-text-muted)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "18px",
                  height: "18px",
                  border: "2px solid var(--sand)",
                  borderTopColor: "var(--charcoal)",
                  borderRadius: "50%",
                  animation: "admin-spin 0.65s linear infinite",
                }}
              />
              <span style={{ fontSize: "0.8125rem" }}>Loading preview from secure storage…</span>
            </div>
          ) : (
            <div
              id="interior-hero-empty-state"
              style={{
                padding: "2rem 1.5rem",
                textAlign: "center",
                background: "var(--admin-bg)",
                border: "1px dashed var(--admin-card-border)",
                borderRadius: "4px",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "0.3rem 0.75rem",
                  background: "var(--sand)",
                  color: "var(--charcoal)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  borderRadius: "4px",
                  marginBottom: "0.5rem",
                }}
              >
                No Interior Hero Image Configured
              </div>
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  fontSize: "0.8125rem",
                  color: "var(--admin-text-muted)",
                }}
              >
                Public interior pages (/catalog, /about, /contact, /request-sample) are currently displaying the dark architectural fallback.
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  color: "var(--admin-text-muted)",
                }}
              >
                Upload an image below to set a unified hero background across all interior pages.
              </p>
            </div>
          )}
        </div>

        {/* 2. UPLOAD / REPLACE IMAGE SECTION */}
        <div
          style={{
            background: "var(--admin-bg)",
            border: "1px solid var(--admin-card-border)",
            borderRadius: "4px",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--admin-text-main)",
                }}
              >
                {initialConfig.imagePath ? "Replace Hero Image" : "Upload Hero Image"}
              </h3>
              <p
                style={{
                  margin: "0.2rem 0 0 0",
                  fontSize: "0.75rem",
                  color: "var(--admin-text-muted)",
                }}
              >
                JPG, PNG, or WebP · Maximum 8 MB · Stored in private storage &amp; verified via magic bytes
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              id="interior-hero-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: "none" }}
            />

            {!selectedFile && (
              <button
                type="button"
                id="hero-select-file-btn"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Select New Image…
              </button>
            )}
          </div>

          {/* Staged / Selected File Preview */}
          {selectedFile && previewUrl ? (
            <div
              style={{
                marginTop: "0.75rem",
                padding: "1rem",
                background: "var(--admin-card-bg)",
                border: "1px solid var(--admin-card-border)",
                borderRadius: "4px",
                display: "grid",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: "120px",
                    height: "75px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: "1px solid var(--admin-card-border)",
                    flexShrink: 0,
                    background: "var(--admin-bg)",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt="Staged hero preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: "180px" }}>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "var(--admin-text-main)",
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedFile.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--admin-text-muted)",
                      fontFamily: "var(--font-mono, monospace)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || "image"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--charcoal)",
                      marginTop: "0.25rem",
                      fontWeight: 500,
                    }}
                  >
                    Ready to upload. Click &ldquo;Upload &amp; Apply Hero Image&rdquo; to process.
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginLeft: "auto",
                  }}
                >
                  <button
                    type="button"
                    id="hero-cancel-file-btn"
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    onClick={handleClearFile}
                    disabled={isUploading}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    id="hero-upload-btn"
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    onClick={handleUploadImage}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            border: "2px solid rgba(255, 255, 255, 0.3)",
                            borderTopColor: "#FFFFFF",
                            borderRadius: "50%",
                            animation: "admin-spin 0.65s linear infinite",
                          }}
                        />
                        <span>{uploadStatus || "Uploading…"}</span>
                      </>
                    ) : initialConfig.imagePath ? (
                      "Replace Hero Image"
                    ) : (
                      "Upload Hero Image"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginTop: "0.5rem",
                padding: "1.25rem",
                textAlign: "center",
                background: "var(--admin-card-bg)",
                border: "1px dashed var(--admin-card-border)",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--charcoal)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--admin-card-border)";
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8125rem",
                  color: "var(--admin-text-main)",
                }}
              >
                Click or drag &amp; drop an image here to stage for upload
              </p>
              <p
                style={{
                  margin: "0.25rem 0 0 0",
                  fontSize: "0.6875rem",
                  color: "var(--admin-text-muted)",
                }}
              >
                PNG, JPG, or WebP up to 8 MB
              </p>
            </div>
          )}
        </div>

        {/* 3. METADATA EDITING FORM */}
        <form onSubmit={handleSaveMetadata} style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              paddingBottom: "0.5rem",
              borderBottom: "1px solid var(--admin-card-border)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--admin-text-main)",
              }}
            >
              Hero Metadata &amp; Accessibility
            </h3>
            <p
              style={{
                margin: "0.2rem 0 0 0",
                fontSize: "0.75rem",
                color: "var(--admin-text-muted)",
              }}
            >
              Configure image accessibility attributes and default narrative fields. Note: individual interior pages inject their own specific page titles and descriptions.
            </p>
          </div>

          {/* Bahasa Indonesia Metadata */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "var(--admin-bg)",
              border: "1px solid var(--admin-card-border)",
              borderRadius: "4px",
              display: "grid",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  background: "var(--sand)",
                  color: "var(--charcoal)",
                  border: "1px solid var(--admin-card-border)",
                }}
              >
                Bahasa Indonesia (ID) — Default
              </span>
            </div>

            {/* Alt Text (ID) */}
            <div className="admin-field">
              <label htmlFor="interior-hero-alt" className="admin-field-label">
                Image Alt Text (ID)
              </label>
              <input
                id="interior-hero-alt"
                type="text"
                className="admin-field-input"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                disabled={isSavingMeta || isUploading}
                placeholder="Fasilitas manufaktur ODE Outsole"
                maxLength={300}
              />
              <span className="admin-field-hint">
                Atribut HTML alt untuk gambar hero interior di seluruh halaman.
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* Eyebrow (ID) */}
              <div className="admin-field">
                <label htmlFor="interior-hero-eyebrow" className="admin-field-label">
                  Eyebrow Default (ID)
                </label>
                <input
                  id="interior-hero-eyebrow"
                  type="text"
                  className="admin-field-input"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  disabled={isSavingMeta || isUploading}
                  placeholder="ODE Outsole"
                  maxLength={100}
                />
              </div>

              {/* Title (ID) */}
              <div className="admin-field">
                <label htmlFor="interior-hero-title" className="admin-field-label">
                  Judul Default (ID)
                </label>
                <input
                  id="interior-hero-title"
                  type="text"
                  className="admin-field-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSavingMeta || isUploading}
                  placeholder="Presisi Manufaktur"
                  maxLength={200}
                />
              </div>
            </div>

            {/* Description (ID) */}
            <div className="admin-field">
              <label htmlFor="interior-hero-desc" className="admin-field-label">
                Deskripsi Default (ID)
              </label>
              <textarea
                id="interior-hero-desc"
                className="admin-field-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSavingMeta || isUploading}
                rows={2}
                placeholder="Deskripsi default jika tidak ditimpa oleh rute spesifik."
                maxLength={500}
              />
              <span className="admin-field-hint">
                Maksimal 500 karakter.
              </span>
            </div>
          </div>

          {/* English Metadata */}
          <div
            style={{
              padding: "1rem 1.25rem",
              background: "var(--admin-bg)",
              border: "1px solid var(--admin-card-border)",
              borderRadius: "4px",
              display: "grid",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  background: "var(--sand)",
                  color: "var(--charcoal)",
                  border: "1px solid var(--admin-card-border)",
                }}
              >
                English (EN) — Bilingual Public
              </span>
            </div>

            {/* Alt Text (EN) */}
            <div className="admin-field">
              <label htmlFor="interior-hero-alt-en" className="admin-field-label">
                Image Alt Text (EN)
              </label>
              <input
                id="interior-hero-alt-en"
                type="text"
                className="admin-field-input"
                value={altTextEn}
                onChange={(e) => setAltTextEn(e.target.value)}
                disabled={isSavingMeta || isUploading}
                placeholder="ODE Outsole manufacturing facility"
                maxLength={300}
              />
              <span className="admin-field-hint">
                HTML alt attribute for interior hero image across all interior pages when viewed in English.
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* Eyebrow (EN) */}
              <div className="admin-field">
                <label htmlFor="interior-hero-eyebrow-en" className="admin-field-label">
                  Default Eyebrow (EN)
                </label>
                <input
                  id="interior-hero-eyebrow-en"
                  type="text"
                  className="admin-field-input"
                  value={eyebrowEn}
                  onChange={(e) => setEyebrowEn(e.target.value)}
                  disabled={isSavingMeta || isUploading}
                  placeholder="ODE Outsole"
                  maxLength={100}
                />
              </div>

              {/* Title (EN) */}
              <div className="admin-field">
                <label htmlFor="interior-hero-title-en" className="admin-field-label">
                  Default Title (EN)
                </label>
                <input
                  id="interior-hero-title-en"
                  type="text"
                  className="admin-field-input"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  disabled={isSavingMeta || isUploading}
                  placeholder="Engineered Performance"
                  maxLength={200}
                />
              </div>
            </div>

            {/* Description (EN) */}
            <div className="admin-field">
              <label htmlFor="interior-hero-desc-en" className="admin-field-label">
                Default Description (EN)
              </label>
              <textarea
                id="interior-hero-desc-en"
                className="admin-field-input"
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                disabled={isSavingMeta || isUploading}
                rows={2}
                placeholder="Fallback narrative description if not overridden by page route."
                maxLength={500}
              />
              <span className="admin-field-hint">
                Max 500 characters.
              </span>
            </div>
          </div>

          {/* Metadata Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "0.75rem",
              paddingTop: "0.5rem",
              borderTop: "1px solid var(--admin-card-border)",
            }}
          >
            {isMetaDirty && (
              <button
                type="button"
                id="hero-reset-meta-btn"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={handleResetMetadata}
                disabled={isSavingMeta || isUploading}
              >
                Discard Metadata Changes
              </button>
            )}

            <button
              type="submit"
              id="hero-save-meta-btn"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={isSavingMeta || !isMetaDirty || isUploading}
            >
              {isSavingMeta ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                      borderTopColor: "#FFFFFF",
                      borderRadius: "50%",
                      animation: "admin-spin 0.65s linear infinite",
                    }}
                  />
                  <span>Saving Metadata…</span>
                </>
              ) : (
                "Save Metadata"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
