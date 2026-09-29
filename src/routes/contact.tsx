import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { getSiteContent } from "@/lib/public-catalog.functions";

const contactContentQuery = queryOptions({
  queryKey: ["site-content-contact"],
  queryFn: () => getSiteContent(),
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
  loader: ({ context }) => context.queryClient.ensureQueryData(contactContentQuery),
  component: ContactPage,
  pendingComponent: () => (
    <div className="shell py-32">
      <p className="label-tech">Loading contact information…</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="shell py-32">
      <p className="label-tech">Error</p>
      <h1 className="display-lg mt-4">Failed to load contact information</h1>
      <p className="mt-4 text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => <div className="shell py-32">Contact details not found.</div>,
});

import {
  parseContactContent,
  formatPhoneLink,
  formatWhatsAppLink,
} from "@/lib/contact-content";

const clean = (s?: string | null) => (s ?? "").replace(/^Editable placeholder\.?\s*/i, "");

function ContactPage() {
  const { data } = useSuspenseQuery(contactContentQuery);
  const contentMap = Object.fromEntries(
    data.content.map((item) => [item.content_key, item]),
  );

  const contact = contentMap["contact_information"];
  const parsed = parseContactContent(contact?.content);
  const phoneHref = formatPhoneLink(parsed.phoneWhatsapp.phone);
  const waHref = formatWhatsAppLink(parsed.phoneWhatsapp.whatsapp);

  return (
    <>
      {/* Header Section */}
      <section className="relative border-b border-border bg-background py-20 md:py-28">
        <div className="shell">
          <div className="max-w-3xl">
            <span className="rule-accent" />
            <p className="label-tech mt-6">Get in Touch · Facilities & Direct Sales</p>
            <h1 className="display-xl mt-5">
              {contact?.title ?? "Contact ODE Outsole"}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
              {parsed.intro ||
                clean(contact?.content) ||
                "Connect directly with our rubber compounding engineers, tooling mold specialists, and commercial sales team for OEM programs and sample dispatch."}
            </p>
          </div>
        </div>
      </section>

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
                    <span>Monday – Friday:</span>
                    <span className="font-mono text-foreground">
                      {parsed.operatingHours.mondayFriday}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1.5">
                    <span>Saturday:</span>
                    <span className="font-mono text-foreground">
                      {parsed.operatingHours.saturday}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday:</span>
                    <span className="font-mono text-muted-foreground">
                      {parsed.operatingHours.sunday}
                    </span>
                  </div>
                </dl>
              </div>
              <p className="label-tech mt-6 border-t border-border pt-4">
                {parsed.operatingHours.timezone.toLowerCase().startsWith("timezone")
                  ? parsed.operatingHours.timezone
                  : `Timezone: ${parsed.operatingHours.timezone}`}
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
              <p className="label-tech mt-5">Fast-Track Sample Dispatch</p>
              <h2 className="display-lg mt-3">
                Need physical outsole samples for fit & lab evaluation?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                We provide production-grade sample pairs from our active catalog for friction testing, flexural fatigue analysis, and bonding tests on your brand lasts.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col xl:flex-row">
              <Link
                to="/request-sample"
                className="inline-flex items-center justify-center gap-2 bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
              >
                Request a Sample <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center border border-foreground/30 px-7 py-4 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
