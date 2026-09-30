import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type Locale } from "./types";

export function isSupportedLocale(val: unknown): val is Locale {
  return typeof val === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(val);
}

export function getPersistedLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  try {
    // 1. Check localStorage first
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isSupportedLocale(stored)) {
      return stored;
    }

    // 2. Check document.cookie
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]*)`));
    if (match && isSupportedLocale(match[1])) {
      return match[1];
    }
  } catch {
    // Storage access blocked or unavailable
  }

  return DEFAULT_LOCALE;
}

export function persistLocale(locale: Locale): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore localStorage error (e.g. private browsing quota)
  }

  try {
    // Persist cookie for 1 year, SameSite=Lax
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=${oneYear}; SameSite=Lax`;
  } catch {
    // Ignore cookie error
  }

  try {
    document.documentElement.lang = locale;
  } catch {
    // Ignore DOM error
  }
}
