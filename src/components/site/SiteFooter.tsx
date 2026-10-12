import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { dict } = useI18n();

  return (
    <footer className="border-t border-border bg-surface text-foreground">
      <div className="shell grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em]">PT ODE CIPTA SEMESTA</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Jl. Kidemang Singomenggolo no.20 Buduran Sidoarjo
          </p>
        </div>
        <div>
          <p className="label-tech">{dict.footer.explore}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/catalog" className="text-foreground/80 transition-colors hover:text-foreground">{dict.nav.catalog}</Link></li>
            <li><Link to="/about" className="text-foreground/80 transition-colors hover:text-foreground">{dict.nav.about}</Link></li>
            <li><Link to="/contact" className="text-foreground/80 transition-colors hover:text-foreground">{dict.nav.contact}</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-tech">{dict.footer.sampling}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/request-sample" className="text-foreground/80 transition-colors hover:text-foreground">{dict.nav.requestSample}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70">
        <div className="shell flex flex-col gap-2 py-5 sm:flex-row sm:justify-between">
          <p className="label-tech">© {new Date().getFullYear()} ODE Outsole</p>
          <p className="label-tech">{dict.footer.credits}</p>
        </div>
      </div>
    </footer>
  );
}
