import { useI18n } from "@/lib/i18n";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  return (
    <div
      role="group"
      aria-label="Language selection"
      data-testid="lang-switcher"
      className={`inline-flex items-center rounded border border-border bg-surface/80 p-0.5 font-mono text-[11px] uppercase tracking-wider ${className}`}
    >
      <button
        type="button"
        id="lang-btn-id"
        onClick={() => setLocale("id")}
        aria-pressed={locale === "id"}
        title="Bahasa Indonesia"
        className={`rounded px-2 py-1 font-semibold transition-all ${
          locale === "id"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        ID
      </button>
      <button
        type="button"
        id="lang-btn-en"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        title="English"
        className={`rounded px-2 py-1 font-semibold transition-all ${
          locale === "en"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
