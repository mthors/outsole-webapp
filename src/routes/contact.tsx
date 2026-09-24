import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Outsole Works" },
      { name: "description", content: "Get in touch with our outsole development team." },
      { property: "og:title", content: "Contact — Outsole Works" },
      { property: "og:description", content: "Get in touch with our outsole development team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return <ComingSoon eyebrow="Contact" title="Contact us" body="Get in touch with our outsole development team. This page is being prepared." />;
}
