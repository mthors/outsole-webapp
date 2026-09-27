import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ImageOff } from "lucide-react";
import { getOutsole } from "@/lib/public-catalog.functions";
import { hardnessLabel, type Outsole, type TaxonomyTerm } from "@/lib/catalog-types";

const outsoleQuery = (slug: string) =>
  queryOptions({
    queryKey: ["outsole", slug],
    queryFn: () => getOutsole({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

export const Route = createFileRoute("/outsoles/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(outsoleQuery(params.slug));
    if (!res.outsole) throw notFound();
    return { name: res.outsole.name, model: res.outsole.model_number, description: res.outsole.description };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Outsole not found | Outsole Catalog" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.name} | Outsole Catalog`;
    const desc =
      loaderData.description?.slice(0, 155) ??
      `Technical specifications for outsole ${loaderData.model} — ${loaderData.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: `/outsoles/${params.slug}` }],
    };
  },
  component: OutsoleDetail,
  pendingComponent: DetailLoading,
  notFoundComponent: DetailNotFound,
  errorComponent: DetailError,
});

function Crumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="label-tech text-muted-foreground">
      <Link to="/catalog" className="hover:text-primary">Catalog</Link>
      {name && (
        <>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">{name}</span>
        </>
      )}
    </nav>
  );
}

function Tags({ label, terms }: { label: string; terms: TaxonomyTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <div>
      <p className="label-tech text-muted-foreground">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {terms.map((t) => (
          <li key={t.id} className="border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.1em]">
            {t.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Gallery({ outsole }: { outsole: Outsole }) {
  const images = [...outsole.images].sort((a, b) => a.display_order - b.display_order);
  const initial = images.find((i) => i.is_primary) ?? images[0];
  const [activeId, setActiveId] = useState(initial?.id);
  const active = images.find((i) => i.id === activeId) ?? initial;

  if (!active || !active.url) {
    return (
      <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 border border-border bg-card text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <p className="label-tech">No images available</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="group overflow-hidden border border-border bg-card">
        <img
          src={active.url}
          alt={active.alt_text ?? outsole.name}
          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((img) =>
            img.url ? (
              <li key={img.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveId(img.id)}
                  aria-label={`Show image: ${img.alt_text ?? outsole.name}`}
                  aria-pressed={img.id === active.id}
                  className={`block w-20 overflow-hidden border-2 md:w-24 ${
                    img.id === active.id ? "border-primary" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <img src={img.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}

function OutsoleDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(outsoleQuery(slug));
  const o = data.outsole;
  if (!o) return <DetailNotFound />;

  const specs = [
    { label: "Shore hardness", value: hardnessLabel(o) },
    { label: "DIN abrasion", value: o.din_abrasion_mm3 != null ? `${o.din_abrasion_mm3} mm³` : null },
    { label: "Weight", value: o.weight_grams != null ? `${o.weight_grams} g` : null },
    { label: "Sampling", value: o.is_sampling_available ? "Sampling Available" : "Sampling Currently Unavailable" },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value));

  return (
    <div className="shell py-10 md:py-14">
      <Crumb name={o.name} />
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <Gallery outsole={o} />
        <div className="min-w-0">
          <span className="rule-accent" />
          <p className="label-tech mt-5 text-primary">{o.model_number}</p>
          <h1 className="display-lg mt-3 break-words">{o.name}</h1>
          {o.description && <p className="mt-6 text-muted-foreground md:text-lg">{o.description}</p>}

          <div className="mt-8 space-y-5">
            <Tags label="Category" terms={o.categories} />
            <Tags label="Material" terms={o.materials} />
            <Tags label="Traction" terms={o.tractionTypes} />
          </div>

          <section className="mt-10">
            <p className="label-tech">Technical specifications</p>
            <dl className="mt-4 border-t border-border">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 border-b border-border py-3 text-sm">
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="text-right font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/request-sample"
              search={{ product: o.slug }}
              className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
            >
              Request a Sample <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center gap-2 border border-border px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailLoading() {
  return (
    <div className="shell py-10 md:py-14" aria-busy="true">
      <div className="h-3 w-40 animate-pulse bg-muted" />
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse bg-muted" />
          <div className="h-10 w-3/4 animate-pulse bg-muted" />
          <div className="h-20 w-full animate-pulse bg-muted" />
          <div className="h-40 w-full animate-pulse bg-muted" />
        </div>
      </div>
    </div>
  );
}

function StateMessage({ title, body }: { title: string; body: string }) {
  return (
    <section className="shell py-24 md:py-32">
      <span className="rule-accent" />
      <h1 className="display-lg mt-6">{title}</h1>
      <p className="mt-6 max-w-xl text-muted-foreground">{body}</p>
      <Link
        to="/catalog"
        className="mt-10 inline-flex items-center gap-2 border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Catalog
      </Link>
    </section>
  );
}

function DetailNotFound() {
  return (
    <StateMessage
      title="Outsole not found"
      body="The outsole you requested could not be found. It may have been renamed or is no longer available."
    />
  );
}

function DetailError() {
  return (
    <StateMessage
      title="Something went wrong"
      body="We couldn't load this outsole right now. Please try again shortly or browse the catalog."
    />
  );
}
