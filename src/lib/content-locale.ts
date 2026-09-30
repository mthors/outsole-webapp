import type { Locale } from "./i18n/types";
import type { SiteContentEntry } from "./catalog-types";
import {
  parseContactContent,
  DEFAULT_CONTACT_CONTENT,
  DEFAULT_CONTACT_CONTENT_ID,
  type ContactContent,
} from "./contact-content";
import {
  parseInteriorHero,
  DEFAULT_INTERIOR_HERO,
  type InteriorHeroContent,
} from "./interior-hero";

/**
 * Returns localized title and content for a standard CMS entry.
 * If English (en) is selected, falls back to Indonesian (id) if title_en / content_en is missing or empty.
 */
export function getLocalizedContent(
  entry:
    | {
        title?: string | null;
        content?: string | null;
        title_en?: string | null;
        content_en?: string | null;
      }
    | null
    | undefined,
  locale: Locale,
): { title: string; content: string } {
  if (!entry) {
    return { title: "", content: "" };
  }

  const idTitle = entry.title?.trim() ?? "";
  const idContent = entry.content?.trim() ?? "";

  if (locale === "en") {
    const enTitle = entry.title_en?.trim();
    const enContent = entry.content_en?.trim();

    return {
      title: enTitle && enTitle.length > 0 ? enTitle : idTitle,
      content: enContent && enContent.length > 0 ? enContent : idContent,
    };
  }

  // Indonesian (default)
  return {
    title: idTitle,
    content: idContent,
  };
}

/**
 * Returns localized contact page configuration from contact_information CMS entry.
 * Safely parses JSON for the requested locale, with fallback to Indonesian and built-in defaults.
 */
export function getLocalizedContact(
  entry:
    | {
        content?: string | null;
        content_en?: string | null;
      }
    | null
    | undefined,
  locale: Locale,
): ContactContent {
  if (locale === "en") {
    if (entry?.content_en && entry.content_en.trim()) {
      return parseContactContent(entry.content_en);
    }
    // Fallback to Indonesian content if English is not yet populated
    if (entry?.content && entry.content.trim()) {
      return parseContactContent(entry.content);
    }
    return DEFAULT_CONTACT_CONTENT;
  }

  // Indonesian (default)
  if (entry?.content && entry.content.trim()) {
    return parseContactContent(entry.content);
  }
  return DEFAULT_CONTACT_CONTENT_ID;
}

/**
 * Returns localized interior hero configuration.
 * Localizes altText, eyebrow, title, and description, while preserving the shared imagePath.
 */
export function getLocalizedInteriorHero(
  entry:
    | {
        content?: string | null;
        content_en?: string | null;
      }
    | null
    | undefined,
  locale: Locale,
): InteriorHeroContent {
  const baseId = parseInteriorHero(entry?.content);
  const baseEn = parseInteriorHero(entry?.content_en);

  // Shared imagePath always prefers any configured imagePath
  const sharedImagePath = baseEn.imagePath || baseId.imagePath || "";

  if (locale === "en") {
    return {
      imagePath: sharedImagePath,
      altText: baseEn.altText || baseId.altText || "ODE Outsole manufacturing facility",
      eyebrow: baseEn.eyebrow || baseId.eyebrow || "",
      title: baseEn.title || baseId.title || "",
      description: baseEn.description || baseId.description || "",
    };
  }

  // Indonesian (default)
  return {
    imagePath: sharedImagePath,
    altText: baseId.altText || "Fasilitas manufaktur ODE Outsole",
    eyebrow: baseId.eyebrow || "",
    title: baseId.title || "",
    description: baseId.description || "",
  };
}
