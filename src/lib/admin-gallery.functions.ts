import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { GalleryCategory, GalleryItem } from "./gallery-types";

const GALLERY_BUCKET = "outsole-images";
const GALLERY_PATH_PREFIX = "factory-gallery/";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days
const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedGalleryMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const galleryCategoryEnum = z.enum([
  "factory_office",
  "machinery_equipment",
  "production_process",
  "warehouse_storage",
]);

function validateImageMagicBytes(buf: Buffer, expectedMime: string): boolean {
  if (buf.length < 12) return false;
  if (expectedMime === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (expectedMime === "image/png") {
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (expectedMime === "image/webp") {
    const riff = buf.toString("ascii", 0, 4);
    const webp = buf.toString("ascii", 8, 12);
    return riff === "RIFF" && webp === "WEBP";
  }
  return false;
}

/**
 * Server function: List all factory gallery items (published and unpublished)
 * for authenticated staff.
 */
export const listAdminGallery = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: GalleryItem[] }> => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("factory_gallery")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load admin gallery: ${error.message}`);
    }

    const itemsWithUrls = await Promise.all(
      (data || []).map(async (row): Promise<GalleryItem> => {
        let imageUrl = row.image_path;

        if (!row.image_path.startsWith("/") && !row.image_path.startsWith("http")) {
          try {
            const { data: signedData } = await supabaseAdmin.storage
              .from(GALLERY_BUCKET)
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

/**
 * Server function: Upload a new gallery photograph and insert record.
 */
export const createAdminGalleryItem = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        fileName: z.string().min(1, "File name is required").max(260),
        contentType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
          errorMap: () => ({ message: "Only JPG, PNG, and WebP images are allowed" }),
        }),
        fileBase64: z.string().min(1, "Image file data is required"),
        category: galleryCategoryEnum,
        caption_id: z.string().trim().max(500, "Caption must be 500 characters or fewer").nullable().optional(),
        caption_en: z.string().trim().max(500, "English caption must be 500 characters or fewer").nullable().optional(),
        is_featured: z.boolean().default(false),
        is_published: z.boolean().default(true),
        display_order: z.number().int().optional(),
      })
      .parse(data),
  )
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

    // 2. Decode base64 and validate size
    let buf: Buffer;
    try {
      buf = Buffer.from(data.fileBase64, "base64");
    } catch {
      throw new Error("Invalid image data encoding.");
    }

    if (buf.length === 0) throw new Error("Uploaded file is empty.");
    if (buf.length > MAX_IMAGE_FILE_SIZE) {
      throw new Error("File size exceeds the 8MB limit. Please choose a smaller image.");
    }

    // 3. Validate magic bytes
    if (!validateImageMagicBytes(buf, data.contentType)) {
      throw new Error("File content does not match the specified image format.");
    }

    // 4. Construct server-controlled storage path
    const rawBase = data.fileName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)
      .replace(/^-|-$/g, "");
    const safeBase = rawBase || "gallery";
    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const storagePath = `${GALLERY_PATH_PREFIX}${timestamp}-${randomSuffix}-${safeBase}.${ext}`;

    // 5. Upload to storage bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(GALLERY_BUCKET)
      .upload(storagePath, buf, { contentType: data.contentType, upsert: false });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    // 6. Calculate display order if not provided
    let finalOrder = data.display_order;
    if (finalOrder === undefined) {
      const { data: maxRow } = await supabaseAdmin
        .from("factory_gallery")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      finalOrder = (maxRow?.display_order ?? 0) + 1;
    }

    // 7. Insert DB row
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("factory_gallery")
      .insert({
        category: data.category,
        image_path: storagePath,
        caption_id: data.caption_id?.trim() || null,
        caption_en: data.caption_en?.trim() || null,
        is_featured: data.is_featured,
        is_published: data.is_published,
        display_order: finalOrder,
        is_placeholder: false,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      // Cleanup uploaded file on DB insert failure
      await supabaseAdmin.storage.from(GALLERY_BUCKET).remove([storagePath]);
      throw new Error(`Failed to save gallery record: ${insertErr?.message}`);
    }

    // Generate signed URL
    let imageUrl = storagePath;
    try {
      const { data: signedData } = await supabaseAdmin.storage
        .from(GALLERY_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL);
      if (signedData?.signedUrl) {
        imageUrl = signedData.signedUrl;
      }
    } catch {
      // Non-fatal
    }

    return {
      item: {
        id: inserted.id,
        category: inserted.category as GalleryCategory,
        image_path: inserted.image_path,
        image_url: imageUrl,
        caption_id: inserted.caption_id,
        caption_en: inserted.caption_en,
        is_featured: inserted.is_featured,
        is_published: inserted.is_published,
        display_order: inserted.display_order,
        is_placeholder: inserted.is_placeholder,
        created_at: inserted.created_at,
        updated_at: inserted.updated_at,
      },
    };
  });

/**
 * Server function: Update existing gallery item metadata (and optionally replace photograph).
 */
export const updateAdminGalleryItem = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid("Invalid gallery item ID"),
        category: galleryCategoryEnum,
        caption_id: z.string().trim().max(500).nullable().optional(),
        caption_en: z.string().trim().max(500).nullable().optional(),
        is_featured: z.boolean(),
        is_published: z.boolean(),
        display_order: z.number().int(),
        newImage: z
          .object({
            fileName: z.string().min(1).max(260),
            contentType: z.enum(ALLOWED_IMAGE_MIME_TYPES),
            fileBase64: z.string().min(1),
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch current record
    const { data: current, error: getErr } = await supabaseAdmin
      .from("factory_gallery")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (getErr || !current) {
      throw new Error("Gallery item not found");
    }

    let finalImagePath = current.image_path;
    let isPlaceholder = current.is_placeholder;

    // 2. Handle image replacement if provided
    if (data.newImage) {
      const extRaw = data.newImage.fileName.split(".").pop()?.toLowerCase() ?? "";
      if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extRaw)) {
        throw new Error("Unsupported image extension. Only .jpg, .png, and .webp files are allowed.");
      }
      const ext = extRaw === "jpeg" ? "jpg" : extRaw;

      let buf: Buffer;
      try {
        buf = Buffer.from(data.newImage.fileBase64, "base64");
      } catch {
        throw new Error("Invalid image encoding.");
      }

      if (buf.length === 0) throw new Error("Uploaded file is empty.");
      if (buf.length > MAX_IMAGE_FILE_SIZE) {
        throw new Error("File size exceeds 8MB limit.");
      }

      if (!validateImageMagicBytes(buf, data.newImage.contentType)) {
        throw new Error("File content does not match specified format.");
      }

      const rawBase = data.newImage.fileName
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "-")
        .slice(0, 40)
        .replace(/^-|-$/g, "");
      const safeBase = rawBase || "gallery";
      const timestamp = Date.now();
      const randomSuffix = crypto.randomUUID().slice(0, 8);
      const newStoragePath = `${GALLERY_PATH_PREFIX}${timestamp}-${randomSuffix}-${safeBase}.${ext}`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(GALLERY_BUCKET)
        .upload(newStoragePath, buf, { contentType: data.newImage.contentType, upsert: false });

      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr.message}`);
      }

      finalImagePath = newStoragePath;
      isPlaceholder = false;
    }

    // 3. Update DB
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("factory_gallery")
      .update({
        category: data.category,
        image_path: finalImagePath,
        caption_id: data.caption_id?.trim() || null,
        caption_en: data.caption_en?.trim() || null,
        is_featured: data.is_featured,
        is_published: data.is_published,
        display_order: data.display_order,
        is_placeholder: isPlaceholder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to update gallery item: ${updateErr?.message}`);
    }

    // 4. Cleanup old storage file only if replaced, not placeholder, is a storage path, and no remaining record references it
    if (
      data.newImage &&
      !current.is_placeholder &&
      !current.image_path.startsWith("/") &&
      !current.image_path.startsWith("http")
    ) {
      try {
        const { count } = await supabaseAdmin
          .from("factory_gallery")
          .select("id", { count: "exact", head: true })
          .eq("image_path", current.image_path);

        if (!count || count === 0) {
          await supabaseAdmin.storage.from(GALLERY_BUCKET).remove([current.image_path]);
        }
      } catch (cleanErr) {
        console.warn("Failed to clean up replaced gallery file:", cleanErr);
      }
    }

    return { success: true };
  });

/**
 * Server function: Delete a factory gallery item and clean up storage.
 */
export const deleteAdminGalleryItem = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid("Invalid gallery item ID"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch record
    const { data: current, error: getErr } = await supabaseAdmin
      .from("factory_gallery")
      .select("image_path, is_placeholder")
      .eq("id", data.id)
      .maybeSingle();

    if (getErr || !current) {
      throw new Error("Item not found");
    }

    // 2. Delete database record first
    const { error: deleteErr } = await supabaseAdmin
      .from("factory_gallery")
      .delete()
      .eq("id", data.id);

    if (deleteErr) {
      throw new Error(`Failed to delete gallery record: ${deleteErr.message}`);
    }

    // 3. Delete storage file if not placeholder, is a storage path, and no remaining records reference it
    if (!current.is_placeholder && !current.image_path.startsWith("/") && !current.image_path.startsWith("http")) {
      try {
        const { count } = await supabaseAdmin
          .from("factory_gallery")
          .select("id", { count: "exact", head: true })
          .eq("image_path", current.image_path);

        if (!count || count === 0) {
          await supabaseAdmin.storage.from(GALLERY_BUCKET).remove([current.image_path]);
        }
      } catch (err) {
        console.warn(`Failed to delete storage file ${current.image_path}:`, err);
      }
    }

    return { success: true };
  });

/**
 * Server function: Reorder gallery items by updating display_order.
 */
export const reorderAdminGalleryItems = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        items: z.array(
          z.object({
            id: z.string().uuid(),
            display_order: z.number().int(),
          }),
        ),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Perform sequential updates
    for (const item of data.items) {
      const { error } = await supabaseAdmin
        .from("factory_gallery")
        .update({
          display_order: item.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) {
        throw new Error(`Failed to update display order for item ${item.id}: ${error.message}`);
      }
    }

    return { success: true };
  });
