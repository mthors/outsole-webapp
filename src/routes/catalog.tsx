import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { getCatalog } from "@/lib/public-catalog.functions";
import { hardnessLabel, primaryImage, type Outsole, type TaxonomyTerm } from "@/lib/catalog-types";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
});

const HARDNESS = [
  { id: "soft", label: "Soft (< 55)", min: 0, max: 54 },
  { id: "medium", label: "Medium (55–65)", min: 55, max: 65 },
  { id: "firm", label: "Firm (> 65)", min: 66, max: 1000 },
] as const;

type CatalogSearch = {
  q?: string | undefined;
  category?: string | undefined;
  material?: string | undefined;
  traction?: string | undefined;
  hardness?: string | undefined;
  sampling?: boolean | undefined;
  featured?: boolean | undefined;
};

const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v.slice(0, 150) : undefined);
const bool = (v: unknown) => (v === true || v === "true" ? true : undefined);

export const Route = createFileRoute("/catalog")({
  validateSearch: (s: Record<string, unknown>): CatalogSearch => ({
    q: str(s["q"]),
    category: str(s["category"]),
    material: str(s["material"]),
    traction: str(s["traction"]),
    hardness: str(s["hardness"]),
    sampling: bool(s["sampling"]),
    featured: bool(s["featured"]),
  }),
  head: () => ({
    meta: [
      { title: "Outsole Catalog — Outsole Works" },
      { name: "description", content: "Explore our outsole portfolio by application, material, traction and technical specification." },
      { property: "og:title", content: "Outsole Catalog — Outsole Works" },
      { property: "og:description", content: "Explore our outsole portfolio by application, material, traction and technical specification." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: CatalogPage,
  pendingComponent: CatalogLoading,
  errorComponent: CatalogError,
  notFoundComponent: () => <div className="shell py-32">Not found.</div>,
});

function CatalogHeader() {
  return (
    <section className="border-b border-border">
      <div className="shell py-16 md:py-20">
        <span className="rule-accent" />
        <p className="label-tech mt-6">Collection</p>
        <h1 className="display-xl mt-5">Outsole Catalog</h1>
        <p className="mt-6 max-w-2xl text-muted-foreground md:text-lg">
          Explore our outsole portfolio by application, material, traction, and technical specification.
        </p>
      </div>
    </section>
  );
}

function CatalogLoading() {
  return (
    <>
      <CatalogHeader />
      <div className="shell py-12">
        <div className="h-12 animate-pulse bg-surface" />
        <div className="mt-8 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-background">
              <div className="aspect-[4/3] animate-pulse bg-surface" />
              <div className="h-40 p-6" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CatalogError() {
  return (
    <>
      <CatalogHeader />
      <div role="alert" className="shell py-20">
        <div className="border border-border p-12 text-center">
          <p className="label-tech">Catalog unavailable</p>
          <p className="mt-3 text-sm text-muted-foreground">
            We couldn't load the catalog right now. Please refresh the page or try again shortly.
          </p>
        </div>
      </div>
    </>
  );
}

function CatalogPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalog" });
  const [q, setQ] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim() || undefined;
      if (next !== search.q) navigate({ search: (p) => ({ ...p, q: next }), replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<CatalogSearch>) =>
    navigate({ search: (p) => ({ ...p, ...patch }), replace: true });

  const results = useMemo(() => filterOutsoles(data.outsoles, search), [data.outsoles, search]);
  const active =
    !!search.q || !!search.category || !!search.material || !!search.traction ||
    !!search.hardness || !!search.sampling || !!search.featured;
  const clear = () => {
    setQ("");
    navigate({ search: {}, replace: true });
  };

  return (
    <>
      <CatalogHeader />
      <section className="shell py-10 md:py-14">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search outsoles</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, model number or description"
              className="h-12 w-full border border-input bg-surface pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex h-12 items-center justify-center gap-2 border border-border px-5 text-xs font-semibold uppercase tracking-[0.14em] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_1fr]">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="space-y-6">
              <FilterSelect label="Category" value={search.category} terms={data.taxonomy.categories} onChange={(v) => set({ category: v })} />
              <FilterSelect label="Material" value={search.material} terms={data.taxonomy.materials} onChange={(v) => set({ material: v })} />
              <FilterSelect label="Traction type" value={search.traction} terms={data.taxonomy.tractionTypes} onChange={(v) => set({ traction: v })} />
              <FilterSelect
                label="Shore hardness"
                value={search.hardness}
                terms={HARDNESS.map((h) => ({ id: h.id, name: h.label }))}
                onChange={(v) => set({ hardness: v })}
              />
              <div className="space-y-3 border-t border-border pt-6">
                <Toggle label="Sampling available" checked={!!search.sampling} onChange={(v) => set({ sampling: v || undefined })} />
                <Toggle label="Featured" checked={!!search.featured} onChange={(v) => set({ featured: v || undefined })} />
              </div>
              {active && (
                <button type="button" onClick={clear} className="label-tech inline-flex items-center gap-2 hover:text-primary">
                  <X className="h-3.5 w-3.5" /> Clear filters
                </button>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <p className="label-tech mb-4">
              {results.length} {results.length === 1 ? "outsole" : "outsoles"}
            </p>
            {results.length === 0 ? (
              <div className="border border-dashed border-border p-12 text-center">
                <p className="label-tech">No outsoles match your current filters.</p>
                {active && (
                  <button
                    type="button"
                    onClick={clear}
                    className="mt-6 bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid pl-px pt-px sm:grid-cols-2 xl:grid-cols-3">
                {results.map((o) => <CatalogCard key={o.id} o={o} />)}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function filterOutsoles(list: Outsole[], s: CatalogSearch): Outsole[] {
  const q = s.q?.toLowerCase();
  const range = HARDNESS.find((h) => h.id === s.hardness);
  return list.filter((o) => {
    if (q && ![o.name, o.model_number, o.description ?? ""].some((f) => f.toLowerCase().includes(q))) return false;
    if (s.category && !o.categories.some((t) => t.id === s.category)) return false;
    if (s.material && !o.materials.some((t) => t.id === s.material)) return false;
    if (s.traction && !o.tractionTypes.some((t) => t.id === s.traction)) return false;
    if (s.sampling && !o.is_sampling_available) return false;
    if (s.featured && !o.is_featured) return false;
    if (range) {
      const lo = o.shore_min ?? o.shore_max;
      const hi = o.shore_max ?? o.shore_min;
      if (lo == null || hi == null) return false;
      if (hi < range.min || lo > range.max) return false;
    }
    return true;
  });
}

function FilterSelect({ label, value, terms, onChange }: { label: string; value?: string | undefined; terms: TaxonomyTerm[]; onChange: (v: string | undefined) => void }) {
  return (
    <label className="block">
      <span className="label-tech">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="mt-2 h-11 w-full border border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">All</option>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
      {label}
    </label>
  );
}

function CatalogCard({ o }: { o: Outsole }) {
  const img = primaryImage(o);
  const hard = hardnessLabel(o);
  return (
    <Link to="/outsoles/$slug" params={{ slug: o.slug }} className="group -ml-px -mt-px flex flex-col border border-border bg-background">
      <div className="aspect-[4/3] overflow-hidden bg-surface">
        {img?.url ? (
          <img src={img.url} alt={img.alt_text ?? o.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center label-tech">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="data-mono text-xs text-primary">{o.model_number}</p>
        <h2 className="mt-2 text-xl uppercase">{o.name}</h2>
        {o.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{o.description}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm">
          {o.materials[0] && (<><dt className="label-tech">Compound</dt><dd>{o.materials.map((m) => m.name).join(", ")}</dd></>)}
          {hard && (<><dt className="label-tech">Hardness</dt><dd className="data-mono">{hard}</dd></>)}
          <dt className="label-tech">Sampling</dt>
          <dd>{o.is_sampling_available ? "Available" : "On request"}</dd>
        </dl>
        <span className="label-tech mt-auto inline-flex items-center gap-2 pt-6 group-hover:text-primary">
          View details <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
