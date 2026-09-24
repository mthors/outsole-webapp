import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="shell grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">Outsole Works</p>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Rubber outsole development and volume production for footwear brands. OEM and ODM programs.
          </p>
        </div>
        <div>
          <p className="label-tech">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/catalog" className="hover:text-primary">Catalog</Link></li>
            <li><Link to="/about" className="hover:text-primary">About</Link></li>
            <li><Link to="/contact" className="hover:text-primary">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-tech">Sampling</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/request-sample" className="hover:text-primary">Request a Sample</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="shell flex flex-col gap-2 py-5 sm:flex-row sm:justify-between">
          <p className="label-tech">© {new Date().getFullYear()} Outsole Works</p>
          <p className="label-tech">Engineered in rubber</p>
        </div>
      </div>
    </footer>
  );
}
