import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import { getCatalog, getInteriorHero } from "@/lib/public-catalog.functions";
import { hardnessLabel, primaryImage, type Outsole, type TaxonomyTerm } from "@/lib/catalog-types";
import { InteriorHero } from "@/components/site/InteriorHero";
import { useI18n } from "@/lib/i18n";

const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: () => getCatalog(),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
});

const interiorHeroQuery = queryOptions({
  queryKey: ["interior-hero"],
  queryFn: () => getInteriorHero(),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
});

const HARDNESS_RANGES: Record<string, { min: number; max: number }> = {
  soft: { min: 0, max: 54 },
  medium: { min: 55, max: 65 },
  firm: { min: 66, max: 1000 },
};

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
      { title: "Outsole Catalog — Outsole by ODE" },
      {
        name: "description",
        content:
          "Explore our outsole portfolio by application, material, traction and technical specification.",
      },
      { property: "og:title", content: "Outsole Catalog — Outsole by ODE" },
      {
        property: "og:description",
        content:
          "Explore our outsole portfolio by application, material, traction and technical specification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(catalogQuery),
      context.queryClient.ensureQueryData(interiorHeroQuery),
    ]),
  component: CatalogPage,
  pendingComponent: CatalogLoading,
  errorComponent: CatalogError,
  notFoundComponent: CatalogNotFound,
});

function CatalogNotFound() {
  const { dict } = useI18n();
  return <div className="shell py-32">{dict.common.notFound}</div>;
}

