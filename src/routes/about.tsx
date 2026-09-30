import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Cog, Layers } from "lucide-react";
import { getSiteContent, getInteriorHero } from "@/lib/public-catalog.functions";
import { InteriorHero } from "@/components/site/InteriorHero";
import { useI18n } from "@/lib/i18n";

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
  pendingComponent: AboutPending,
  errorComponent: AboutError,
  notFoundComponent: AboutNotFound,
});

function AboutPending() {
  const { dict } = useI18n();
  return (
    <div className="shell py-32">
      <p className="label-tech">{dict.about.loading}</p>
    </div>
  );
}

function AboutError({ error }: { error: Error }) {
  const { dict } = useI18n();
  return (
    <div role="alert" className="shell py-32">
      <p className="label-tech">{dict.common.error}</p>
      <h1 className="display-lg mt-4">{dict.about.errorTitle}</h1>
      <p className="mt-4 text-muted-foreground">{error.message}</p>
    </div>
  );
}

function AboutNotFound() {
  const { dict } = useI18n();
  return <div className="shell py-32">{dict.about.notFound}</div>;
}

const clean = (s?: string | null) => (s ?? "").replace(/^Editable placeholder\.?\s*/i, "");

function AboutPage() {
  const { dict } = useI18n();
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
        eyebrow={dict.about.eyebrow}
        title={company?.title ?? dict.about.defaultTitle}
        description={clean(company?.content) || dict.about.defaultDescription}
      />

      {/* Quick Technical Highlights */}
      <section className="border-b border-border bg-background">
        <div className="shell py-12 md:py-16">
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">{dict.about.highlights.tag1}</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">{dict.about.highlights.title1}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {dict.about.highlights.desc1}
              </p>
            </div>

            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">{dict.about.highlights.tag2}</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">{dict.about.highlights.title2}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {dict.about.highlights.desc2}
              </p>
            </div>

            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">{dict.about.highlights.tag3}</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">{dict.about.highlights.title3}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {dict.about.highlights.desc3}
              </p>
            </div>

            <div className="bg-surface p-7">
              <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">{dict.about.highlights.tag4}</p>
              <h3 className="mt-4 text-base font-semibold uppercase text-foreground">{dict.about.highlights.title4}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {dict.about.highlights.desc4}
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
                <span className="text-primary">01</span> / {dict.about.oem.eyebrow}
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
              {dict.about.oem.requestTrial} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="border border-border bg-background p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Cog className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold uppercase text-foreground">{dict.about.oem.feature1Title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {dict.about.oem.feature1Desc}
              </p>
            </div>

            <div className="border border-border bg-background p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold uppercase text-foreground">{dict.about.oem.feature2Title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {dict.about.oem.feature2Desc}
              </p>
            </div>

            <div className="border border-border bg-background p-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold uppercase text-foreground">{dict.about.oem.feature3Title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {dict.about.oem.feature3Desc}
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
                <span className="text-primary">02</span> / {dict.about.odm.eyebrow}
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
              {dict.about.odm.browseTooling} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: dict.about.odm.step1Title,
                desc: dict.about.odm.step1Desc,
              },
              {
                step: "02",
                title: dict.about.odm.step2Title,
                desc: dict.about.odm.step2Desc,
              },
              {
                step: "03",
                title: dict.about.odm.step3Title,
                desc: dict.about.odm.step3Desc,
              },
              {
                step: "04",
                title: dict.about.odm.step4Title,
                desc: dict.about.odm.step4Desc,
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
              {dict.about.cta.eyebrow}
            </p>
            <h2 className="display-lg mt-4 max-w-2xl">
              {dict.about.cta.title}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-90 md:text-base">
              {dict.about.cta.desc}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/catalog"
              className="border border-primary-foreground/40 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary-foreground/10"
            >
              {dict.about.cta.browseBtn}
            </Link>
            <Link
              to="/request-sample"
              className="bg-primary-foreground px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-primary hover:opacity-90"
            >
              {dict.about.cta.sampleBtn}
            </Link>
            <Link
              to="/contact"
              className="border border-primary-foreground/40 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary-foreground/10"
            >
              {dict.about.cta.contactBtn}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
