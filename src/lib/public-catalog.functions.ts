import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchActiveOutsoles, fetchTaxonomy } = await import("./public-catalog.server");
  const [outsoles, taxonomy] = await Promise.all([fetchActiveOutsoles(), fetchTaxonomy()]);
  return { outsoles, taxonomy };
});

export const getFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchActiveOutsoles, fetchTaxonomy, fetchSiteContent } = await import(
    "./public-catalog.server"
  );
  const [featured, taxonomy, content] = await Promise.all([
    fetchActiveOutsoles({ featuredOnly: true, limit: 6 }),
    fetchTaxonomy(),
    fetchSiteContent(),
  ]);
  return { featured, taxonomy, content };
});

export const getOutsole = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(150) }).parse(data))
  .handler(async ({ data }) => {
    const { fetchOutsoleBySlug } = await import("./public-catalog.server");
    return { outsole: await fetchOutsoleBySlug(data.slug) };
  });

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchSiteContent } = await import("./public-catalog.server");
  return { content: await fetchSiteContent() };
});

export const getInteriorHero = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchSiteContent } = await import("./public-catalog.server");
  const { parseInteriorHero, fetchInteriorHeroSignedUrl } = await import("./interior-hero");

  const entries = await fetchSiteContent();
  const heroEntry = entries.find((e) => e.content_key === "interior_hero");
  const config = parseInteriorHero(heroEntry?.content ?? null);
  const imageUrl = config.imagePath ? await fetchInteriorHeroSignedUrl(config.imagePath) : null;

  return { config, imageUrl };
});

export const getSampleOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchActiveOutsoles } = await import("./public-catalog.server");
  const outsoles = await fetchActiveOutsoles();
  return {
    options: outsoles.map((o) => ({
      id: o.id,
      name: o.name,
      model_number: o.model_number,
      slug: o.slug,
    })),
  };
});