function CatalogLoading() {
  const { dict } = useI18n();
  return (
    <>
      <section className="interior-hero" aria-label={dict.catalog.title}>
        <div className="interior-hero__overlay" />
        <div className="shell interior-hero__content">
          <span className="rule-accent" />
          <p className="label-tech interior-hero__eyebrow">{dict.catalog.eyebrow}</p>
          <h1 className="display-xl interior-hero__title">{dict.catalog.title}</h1>
        </div>
      </section>
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
  const { dict } = useI18n();
  return (
    <>
      <section className="interior-hero" aria-label={dict.catalog.title}>
        <div className="interior-hero__overlay" />
        <div className="shell interior-hero__content">
          <span className="rule-accent" />
          <p className="label-tech interior-hero__eyebrow">{dict.catalog.eyebrow}</p>
          <h1 className="display-xl interior-hero__title">{dict.catalog.title}</h1>
        </div>
      </section>
      <div role="alert" className="shell py-20">
        <div className="border border-border p-12 text-center">
          <p className="label-tech">{dict.catalog.unavailableTitle}</p>
          <p className="mt-3 text-sm text-muted-foreground">{dict.catalog.unavailableDesc}</p>
        </div>
      </div>
    </>
  );
}

function CatalogPage() {
  const { dict, isIndonesian } = useI18n();
  const { data } = useSuspenseQuery(catalogQuery);
  const { data: hero } = useSuspenseQuery(interiorHeroQuery);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalog" });
  const [q, setQ] = useState(search.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim() || undefined;
      if (next !== search.q) {
        navigate({ search: (p) => ({ ...p, q: next }), replace: true, resetScroll: false });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<CatalogSearch>) =>
    navigate({ search: (p) => ({ ...p, ...patch }), replace: true, resetScroll: false });

  const results = useMemo(() => filterOutsoles(data.outsoles, search), [data.outsoles, search]);
  const active =
    !!search.q ||
    !!search.category ||
    !!search.material ||
    !!search.traction ||
    !!search.hardness ||
    !!search.sampling ||
    !!search.featured;
  const clear = () => {
    setQ("");
    navigate({ search: {}, replace: true, resetScroll: false });
  };

  const hardnessOptions = [
    { id: "soft", name: isIndonesian ? "Lunak (< 55)" : "Soft (< 55)" },
    { id: "medium", name: isIndonesian ? "Sedang (55–65)" : "Medium (55–65)" },
    { id: "firm", name: isIndonesian ? "Keras (> 65)" : "Firm (> 65)" },
  ];

  return (
    <>
      <InteriorHero
        config={hero.config}
        config_en={hero.config_en}
        imageUrl={hero.imageUrl}
        eyebrow={dict.catalog.eyebrow}
        title={dict.catalog.title}
        description={dict.catalog.description}
      />
      <section className="shell py-10 md:py-14">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">{dict.catalog.searchAria}</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={dict.catalog.searchPlaceholder}
              className="h-12 w-full border border-input bg-surface pl-11 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className="inline-flex h-12 items-center justify-center gap-2 border border-border px-5 text-xs font-semibold uppercase tracking-[0.14em] lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> {dict.catalog.filtersBtn}
          </button>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_1fr]">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
            <div className="space-y-6">
              <FilterSelect
                label={dict.catalog.filterCategory}
                allLabel={dict.common.all}
                value={search.category}
                terms={data.taxonomy.categories}
                onChange={(v) => set({ category: v })}
              />
              <FilterSelect
                label={dict.catalog.filterMaterial}
                allLabel={dict.common.all}
                value={search.material}
                terms={data.taxonomy.materials}
                onChange={(v) => set({ material: v })}
              />
              <FilterSelect
                label={dict.catalog.filterTraction}
                allLabel={dict.common.all}
                value={search.traction}
                terms={data.taxonomy.tractionTypes}
                onChange={(v) => set({ traction: v })}
              />
              <FilterSelect
                label={dict.catalog.filterHardness}
                allLabel={dict.common.all}
                value={search.hardness}
                terms={hardnessOptions}
                onChange={(v) => set({ hardness: v })}
              />
              <div className="space-y-3 border-t border-border pt-6">
                <Toggle
                  label={dict.catalog.filterSampling}
                  checked={!!search.sampling}
                  onChange={(v) => set({ sampling: v || undefined })}
                />
                <Toggle
                  label={dict.catalog.filterFeatured}
                  checked={!!search.featured}
                  onChange={(v) => set({ featured: v || undefined })}
                />
              </div>
              {active && (
                <button
                  type="button"
                  onClick={clear}
                  className="label-tech inline-flex items-center gap-2 hover:text-primary"
                >
                  <X className="h-3.5 w-3.5" /> {dict.catalog.clearFilters}
                </button>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <p className="label-tech mb-4">
              {results.length}{" "}
              {results.length === 1 ? dict.catalog.countSingle : dict.catalog.countPlural}
            </p>
            {results.length === 0 ? (
              <div className="border border-dashed border-border p-12 text-center">
                <p className="label-tech">{dict.catalog.noResults}</p>
                {active && (
                  <button
                    type="button"
                    onClick={clear}
                    className="mt-6 bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
                  >
                    {dict.catalog.clearFilters}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid pl-px pt-px sm:grid-cols-2 xl:grid-cols-3">
                {results.map((o) => (
                  <CatalogCard key={o.id} o={o} />
                ))}
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
  const range = s.hardness ? HARDNESS_RANGES[s.hardness] : undefined;
  return list.filter((o) => {
    if (
      q &&
      ![o.name, o.model_number, o.description ?? ""].some((f) => f.toLowerCase().includes(q))
    )
      return false;
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

function FilterSelect({
  label,
  allLabel,
  value,
  terms,
  onChange,
}: {
  label: string;
  allLabel?: string;
  value?: string | undefined;
  terms: (TaxonomyTerm | { id: string; name: string })[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="label-tech">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="mt-2 h-11 w-full border border-input bg-surface px-3 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">{allLabel ?? "All"}</option>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-primary)]"
      />
      {label}
    </label>
  );
}

function CatalogCard({ o }: { o: Outsole }) {
  const { dict } = useI18n();
  const img = primaryImage(o);
  const hard = hardnessLabel(o);
  return (
    <Link
      to="/outsoles/$slug"
      params={{ slug: o.slug }}
      className="group -ml-px -mt-px flex flex-col border border-border bg-background"
    >
      <div className="aspect-[4/3] overflow-hidden bg-surface">
        {img?.url ? (
          <img
            src={img.display_url ?? img.url}
            alt={img.alt_text ?? o.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full place-items-center label-tech">{dict.common.noImage}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="data-mono text-xs text-primary">{o.model_number}</p>
        <h2 className="mt-2 text-xl uppercase">{o.name}</h2>
        {o.description && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{o.description}</p>
        )}
        <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm">
          {o.materials[0] && (
            <>
              <dt className="label-tech">{dict.catalog.cardCompound}</dt>
              <dd>{o.materials.map((m) => m.name).join(", ")}</dd>
            </>
          )}
          {hard && (
            <>
              <dt className="label-tech">{dict.catalog.cardHardness}</dt>
              <dd className="data-mono">{hard}</dd>
            </>
          )}
          <dt className="label-tech">{dict.catalog.cardSampling}</dt>
          <dd>
            {o.is_sampling_available
              ? dict.catalog.samplingAvailable
              : dict.catalog.samplingOnRequest}
          </dd>
        </dl>
        <span className="label-tech mt-auto inline-flex items-center gap-2 pt-6 group-hover:text-primary">
          {dict.common.viewDetails} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
