import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";
import { getOutsole } from "@/lib/public-catalog.functions";

export const Route = createFileRoute("/request-sample")({
  validateSearch: (search: Record<string, unknown>): { product?: string } => {
    const p = search.product;
    return typeof p === "string" && p.trim() ? { product: p.trim().slice(0, 150) } : {};
  },
  loaderDeps: ({ search }) => ({ product: search.product }),
  loader: async ({ deps }) => {
    if (!deps.product) return { selected: null };
    try {
      const res = await getOutsole({ data: { slug: deps.product } });
      const o = res.outsole;
      return { selected: o ? { name: o.name, model: o.model_number } : null };
    } catch {
      return { selected: null };
    }
  },
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
  const { selected } = Route.useLoaderData();
  return (
    <>
      {selected && (
        <div className="shell pt-12 md:pt-16">
          <div className="max-w-xl border border-border bg-card px-5 py-4">
            <p className="label-tech text-muted-foreground">Selected outsole</p>
            <p className="mt-2 text-lg font-semibold">{selected.name}</p>
            <p className="label-tech mt-1 text-primary">{selected.model}</p>
          </div>
        </div>
      )}
      <ComingSoon eyebrow="Request a Sample" title="Request a sample" body="Request outsole samples for your footwear program. This page is being prepared." />
    </>
  );
}
