import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  DEFAULT_FACTORY_INFO_ROWS,
  type FactoryInfoRowId,
  type FactoryInfoRowItem,
} from "./factory-info-types";

const FACTORY_INFO_BUCKET = "outsole-images";
const FACTORY_INFO_PATH_PREFIX = "factory-info/";
const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const updateFactoryInfoRowSchema = z.object({
  id: z.enum(["row_1", "row_2"]),
  title_id: z.string().trim().min(1, "Indonesian heading is required").max(255),
  title_en: z.string().trim().max(255).optional().default(""),
  description_id: z.string().trim().min(1, "Indonesian description is required").max(3000),
  description_en: z.string().trim().max(3000).optional().default(""),
  alt_text_id: z.string().trim().max(300).optional().default(""),
  alt_text_en: z.string().trim().max(300).optional().default(""),
  is_published: z.boolean().default(true),
});

export const uploadFactoryInfoImageSchema = z.object({
  id: z.enum(["row_1", "row_2"]),
  fileName: z.string().min(1, "File name is required").max(260),
  contentType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    errorMap: () => ({ message: "Only JPG, PNG, and WebP images are allowed" }),
  }),
  fileBase64: z.string().min(1, "Image file data is required"),
});

/**
 * Server function: List factory information rows for admin content management.
 * Generates signed URLs for admin previews.
 */
export const listAdminFactoryInfoRows = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ rows: FactoryInfoRowItem[]; tableExists: boolean }> => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data, error } = await supabaseAdmin
        .from("factory_info_rows")
        .select("*")
        .order("row_order", { ascending: true });

      if (error) {
        if (error.code === "42P01") {
          // Relation does not exist yet (migration pending)
          return { rows: DEFAULT_FACTORY_INFO_ROWS, tableExists: false };
        }
        console.error("Error loading factory_info_rows in admin:", error);
        return { rows: DEFAULT_FACTORY_INFO_ROWS, tableExists: false };
      }

      if (!data || data.length === 0) {
        return { rows: DEFAULT_FACTORY_INFO_ROWS, tableExists: true };
      }

      // Generate signed URLs for private images
      const mappedRows: FactoryInfoRowItem[] = await Promise.all(
        data.map(async (row): Promise<FactoryInfoRowItem> => {
          let imageUrl: string | null = null;
          const imagePath = row.image_path;

          if (imagePath) {
            if (imagePath.startsWith("/placeholders/") || imagePath.startsWith("http")) {
              imageUrl = imagePath;
            } else {
              try {
                const { data: signedData, error: signError } = await supabaseAdmin.storage
                  .from(FACTORY_INFO_BUCKET)
                  .createSignedUrl(imagePath, 60 * 60);
                if (!signError && signedData?.signedUrl) {
                  imageUrl = signedData.signedUrl;
                }
              } catch (e) {
                console.warn(`Admin preview signed URL error for ${imagePath}:`, e);
              }
            }
          }

          if (!imageUrl) {
            const fallbackDefault = DEFAULT_FACTORY_INFO_ROWS.find((d) => d.id === row.id);
            imageUrl = fallbackDefault?.image_url ?? null;
          }

          return {
            id: row.id as FactoryInfoRowId,
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

      const row1 = mappedRows.find((r) => r.id === "row_1") ?? DEFAULT_FACTORY_INFO_ROWS[0]!;
      const row2 = mappedRows.find((r) => r.id === "row_2") ?? DEFAULT_FACTORY_INFO_ROWS[1]!;

      return { rows: [row1, row2], tableExists: true };
    } catch (err) {
      console.error("Failed to list admin factory info rows:", err);
      return { rows: DEFAULT_FACTORY_INFO_ROWS, tableExists: false };
    }
  },
);

/**
 * Server function: Update text content and publication status for a factory information row.
 */
export const updateAdminFactoryInfoRow = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateFactoryInfoRowSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rowOrder = data.id === "row_1" ? 1 : 2;

    const payload = {
      id: data.id,
      row_order: rowOrder,
      title_id: data.title_id,
      title_en: data.title_en ?? "",
      description_id: data.description_id,
      description_en: data.description_en ?? "",
      alt_text_id: data.alt_text_id ?? "",
      alt_text_en: data.alt_text_en ?? "",
      is_published: data.is_published,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabaseAdmin
      .from("factory_info_rows")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      if (error.code === "42P01") {
        throw new Error(
          "Database table 'factory_info_rows' does not exist yet. Please apply migration 20261014140000_factory_info_rows.sql to your Supabase project.",
        );
      }
      throw new Error(`Failed to save factory information row: ${error.message}`);
    }

    return { success: true, row: updated };
  });

