import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Cog, Layers, Wrench } from "lucide-react";
import { getSiteContent, getInteriorHero } from "@/lib/public-catalog.functions";
import { InteriorHero } from "@/components/site/InteriorHero";

const aboutContentQuery = queryOptions({
  queryKey: ["site-content-about"],
  queryFn: () => getSiteContent(),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
});

const interiorHeroQuery = queryOptions({
  queryKey: ["interior-hero"],
  queryFn: () => getInteriorHero(),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
});

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — ODE Outsole | Rubber Outsole Engineering & Manufacturing" },
      {
        name: "description",
        content:
          "ODE Outsole specializes in high-performance rubber outsole engineering, OEM tooling transfer, and ODM development for global footwear brands.",
      },
      { property: "og:title", content: "About Us — ODE Outsole" },
      {
        property: "og:description",
        content:
          "Outsole engineering, compound development, and volume manufacturing capabilities for footwear brands.",
      },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(aboutContentQuery),
    context.queryClient.ensureQueryData(interiorHeroQuery),
  ]),
  component: AboutPage,
  pendingComponent: () => (
    <div className="shell py-32">
      <p className="label-tech">Loading factory overview…</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="shell py-32">
      <p className="label-tech">Error</p>
      <h1 className="display-lg mt-4">Failed to load factory information</h1>
      <p className="mt-4 text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="shell py-32">Information not found.</div>,
});

const clean = (s?: string | null) => (s ?? "").replace(/^Editable placeholder\.?\s*/i, "");

function AboutPage() {
  const { data } = useSuspenseQuery(aboutContentQuery);
  const { data: hero } = useSuspenseQuery(interiorHeroQuery);
  const contentMap = Object.fromEntries(
    data.content.map((item) => [item.content_key, item]),
  );

  const company = contentMap["about_company"];
  const oem = contentMap["about_oem"];
  const odm = contentMap["about_odm"];

  return (
    <>
      <InteriorHero
        config={hero.config}
        imageUrl={hero.imageUrl}
        eyebrow="About · Factory & Engineering Background"
        title={company?.title ?? "About the Factory"}
        description={clean(company?.content) || "High-performance rubber outsole development, compounding, mold engineering, and volume production for technical and lifestyle footwear programs."}
      />

      {/* Quick Technical Highlights */}
      <section className="border-b border-border bg-background">
        <div className="shell py-12 md:py-16">
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">01 / Infrastructure</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">In-House Tooling</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Dedicated CNC mold making, pattern laser engraving, and tooling repair facilities on site.
              </p>
            </div>

            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">02 / Chemistry</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">Compound Formulation</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Natural rubber, synthetic polymers, recycled crumb, and lightweight EVA blends tuned for specific rebound and abrasion.
              </p>
            </div>

            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">03 / Verification</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">Technical Testing</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                DIN 53516 abrasion, Shore A durometer hardness, and SATRA TM144 slip resistance quality assurance.
              </p>
            </div>

            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">04 / Production</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">Volume Scalability</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Reliable multi-cavity press lines delivering consistent physical properties from pilot run to mass production.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* OEM Capabilities Section */}
      <section className="border-b border-border bg-surface py-20 md:py-28">
        <div className="shell">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="label-tech">
                <span className="text-primary">01</span> / Build to Specification
              </p>
              <h2 className="display-lg mt-4">
                {oem?.title ?? "OEM Manufacturing"}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
                {clean(oem?.content) ||
                  "Precision build-to-print production: tooling transfer, compound matching, rigorous quality control, and dependable shipping lead times."}
              </p>
            </div>
            <Link
              to="/request-sample"
              className="inline-flex items-center gap-2 border border-foreground/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
            >
              Request OEM Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="border border-border bg-background p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Cog className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold uppercase text-foreground">Tooling Transfer</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Seamless onboarding of existing client tooling. We inspect mold geometry, optimize venting, and calibrate shrinkage allowances to ensure exact fit with your midsole blueprints.
              </p>
            </div>

            <div className="border border-border bg-background p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold uppercase text-foreground">Compound Matching</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Exact physical property matching for durometer (Shore A), rebound resilience, and color formulations. Every batch is rheologically verified before vulcanization.
              </p>
            </div>

            <div className="border border-border bg-background p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold uppercase text-foreground">Quality Assurance</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Continuous in-line inspection of lug definition, edge trimming, thickness tolerance, and bond-surface preparation, minimizing footwear assembly defect rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ODM Capabilities Section */}
      <section className="border-b border-border bg-background py-20 md:py-28">
        <div className="shell">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="label-tech">
                <span className="text-primary">02</span> / Design & Prototyping
              </p>
              <h2 className="display-lg mt-4">
                {odm?.title ?? "ODM Development"}
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
                {clean(odm?.content) ||
                  "In-house tread design development: concept rendering, 3D bottom-unit modeling, rapid prototyping, and sampling cycles tailored to your brand identity."}
              </p>
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 border border-foreground/30 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
            >
              Browse Open Tooling <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Concept & Lug Engineering",
                desc: "Surface contact modeling, flex notch placements, and traction lug angles tuned for targeted terrain and sport dynamics.",
              },
              {
                step: "02",
                title: "3D CAD & Last Fitting",
                desc: "Full bottom-unit digital integration to ensure precise perimeter bonding and clean transition to midsoles.",
              },
              {
                step: "03",
                title: "Pilot Sampling Molds",
                desc: "Rapid aluminum prototype molds engineered within days to validate physical wear, compound behavior, and aesthetics.",
              },
              {
                step: "04",
                title: "Production Tooling",
                desc: "Multi-size grading and hardened steel or forged aluminum production molds built for high-volume press cycles.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-surface p-8">
                <p className="data-mono text-sm text-primary">{item.step}</p>
                <h3 className="mt-5 text-base font-semibold uppercase text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program Call-to-Action */}
      <section className="bg-primary text-primary-foreground">
        <div className="shell flex flex-col gap-10 py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] opacity-75">
              Footwear Partnership
            </p>
            <h2 className="display-lg mt-4 max-w-2xl">
              Put our outsole engineering under your brand's next collection.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-90 md:text-base">
              Whether you need open-mold tooling from our active catalog or custom compound formulation for technical requirements, our team is ready to assist.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/catalog"
              className="border border-primary-foreground/40 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary-foreground/10"
            >
              Browse Catalog
            </Link>
            <Link
              to="/request-sample"
              className="bg-primary-foreground px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-primary hover:opacity-90"
            >
              Request a Sample
            </Link>
            <Link
              to="/contact"
              className="border border-primary-foreground/40 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary-foreground/10"
            >
              Contact Facility
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
