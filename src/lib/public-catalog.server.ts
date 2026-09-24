import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Outsole, OutsoleImage, SiteContentEntry, Taxonomy } from "./catalog-types";

const BUCKET = "outsole-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7;

export function publicClient() {
  return createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const OUTSOLE_SELECT = `
  id, model_number, name, slug, description, shore_min, shore_max, shore_scale,
  din_abrasion_mm3, weight_grams, is_featured, is_sampling_available, status, created_at,
  outsole_images ( id, file_path, alt_text, display_order, is_primary ),
  outsole_categories ( categories ( id, name, slug ) ),
  outsole_materials ( materials ( id, name, description ) ),
  outsole_traction_types ( traction_types ( id, name, description ) )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawOutsole = any;

async function signImages(
  client: ReturnType<typeof publicClient>,
  rows: RawOutsole[],
): Promise<Map<string, string>> {
  const paths = rows
    .flatMap((r) => (r.outsole_images ?? []) as { file_path: string }[])
    .map((i) => i.file_path);
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data } = await client.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

function shape(row: RawOutsole, urls: Map<string, string>): Outsole {
  const images: OutsoleImage[] = ((row.outsole_images ?? []) as RawOutsole[])
    .map((i) => ({
      id: i.id,
      file_path: i.file_path,
      alt_text: i.alt_text ?? null,
      display_order: i.display_order ?? 0,
      is_primary: Boolean(i.is_primary),
      url: urls.get(i.file_path) ?? null,
    }))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.display_order - b.display_order);

  return {
    id: row.id,
    model_number: row.model_number,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    shore_min: row.shore_min ?? null,
    shore_max: row.shore_max ?? null,
    shore_scale: row.shore_scale ?? "A",
    din_abrasion_mm3: row.din_abrasion_mm3 == null ? null : Number(row.din_abrasion_mm3),
    weight_grams: row.weight_grams ?? null,
    is_featured: Boolean(row.is_featured),
    is_sampling_available: Boolean(row.is_sampling_available),
    status: row.status,
    created_at: row.created_at,
    categories: ((row.outsole_categories ?? []) as RawOutsole[]).map((j) => j.categories).filter(Boolean),
    materials: ((row.outsole_materials ?? []) as RawOutsole[]).map((j) => j.materials).filter(Boolean),
    tractionTypes: ((row.outsole_traction_types ?? []) as RawOutsole[])
      .map((j) => j.traction_types)
      .filter(Boolean),
    images,
  };
}

export async function fetchActiveOutsoles(opts: { featuredOnly?: boolean; limit?: number } = {}) {
  const client = publicClient();
  let query = client
    .from("outsoles")
    .select(OUTSOLE_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (opts.featuredOnly) query = query.eq("is_featured", true);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as RawOutsole[];
  const urls = await signImages(client, rows);
  return rows.map((r) => shape(r, urls));
}

export async function fetchOutsoleBySlug(slug: string): Promise<Outsole | null> {
  const client = publicClient();
  const { data, error } = await client
    .from("outsoles")
    .select(OUTSOLE_SELECT)
    .eq("status", "active")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const rows = [data as RawOutsole];
  const urls = await signImages(client, rows);
  return shape(rows[0]!, urls);
}

export async function fetchTaxonomy(): Promise<Taxonomy> {
  const client = publicClient();
  const [categories, materials, tractionTypes] = await Promise.all([
    client.from("categories").select("id, name, slug").order("name"),
    client.from("materials").select("id, name, description").order("name"),
    client.from("traction_types").select("id, name, description").order("name"),
  ]);
  return {
    categories: categories.data ?? [],
    materials: materials.data ?? [],
    tractionTypes: tractionTypes.data ?? [],
  };
}

export async function fetchSiteContent(): Promise<SiteContentEntry[]> {
  const client = publicClient();
  const { data } = await publicClient().from("site_content").select("content_key, title, content");
  void client;
  return data ?? [];
}
