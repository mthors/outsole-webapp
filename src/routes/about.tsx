import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getSiteContent, getInteriorHero } from "@/lib/public-catalog.functions";
import { getPublicGallery } from "@/lib/gallery.functions";
import { InteriorHero } from "@/components/site/InteriorHero";
import { FactoryGallery } from "@/components/gallery/FactoryGallery";
import { useI18n } from "@/lib/i18n";
import { getLocalizedContent } from "@/lib/content-locale";

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

const factoryGalleryQuery = queryOptions({
  queryKey: ["factory-gallery"],
  queryFn: () => getPublicGallery(),
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
          "ODE Outsole specializes in high-performance rubber outsole engineering, precision compounding, and volume manufacturing for footwear brands.",
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
    context.queryClient.ensureQueryData(factoryGalleryQuery),
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
  const { dict, locale } = useI18n();
  const { data } = useSuspenseQuery(aboutContentQuery);
  const { data: hero } = useSuspenseQuery(interiorHeroQuery);
  const { data: galleryData } = useSuspenseQuery(factoryGalleryQuery);
  const contentMap = Object.fromEntries(
    data.content.map((item) => [item.content_key, item]),
  );

  const companyLocalized = getLocalizedContent(contentMap["about_company"], locale);

  return (
    <>
      <InteriorHero
        config={hero.config}
        config_en={hero.config_en}
        imageUrl={hero.imageUrl}
        eyebrow={dict.about.eyebrow}
        title={companyLocalized.title || dict.about.defaultTitle}
        description={clean(companyLocalized.content) || dict.about.defaultDescription}
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

      {/* Factory Gallery Section (Replaces OEM & ODM sections) */}
      <FactoryGallery items={galleryData.items} />

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
