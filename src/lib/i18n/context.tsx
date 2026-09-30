import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, type Locale, type I18nDictionary } from "./types";
import { translations } from "./translations";
import { getPersistedLocale, persistLocale, isSupportedLocale } from "./storage";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (keyPath: string, fallback?: string) => string;
  dict: I18nDictionary;
  isIndonesian: boolean;
  isEnglish: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale && isSupportedLocale(initialLocale)) {
      return initialLocale;
    }
    return getPersistedLocale();
  });

  const setLocale = useCallback((next: Locale) => {
    if (!isSupportedLocale(next)) return;
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((curr) => {
      const next = curr === "id" ? "en" : "id";
      persistLocale(next);
      return next;
    });
  }, []);

  // Ensure document lang is synced on mount and whenever locale changes
  useEffect(() => {
    persistLocale(locale);
  }, [locale]);

  // Synchronize across tabs if another tab changes the locale
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "ode_locale" && isSupportedLocale(e.newValue)) {
        setLocaleState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const dict = useMemo(() => translations[locale] ?? translations[DEFAULT_LOCALE], [locale]);

  const t = useCallback(
    (keyPath: string, fallback?: string): string => {
      const parts = keyPath.split(".");
      let current: unknown = dict;

      for (const part of parts) {
        if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return fallback ?? keyPath;
        }
      }

      return typeof current === "string" ? current : fallback ?? keyPath;
    },
    [dict]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale,
      t,
      dict,
      isIndonesian: locale === "id",
      isEnglish: locale === "en",
    }),
    [locale, setLocale, toggleLocale, t, dict]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback for components rendered outside I18nProvider (e.g. tests or admin previews)
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (k: string, fb?: string) => fb ?? k,
      dict: translations[DEFAULT_LOCALE],
      isIndonesian: true,
      isEnglish: false,
    };
  }
  return ctx;
}
