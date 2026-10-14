import { createServerFn } from "@tanstack/react-start";
import type { GalleryItem, GalleryCategory } from "./gallery-types";

const BUCKET = "outsole-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

export const getPublicGallery = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: GalleryItem[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("factory_gallery")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Failed to load factory gallery:", error);
      return { items: [] };
    }

    // Resolve image URLs
    const itemsWithUrls = await Promise.all(
      data.map(async (row): Promise<GalleryItem> => {
        let imageUrl = row.image_path;

        // If it's a storage path (does not start with '/' or 'http')
        if (!row.image_path.startsWith("/") && !row.image_path.startsWith("http")) {
          try {
            const { data: signedData } = await supabaseAdmin.storage
              .from(BUCKET)
              .createSignedUrl(row.image_path, SIGNED_URL_TTL);

            if (signedData?.signedUrl) {
              imageUrl = signedData.signedUrl;
            }
          } catch (err) {
            console.error(`Failed to sign URL for ${row.image_path}:`, err);
          }
        }

        return {
          id: row.id,
          category: row.category as GalleryCategory,
          image_path: row.image_path,
          image_url: imageUrl,
          caption_id: row.caption_id,
          caption_en: row.caption_en,
          is_featured: row.is_featured,
          is_published: row.is_published,
          display_order: row.display_order,
          is_placeholder: row.is_placeholder,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }),
    );

    return { items: itemsWithUrls };
  },
);
