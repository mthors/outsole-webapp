import type { Locale } from "./i18n/types";

export type GalleryCategory =
  | "factory_office"
  | "machinery_equipment"
  | "production_process"
  | "warehouse_storage";

export interface GalleryItem {
  id: string;
  category: GalleryCategory;
  image_path: string;
  image_url: string;
  caption_id: string | null;
  caption_en: string | null;
  is_featured: boolean;
  is_published: boolean;
  display_order: number;
  is_placeholder: boolean;
  created_at: string;
  updated_at: string;
}

export const GALLERY_CATEGORIES: Record<
  GalleryCategory,
  { id: GalleryCategory; name_id: string; name_en: string; code: string }
> = {
  factory_office: {
    id: "factory_office",
    name_id: "Pabrik & Kantor",
    name_en: "Factory & Office",
    code: "01",
  },
  machinery_equipment: {
    id: "machinery_equipment",
    name_id: "Mesin & Peralatan",
    name_en: "Machinery & Equipment",
    code: "02",
  },
  production_process: {
    id: "production_process",
    name_id: "Proses Produksi",
    name_en: "Production Process",
    code: "03",
  },
  warehouse_storage: {
    id: "warehouse_storage",
    name_id: "Gudang & Penyimpanan",
    name_en: "Warehouse & Storage",
    code: "04",
  },
};

export const GALLERY_CATEGORY_LIST = Object.values(GALLERY_CATEGORIES);

/**
 * Returns localized caption with fallback to the alternative language or placeholder text.
 */
export function getLocalizedCaption(
  item: Pick<GalleryItem, "caption_id" | "caption_en">,
  locale: Locale,
): string {
  if (locale === "en") {
    return item.caption_en?.trim() || item.caption_id?.trim() || "";
  }
  return item.caption_id?.trim() || item.caption_en?.trim() || "";
}

/**
 * Returns localized category name for a given category.
 */
export function getLocalizedCategoryName(
  category: GalleryCategory,
  locale: Locale,
): string {
  const meta = GALLERY_CATEGORIES[category];
  if (!meta) return category;
  return locale === "en" ? meta.name_en : meta.name_id;
}

export const FALLBACK_PLACEHOLDERS: Record<GalleryCategory, string> = {
  factory_office: "/placeholders/factory-office.svg",
  machinery_equipment: "/placeholders/machinery-equipment.svg",
  production_process: "/placeholders/production-process.svg",
  warehouse_storage: "/placeholders/warehouse-storage.svg",
};
