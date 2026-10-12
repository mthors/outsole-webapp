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
      className={`inline-flex items-center rounded-[2px] border border-border bg-surface p-0.5 font-mono text-[11px] uppercase tracking-wider ${className}`}
    >
      <button
        type="button"
        id="lang-btn-id"
        onClick={() => setLocale("id")}
        aria-pressed={locale === "id"}
        title="Bahasa Indonesia"
        className={`rounded-[1px] px-2 py-1 font-semibold transition-colors ${
          locale === "id"
            ? "bg-primary text-primary-foreground shadow-xs"
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
        className={`rounded-[1px] px-2 py-1 font-semibold transition-colors ${
          locale === "en"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
