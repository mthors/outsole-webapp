import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { getSiteContent, getInteriorHero } from "@/lib/public-catalog.functions";
import { InteriorHero } from "@/components/site/InteriorHero";
import { useI18n } from "@/lib/i18n";

const contactContentQuery = queryOptions({
  queryKey: ["site-content-contact"],
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

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — ODE Outsole | Technical Sales & Facility Inquiries" },
      {
        name: "description",
        content:
          "Connect with ODE Outsole technical sales, mold engineering, and production teams. Request physical samples or schedule factory tooling consultations.",
      },
      { property: "og:title", content: "Contact Us — ODE Outsole" },
      {
        property: "og:description",
        content:
          "Connect with ODE Outsole technical sales, mold engineering, and factory facilities.",
      },
    ],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(contactContentQuery),
    context.queryClient.ensureQueryData(interiorHeroQuery),
  ]),
  component: ContactPage,
  pendingComponent: ContactPending,
  errorComponent: ContactError,
  notFoundComponent: ContactNotFound,
});

function ContactPending() {
  const { dict } = useI18n();
  return (
    <div className="shell py-32">
      <p className="label-tech">{dict.contact.loading}</p>
    </div>
  );
}

function ContactError({ error }: { error: Error }) {
  const { dict } = useI18n();
  return (
    <div role="alert" className="shell py-32">
      <p className="label-tech">{dict.common.error}</p>
      <h1 className="display-lg mt-4">{dict.contact.errorTitle}</h1>
      <p className="mt-4 text-muted-foreground">{error.message}</p>
    </div>
  );
}

function ContactNotFound() {
  const { dict } = useI18n();
  return <div className="shell py-32">{dict.contact.notFound}</div>;
}

import {
  parseContactContent,
  formatPhoneLink,
  formatWhatsAppLink,
} from "@/lib/contact-content";

const clean = (s?: string | null) => (s ?? "").replace(/^Editable placeholder\.?\s*/i, "");

function ContactPage() {
  const { dict } = useI18n();
  const { data } = useSuspenseQuery(contactContentQuery);
  const { data: hero } = useSuspenseQuery(interiorHeroQuery);
  const contentMap = Object.fromEntries(
    data.content.map((item) => [item.content_key, item]),
  );

  const contact = contentMap["contact_information"];
  const parsed = parseContactContent(contact?.content);
  const phoneHref = formatPhoneLink(parsed.phoneWhatsapp.phone);
  const waHref = formatWhatsAppLink(parsed.phoneWhatsapp.whatsapp);

  return (
    <>
      <InteriorHero
        config={hero.config}
        imageUrl={hero.imageUrl}
        eyebrow={dict.contact.eyebrow}
        title={contact?.title ?? dict.contact.defaultTitle}
        description={parsed.intro ||
          clean(contact?.content) ||
          dict.contact.defaultDescription}
      />

      {/* Contact Cards Grid */}
      <section className="border-b border-border bg-surface py-20 md:py-24">
        <div className="shell">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Facility Location */}
            <div className="flex flex-col justify-between border border-border bg-background p-8">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="data-mono text-xs text-primary mt-6 uppercase tracking-[0.14em]">
                  {parsed.facility.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold uppercase text-foreground">
                  {parsed.facility.heading}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  <strong className="block font-semibold text-foreground">
                    {parsed.facility.name}
                  </strong>
                  {parsed.facility.address.split("\n").map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              </div>
              <p className="label-tech mt-6 border-t border-border pt-4">
                {parsed.facility.footerNote}
              </p>
            </div>

            {/* Technical Sales Email */}
            <div className="flex flex-col justify-between border border-border bg-background p-8">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <p className="data-mono text-xs text-primary mt-6 uppercase tracking-[0.14em]">
                  {parsed.directEmail.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold uppercase text-foreground">
                  {parsed.directEmail.heading}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {parsed.directEmail.description}
                </p>
                <a
                  href={`mailto:${parsed.directEmail.email}`}
                  className="mt-3 inline-block font-mono text-sm font-semibold text-primary hover:underline"
                >
                  {parsed.directEmail.email}
                </a>
              </div>
              <p className="label-tech mt-6 border-t border-border pt-4">
                {parsed.directEmail.footerNote}
              </p>
            </div>

            {/* Direct Phone & WhatsApp */}
            <div className="flex flex-col justify-between border border-border bg-background p-8">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <p className="data-mono text-xs text-primary mt-6 uppercase tracking-[0.14em]">
                  {parsed.phoneWhatsapp.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold uppercase text-foreground">
                  {parsed.phoneWhatsapp.heading}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {parsed.phoneWhatsapp.description}
                </p>
                <div className="mt-3 space-y-1">
                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="block font-mono text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {parsed.phoneWhatsapp.phone}
                    </a>
                  ) : (
                    <span className="block font-mono text-sm font-semibold text-foreground">
                      {parsed.phoneWhatsapp.phone}
                    </span>
                  )}
                  {waHref ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-primary hover:underline"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> {parsed.phoneWhatsapp.whatsapp}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-primary">
                      <MessageSquare className="h-3.5 w-3.5" /> {parsed.phoneWhatsapp.whatsapp}
                    </span>
                  )}
                </div>
              </div>
              <p className="label-tech mt-6 border-t border-border pt-4">
                {parsed.phoneWhatsapp.footerNote}
              </p>
            </div>

            {/* Business Hours */}
            <div className="flex flex-col justify-between border border-border bg-background p-8">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <p className="data-mono text-xs text-primary mt-6 uppercase tracking-[0.14em]">
                  {parsed.operatingHours.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold uppercase text-foreground">
                  {parsed.operatingHours.heading}
                </h3>
                <dl className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between border-b border-border/50 pb-1.5">
                    <span>{dict.contact.cardHours.monFri}</span>
                    <span className="font-mono text-foreground">
                      {parsed.operatingHours.mondayFriday}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1.5">
                    <span>{dict.contact.cardHours.sat}</span>
                    <span className="font-mono text-foreground">
                      {parsed.operatingHours.saturday}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{dict.contact.cardHours.sun}</span>
                    <span className="font-mono text-muted-foreground">
                      {parsed.operatingHours.sunday}
                    </span>
                  </div>
                </dl>
              </div>
              <p className="label-tech mt-6 border-t border-border pt-4">
                {parsed.operatingHours.timezone.toLowerCase().startsWith("timezone") || parsed.operatingHours.timezone.toLowerCase().startsWith("zona waktu")
                  ? parsed.operatingHours.timezone
                  : `${dict.contact.cardHours.timezonePrefix} ${parsed.operatingHours.timezone}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Sample Request CTA Card */}
      <section className="bg-background py-20 md:py-24">
        <div className="shell">
          <div className="relative overflow-hidden border border-border bg-surface p-10 md:p-14 lg:flex lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="rule-accent" />
              <p className="label-tech mt-5">{dict.contact.ctaCard.eyebrow}</p>
              <h2 className="display-lg mt-3">
                {dict.contact.ctaCard.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {dict.contact.ctaCard.description}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col xl:flex-row">
              <Link
                to="/request-sample"
                className="inline-flex items-center justify-center gap-2 bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
              >
                {dict.contact.ctaCard.requestBtn} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center border border-foreground/30 px-7 py-4 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                {dict.contact.ctaCard.catalogBtn}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
