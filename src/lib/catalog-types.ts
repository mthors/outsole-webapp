export type OutsoleStatus = "draft" | "active" | "archived";
export type InquiryStatus = "pending" | "contacted" | "resolved";

export type TaxonomyTerm = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
};

export type OutsoleImage = {
  id: string;
  file_path: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  url: string | null;
  display_url?: string | null;
  thumb_url?: string | null;
};

export type Outsole = {
  id: string;
  model_number: string;
  name: string;
  slug: string;
  description: string | null;
  shore_min: number | null;
  shore_max: number | null;
  shore_scale: string;
  din_abrasion_mm3: number | null;
  weight_grams: number | null;
  available_sizes: string | null;
  is_featured: boolean;
  is_sampling_available: boolean;
  status: OutsoleStatus;
  created_at: string;
  categories: TaxonomyTerm[];
  materials: TaxonomyTerm[];
  tractionTypes: TaxonomyTerm[];
  images: OutsoleImage[];
};

export type Taxonomy = {
  categories: TaxonomyTerm[];
  materials: TaxonomyTerm[];
  tractionTypes: TaxonomyTerm[];
};

export type SiteContentEntry = {
  content_key: string;
  title: string | null;
  content: string | null;
  title_en?: string | null;
  content_en?: string | null;
};

export function hardnessLabel(
  o: Pick<Outsole, "shore_min" | "shore_max" | "shore_scale">,
): string | null {
  const scale = `Shore ${o.shore_scale || "A"}`;
  if (o.shore_min != null && o.shore_max != null) {
    return o.shore_min === o.shore_max
      ? `${o.shore_min} ${scale}`
      : `${o.shore_min}\u2013${o.shore_max} ${scale}`;
  }
  if (o.shore_min != null) return `${o.shore_min}+ ${scale}`;
  if (o.shore_max != null) return `up to ${o.shore_max} ${scale}`;
  return null;
}

export function primaryImage(o: Outsole): OutsoleImage | undefined {
  return o.images.find((i) => i.is_primary) ?? o.images[0];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 150);
}
