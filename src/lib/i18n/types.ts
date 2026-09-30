export type Locale = "id" | "en";

export const DEFAULT_LOCALE: Locale = "id";
export const SUPPORTED_LOCALES: readonly Locale[] = ["id", "en"] as const;
export const LOCALE_STORAGE_KEY = "ode_locale";
export const LOCALE_COOKIE_KEY = "ode_locale";

export interface I18nDictionary {
  nav: {
    home: string;
    catalog: string;
    about: string;
    contact: string;
    requestSample: string;
  };
  common: {
    search: string;
    featured: string;
    viewCatalog: string;
    language: string;
    switchLanguage: string;
    indonesian: string;
    english: string;
  };
}
