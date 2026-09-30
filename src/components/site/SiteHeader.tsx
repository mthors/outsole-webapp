import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { dict } = useI18n();

  const nav = [
    { to: "/", label: dict.nav.home },
    { to: "/catalog", label: dict.nav.catalog },
    { to: "/about", label: dict.nav.about },
    { to: "/contact", label: dict.nav.contact },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="grid h-8 w-8 place-items-center bg-primary font-mono text-sm font-bold text-primary-foreground">
            OS
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.2em]">ODE Outsole</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="label-tech transition-colors hover:text-foreground"
              activeProps={{ className: "!text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link
            to="/request-sample"
            className="hidden bg-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
          >
            {dict.nav.requestSample}
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center border border-border md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-background md:hidden">
          <div className="shell flex flex-col py-4">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                {dict.common.language}
              </span>
              <LanguageSwitcher />
            </div>
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                onClick={() => setOpen(false)}
                className="border-b border-border py-4 text-lg font-semibold uppercase tracking-wide text-muted-foreground"
                activeProps={{ className: "!text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/request-sample"
              onClick={() => setOpen(false)}
              className="mt-5 bg-primary py-4 text-center text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground"
            >
              {dict.nav.requestSample}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}

