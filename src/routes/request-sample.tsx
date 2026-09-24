import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/request-sample")({
  head: () => ({
    meta: [
      { title: "Request a Sample — Outsole Works" },
      { name: "description", content: "Request outsole samples for your footwear program." },
      { property: "og:title", content: "Request a Sample — Outsole Works" },
      { property: "og:description", content: "Request outsole samples for your footwear program." },
    ],
  }),
  component: RequestaSamplePage,
});

function RequestaSamplePage() {
  return <ComingSoon eyebrow="Request a Sample" title="Request a sample" body="Request outsole samples for your footwear program. This page is being prepared." />;
}
