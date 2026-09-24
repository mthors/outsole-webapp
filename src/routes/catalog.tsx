import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog — Outsole Works" },
      { name: "description", content: "Browse our outsole collection by category, material and traction." },
      { property: "og:title", content: "Catalog — Outsole Works" },
      { property: "og:description", content: "Browse our outsole collection by category, material and traction." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  return <ComingSoon eyebrow="Catalog" title="The outsole catalog" body="Browse our outsole collection by category, material and traction. This page is being prepared." />;
}
