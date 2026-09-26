import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/outsoles/$slug")({
  head: () => ({
    meta: [
      { title: "Outsole Details — Outsole Works" },
      { name: "description", content: "Technical details for this outsole model." },
      { property: "og:title", content: "Outsole Details — Outsole Works" },
      { property: "og:description", content: "Technical details for this outsole model." },
    ],
  }),
  component: OutsoleDetail,
});

function OutsoleDetail() {
  return (
    <ComingSoon
      eyebrow="Outsole"
      title="Product details"
      body="The detailed specification page for this outsole is being prepared."
    />
  );
}
