import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  DEFAULT_FACTORY_INFO_ROWS,
  type FactoryInfoRowItem,
} from "./factory-info-types";

type FactoryInfoDbRow = Database["public"]["Tables"]["factory_info_rows"]["Row"];

const STORAGE_BUCKET = "outsole-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

export function isMissingTableError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  );
}

/**
 * Public server function: Fetch published factory information rows for the About page.
 * Uses supabaseAdmin (service role) to inspect CMS configuration accurately without RLS obscuring unpublished rows.
 * Gracefully falls back to default rows if database table is not yet migrated or has no configured rows.
 * Rethrows unexpected database errors rather than silently masking them with defaults.
 */
export const getPublicFactoryInfoRows = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ rows: FactoryInfoRowItem[] }> => {
    let client: SupabaseClient<Database>;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    } catch {
      const { publicClient } = await import("./public-catalog.server");
      client = publicClient();
    }

    const { data, error } = await client
      .from("factory_info_rows")
      .select("*")
      .order("row_order", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        // Migration has not been applied yet: provide default fallback content
        return { rows: DEFAULT_FACTORY_INFO_ROWS };
      }
      // Re-throw unexpected database errors rather than silently masking them with defaults
      console.error("Database error loading factory_info_rows:", error);
      throw new Error(`Database error loading factory info rows: ${error.message}`);
    }

    // If table exists but has no configured records at all, fall back to defaults
    if (!data || data.length === 0) {
      return { rows: DEFAULT_FACTORY_INFO_ROWS };
    }

    // Filter published rows
    const publishedData = data.filter((row: FactoryInfoDbRow) => row.is_published === true);
    if (publishedData.length === 0) {
      // Both CMS rows are unpublished: return empty rows so UI hides the section
      return { rows: [] };
    }

    // Map published rows and sign any private storage images
    const mappedRows: FactoryInfoRowItem[] = await Promise.all(
      publishedData.map(async (row: FactoryInfoDbRow): Promise<FactoryInfoRowItem> => {
        let imageUrl: string | null = null;
        const imagePath = row.image_path;

        if (imagePath) {
          if (imagePath.startsWith("/placeholders/") || imagePath.startsWith("http")) {
            imageUrl = imagePath;
          } else {
            try {
              const { data: signedData, error: signError } = await client.storage
                .from(STORAGE_BUCKET)
                .createSignedUrl(imagePath, SIGNED_URL_TTL);
              if (!signError && signedData?.signedUrl) {
                imageUrl = signedData.signedUrl;
              }
            } catch (e) {
              console.warn(`Failed to sign URL for image ${imagePath}:`, e);
            }
          }
        }

        // Fallback if image path was invalid or image failed to sign
        if (!imageUrl) {
          const fallbackDefault = DEFAULT_FACTORY_INFO_ROWS.find((d) => d.id === row.id);
          imageUrl = fallbackDefault?.image_url ?? null;
        }

        return {
          id: row.id as "row_1" | "row_2",
          row_order: row.row_order ?? (row.id === "row_1" ? 1 : 2),
          title_id: row.title_id || "",
          title_en: row.title_en || "",
          description_id: row.description_id || "",
          description_en: row.description_en || "",
          image_path: row.image_path,
          image_url: imageUrl,
          alt_text_id: row.alt_text_id || "",
          alt_text_en: row.alt_text_en || "",
          is_published: row.is_published ?? true,
          is_placeholder: row.image_path?.startsWith("/placeholders/") ?? false,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }),
    );

    return { rows: mappedRows };
  },
);