/**
 * Server function: Upload an image to the private outsole-images bucket and update the row's image_path.
 * Cleans up previous image safely, and cleans up uploaded file if DB update fails.
 */
export const uploadAdminFactoryInfoImage = createServerFn({ method: "POST" })
  .validator((data: unknown) => uploadFactoryInfoImageSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Validate file extension
    const extRaw = data.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extRaw)) {
      throw new Error("Unsupported file extension. Only .jpg, .png, and .webp files are allowed.");
    }
    const ext = extRaw === "jpeg" ? "jpg" : extRaw;

    // 2. Decode base64
    let buf: Buffer;
    try {
      buf = Buffer.from(data.fileBase64, "base64");
    } catch {
      throw new Error("Invalid base64 image data.");
    }

    if (buf.length === 0) throw new Error("Uploaded file is empty.");
    if (buf.length > MAX_IMAGE_FILE_SIZE) {
      throw new Error("File size exceeds the 8MB limit. Please choose a smaller image.");
    }

    // 3. Query existing row to know current image path for safe cleanup
    const { data: existingRow, error: fetchErr } = await supabaseAdmin
      .from("factory_info_rows")
      .select("image_path")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr && fetchErr.code === "42P01") {
      throw new Error(
        "Database table 'factory_info_rows' does not exist yet. Please apply migration 20261014140000_factory_info_rows.sql to your Supabase project.",
      );
    }

    const prevPath = existingRow?.image_path ?? null;

    // 4. Generate unique storage path
    const rawBase = data.fileName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)
      .replace(/^-|-$/g, "");
    const safeBase = rawBase || data.id;
    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const storagePath = `${FACTORY_INFO_PATH_PREFIX}${timestamp}-${randomSuffix}-${safeBase}.${ext}`;

    // 5. Upload to private bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(FACTORY_INFO_BUCKET)
      .upload(storagePath, buf, { contentType: data.contentType, upsert: false });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    // 6. Update database record with new image_path
    const { error: updateErr } = await supabaseAdmin
      .from("factory_info_rows")
      .upsert(
        {
          id: data.id,
          row_order: data.id === "row_1" ? 1 : 2,
          image_path: storagePath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (updateErr) {
      // Clean up newly uploaded storage object to prevent orphan
      try {
        await supabaseAdmin.storage.from(FACTORY_INFO_BUCKET).remove([storagePath]);
      } catch (cleanupErr) {
        console.error("Orphan cleanup failed for", storagePath, cleanupErr);
      }
      throw new Error(`Failed to update database with new image: ${updateErr.message}`);
    }

    // 7. Remove previous image ONLY if it was in the factory-info namespace and different
    if (prevPath && prevPath.startsWith(FACTORY_INFO_PATH_PREFIX) && prevPath !== storagePath) {
      try {
        await supabaseAdmin.storage.from(FACTORY_INFO_BUCKET).remove([prevPath]);
      } catch (cleanupErr) {
        console.warn(`Could not remove previous image ${prevPath}:`, cleanupErr);
      }
    }

    // 8. Generate preview signed URL
    const { data: signed } = await supabaseAdmin.storage
      .from(FACTORY_INFO_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    return {
      success: true,
      imagePath: storagePath,
      imageUrl: signed?.signedUrl ?? null,
    };
  });
