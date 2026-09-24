import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-outsole.jpg";
import { getFeatured } from "@/lib/public-catalog.functions";
import { hardnessLabel, primaryImage, type Outsole } from "@/lib/catalog-types";

const featuredQuery = queryOptions({
  queryKey: ["home-featured"],
  queryFn: () => getFeatured(),
  // Signed image URLs differ per fetch; keep SSR-hydrated data fresh so the
  // client doesn't refetch on mount and hydration-mismatch the img src.
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Outsole Works — Rubber Outsole Manufacturer, OEM & ODM" },
      {
        name: "description",
        content: "Engineered rubber outsoles for footwear brands. Browse the collection, compare compounds and request samples.",
      },
      { property: "og:title", content: "Outsole Works — Rubber Outsole Manufacturer" },
      {
        property: "og:description",
        content: "Engineered rubber outsoles, OEM and ODM development, and sampling for footwear brands.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQuery),
  component: Home,
  pendingComponent: () => (
    <div className="shell py-32"><p className="label-tech">Loading collection…</p></div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="shell py-32">
      <p className="label-tech">Error</p>
      <h1 className="display-lg mt-4">Collection unavailable</h1>
      <p className="mt-4 text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="shell py-32">Not found.</div>,
});

const clean = (s?: string | null) => (s ?? "").replace(/^Editable placeholder\.?\s*/i, "");

function Home() {
  const { data } = useSuspenseQuery(featuredQuery);
  const content = Object.fromEntries(data.content.map((c) => [c.content_key, c]));
  const hero = content["homepage_hero"];
  const caps = content["homepage_capabilities"];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroImg}
          alt="Close-up of a rubber outsole tread"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
        <div className="shell relative flex min-h-[78vh] flex-col justify-end py-16 md:py-24">
          <span className="rule-accent" />
          <p className="label-tech mt-6">Outsole engineering · Volume production</p>
          <h1 className="display-xl mt-5 max-w-4xl">
            {hero?.title ?? "Engineered Grip. Designed for Performance."}
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            {clean(hero?.content) ||
              "Outsole tooling, compound development and volume production for footwear brands."}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
            >
              Explore Collection <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/request-sample"
              className="inline-flex items-center justify-center border border-foreground/40 px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
            >
              Request a Sample
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="shell py-20 md:py-28">
        <SectionHead index="01" eyebrow="Featured collection" title="Selected outsoles">
          <Link to="/catalog" className="label-tech inline-flex items-center gap-2 hover:text-primary">
            View full catalog <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </SectionHead>
        {data.featured.length === 0 ? (
          <div className="mt-12 border border-dashed border-border p-12 text-center">
            <p className="label-tech">No featured outsoles yet</p>
            <p className="mt-3 text-sm text-muted-foreground">Featured models will appear here once published.</p>
          </div>
        ) : (
          <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {data.featured.map((o) => <OutsoleCard key={o.id} o={o} />)}
          </div>
        )}
      </section>

      {/* Materials & technology */}
      <section className="border-y border-border bg-surface">
        <div className="shell py-20 md:py-28">
          <SectionHead index="02" eyebrow="Materials & technology" title="Compounds and traction systems" />
          <div className="mt-12 grid gap-10 lg:grid-cols-3">
            <TermList label="Compounds" terms={data.taxonomy.materials} />
            <TermList label="Traction patterns" terms={data.taxonomy.tractionTypes} />
            <TermList label="Applications" terms={data.taxonomy.categories} />
          </div>
        </div>
      </section>

      {/* Capability */}
      <section className="shell py-20 md:py-28">
        <SectionHead index="03" eyebrow={caps?.title ?? "Capability"} title="From concept to production" />
        {caps?.content && <p className="mt-6 max-w-2xl text-muted-foreground">{clean(caps.content)}</p>}
        <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["OEM", "Build-to-print production from your specifications, tooling and compound targets."],
            ["ODM", "In-house tread design, last fitting and mold development for your line."],
            ["Manufacturing", "Mold making, compound mixing, pressing and finishing under one quality system."],
            ["Development & sampling", "Rapid prototypes and sample runs to validate fit, grip and wear."],
          ].map(([t, d], i) => (
            <div key={t} className="bg-background p-7">
              <p className="data-mono text-sm text-primary">0{i + 1}</p>
              <h3 className="mt-6 text-lg uppercase">{t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary text-primary-foreground">
        <div className="shell flex flex-col gap-10 py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] opacity-70">Start a program</p>
            <h2 className="display-lg mt-4 max-w-2xl">Put our outsoles under your next collection.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/catalog" className="border border-primary-foreground/40 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary-foreground/10">Browse catalog</Link>
            <Link to="/request-sample" className="bg-primary-foreground px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-primary hover:opacity-90">Request a sample</Link>
            <Link to="/contact" className="border border-primary-foreground/40 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary-foreground/10">Contact us</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ index, eyebrow, title, children }: { index: string; eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="label-tech"><span className="text-primary">{index}</span> / {eyebrow}</p>
        <h2 className="display-lg mt-4">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function TermList({ label, terms }: { label: string; terms: { id: string; name: string; description?: string | null }[] }) {
  return (
    <div>
      <p className="label-tech border-b border-border pb-3">{label}</p>
      {terms.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">None listed yet.</p>
      ) : (
        <ul>
          {terms.map((t) => (
            <li key={t.id} className="border-b border-border py-4">
              <p className="font-semibold">{t.name}</p>
              {t.description && <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OutsoleCard({ o }: { o: Outsole }) {
  const img = primaryImage(o);
  const hard = hardnessLabel(o);
  return (
    <Link to="/catalog" className="group flex flex-col bg-background">
      <div className="aspect-[4/3] overflow-hidden bg-surface">
        {img?.url ? (
          <img src={img.url} alt={img.alt_text ?? o.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="grid h-full place-items-center label-tech">No image</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="data-mono text-xs text-primary">{o.model_number}</p>
        <h3 className="mt-2 text-xl uppercase">{o.name}</h3>
        <dl className="mt-5 grid grid-cols-2 gap-y-2 text-sm">
          {hard && (<><dt className="label-tech">Hardness</dt><dd className="data-mono">{hard}</dd></>)}
          {o.din_abrasion_mm3 != null && (<><dt className="label-tech">DIN abrasion</dt><dd className="data-mono">{o.din_abrasion_mm3} mm³</dd></>)}
          {o.materials[0] && (<><dt className="label-tech">Compound</dt><dd>{o.materials[0].name}</dd></>)}
        </dl>
        <span className="label-tech mt-6 inline-flex items-center gap-2 group-hover:text-primary">
          View details <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
