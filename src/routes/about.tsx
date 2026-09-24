import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Outsole Works" },
      { name: "description", content: "Our outsole engineering and manufacturing background." },
      { property: "og:title", content: "About — Outsole Works" },
      { property: "og:description", content: "Our outsole engineering and manufacturing background." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return <ComingSoon eyebrow="About" title="About the factory" body="Our outsole engineering and manufacturing background. This page is being prepared." />;
}
