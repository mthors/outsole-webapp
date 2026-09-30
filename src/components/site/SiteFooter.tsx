import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { dict } = useI18n();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="shell grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">PT ODE CIPTA SEMESTA</p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Jl. Kidemang Singomenggolo no.20 Buduran Sidoarjo
          </p>
        </div>
        <div>
          <p className="label-tech">{dict.footer.explore}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/catalog" className="hover:text-primary">{dict.nav.catalog}</Link></li>
            <li><Link to="/about" className="hover:text-primary">{dict.nav.about}</Link></li>
            <li><Link to="/contact" className="hover:text-primary">{dict.nav.contact}</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-tech">{dict.footer.sampling}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/request-sample" className="hover:text-primary">{dict.nav.requestSample}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="shell flex flex-col gap-2 py-5 sm:flex-row sm:justify-between">
          <p className="label-tech">© {new Date().getFullYear()} ODE Outsole</p>
          <p className="label-tech">{dict.footer.credits}</p>
        </div>
      </div>
    </footer>
  );
}
