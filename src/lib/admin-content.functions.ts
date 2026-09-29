import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============================================================================
// Schemas & Types
// ============================================================================

export const allowedContentKeys = [
  "homepage_hero",
  "homepage_capabilities",
  "about_company",
  "about_oem",
  "about_odm",
  "contact_information",
  "interior_hero",
] as const;

export const contentKeyEnum = z.enum(allowedContentKeys);
export type ContentKey = z.infer<typeof contentKeyEnum>;

import { contactContentSchema } from "./contact-content";
import { interiorHeroSchema } from "./interior-hero";

export const updateSiteContentSchema = z
  .object({
    content_key: contentKeyEnum,
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(255, "Title must not exceed 255 characters"),
    content: z
      .string()
      .trim()
      .min(1, "Content is required")
      .max(5000, "Content must not exceed 5000 characters"),
  })
  .superRefine((val, ctx) => {
    function validateJsonKey(
      schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } } },
      errorMsg: string,
    ) {
      try {
        const parsed = JSON.parse(val.content);
        const res = schema.safeParse(parsed);
        if (!res.success) {
          for (const issue of res.error!.issues) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${issue.path.join(".")}: ${issue.message}`,
              path: ["content", ...issue.path],
            });
          }
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: errorMsg,
          path: ["content"],
        });
      }
    }

    if (val.content_key === "contact_information") {
      validateJsonKey(
        contactContentSchema,
        "Contact information content must be a valid JSON representation matching the contact schema",
      );
    }
    if (val.content_key === "interior_hero") {
      validateJsonKey(
        interiorHeroSchema,
        "Interior hero content must be a valid JSON representation matching the interior hero schema",
      );
    }
  });

export type UpdateSiteContentInput = z.infer<typeof updateSiteContentSchema>;

export type AdminSiteContentEntry = {
  id: string;
  content_key: ContentKey;
  title: string | null;
  content: string | null;
  updated_at: string;
};

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Server function: Loads all site_content rows for the admin editor.
 * Enforces staff/admin authentication and server-side Supabase client.
 */
export const listAdminSiteContent = createServerFn({ method: "GET" }).handler(
  async () => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data, error } = await supabaseAdmin
      .from("site_content")
      .select("id, content_key, title, content, updated_at");

    if (error) {
      throw new Error(`Failed to load site content: ${error.message}`);
    }

    const rows = (data ?? []) as AdminSiteContentEntry[];

    // Sort rows deterministically by allowedContentKeys index
    const sorted = [...rows].sort((a, b) => {
      const idxA = allowedContentKeys.indexOf(a.content_key as ContentKey);
      const idxB = allowedContentKeys.indexOf(b.content_key as ContentKey);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    return { items: sorted };
  },
);

/**
 * Server function: Updates an individual site_content entry by content_key.
 * Enforces staff/admin authentication, strict Zod validation, and server-side Supabase client.
 */
export const updateAdminSiteContentEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateSiteContentSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: updated, error } = await supabaseAdmin
      .from("site_content")
      .update({
        title: data.title,
        content: data.content,
      })
      .eq("content_key", data.content_key)
      .select("id, content_key, title, content, updated_at")
      .single();

    if (error || !updated) {
      throw new Error(
        `Failed to update site content for "${data.content_key}": ${error?.message ?? "Entry not found"}`,
      );
    }

    return {
      success: true,
      item: updated as AdminSiteContentEntry,
    };
  });

// ============================================================================
// Interior Hero Image Management
// ============================================================================

const INTERIOR_HERO_BUCKET = "outsole-images";
export const INTERIOR_HERO_PATH_PREFIX = "site/hero/interior/";
const INTERIOR_HERO_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const INTERIOR_HERO_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"] as const;
const INTERIOR_HERO_MAX_SIZE = 8 * 1024 * 1024; // 8 MB

function validateInteriorHeroMagicBytes(buf: Buffer, mime: string): boolean {
  if (buf.length < 12) return false;
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === "image/png") {
    return (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    );
  }
  if (mime === "image/webp") {
    return buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

/**
 * Returns the current interior_hero config + a short-lived signed URL for admin preview.
 * Staff-only.
 */
export const getInteriorHeroAdminPreview = createServerFn({ method: "GET" }).handler(async () => {
  const { assertStaffRole } = await import("./admin-auth.server");
  await assertStaffRole();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { parseInteriorHero } = await import("./interior-hero");

  const { data: row } = await supabaseAdmin
    .from("site_content")
    .select("content")
    .eq("content_key", "interior_hero")
    .maybeSingle();

  const config = parseInteriorHero(row?.content ?? null);
  let imageUrl: string | null = null;

  if (config.imagePath) {
    const { data: signed } = await supabaseAdmin.storage
      .from(INTERIOR_HERO_BUCKET)
      .createSignedUrl(config.imagePath, 60 * 60); // 1-hour URL for admin
    imageUrl = signed?.signedUrl ?? null;
  }

  return { config, imageUrl };
});

/**
 * Server function: Uploads a new interior hero image and updates the CMS entry.
 *
 * Security guarantees:
 * - Staff role required.
 * - File size, MIME, extension, and magic-byte validated server-side.
 * - Storage path is server-constructed under site/hero/interior/ — client never controls the path.
 * - Old image deleted ONLY AFTER CMS update succeeds AND only when it starts with the interior
 *   hero prefix — prevents accidental deletion of product images or unrelated files.
 * - If CMS update fails after upload → newly uploaded file removed to prevent orphans.
 */
export const uploadInteriorHeroImage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        fileName: z.string().min(1, "File name is required").max(260),
        contentType: z.enum(INTERIOR_HERO_ALLOWED_MIME, {
          errorMap: () => ({ message: "Only JPG, PNG, and WebP images are allowed" }),
        }),
        fileBase64: z.string().min(1, "Image data is required"),
        altText: z.string().trim().max(300, "Alt text must be 300 characters or fewer").default("ODE Outsole manufacturing facility"),
        eyebrow: z.string().trim().max(100).default(""),
        title: z.string().trim().max(200).default(""),
        description: z.string().trim().max(500).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { parseInteriorHero } = await import("./interior-hero");

    // 1. Validate extension
    const extRaw = data.fileName.split(".").pop()?.toLowerCase() ?? "";
    if (!(INTERIOR_HERO_ALLOWED_EXT as readonly string[]).includes(extRaw)) {
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
    if (buf.length > INTERIOR_HERO_MAX_SIZE) {
      throw new Error("File size exceeds the 8 MB limit. Please choose a smaller image.");
    }

    // 3. Validate magic bytes
    if (!validateInteriorHeroMagicBytes(buf, data.contentType)) {
      throw new Error("File content does not match the specified image format.");
    }

    // 4. Read current hero config to capture previous imagePath (for cleanup)
    const { data: existingRow } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("content_key", "interior_hero")
      .maybeSingle();
    const prevConfig = parseInteriorHero(existingRow?.content ?? null);
    const prevPath = prevConfig.imagePath || null;

    // 5. Construct server-controlled storage path
    const rawBase = data.fileName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)
      .replace(/^-|-$/g, "");
    const safeBase = rawBase || "hero";
    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const storagePath = `${INTERIOR_HERO_PATH_PREFIX}${timestamp}-${randomSuffix}-${safeBase}.${ext}`;

    // Defensive: reject any path not in the interior hero namespace
    if (!storagePath.startsWith(INTERIOR_HERO_PATH_PREFIX)) {
      throw new Error("Internal error: generated path is outside the allowed namespace.");
    }

    // 6. Upload to private bucket
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(INTERIOR_HERO_BUCKET)
      .upload(storagePath, buf, { contentType: data.contentType, upsert: false });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    // 7. Update CMS — on failure, clean up newly uploaded file to prevent orphans
    const newContent = JSON.stringify({
      imagePath: storagePath,
      altText: data.altText,
      eyebrow: data.eyebrow,
      title: data.title,
      description: data.description,
    });

    const { error: cmsErr } = await supabaseAdmin
      .from("site_content")
      .update({ content: newContent })
      .eq("content_key", "interior_hero");

    if (cmsErr) {
      // CMS update failed — remove newly uploaded file to prevent orphan
      try {
        await supabaseAdmin.storage.from(INTERIOR_HERO_BUCKET).remove([storagePath]);
      } catch (cleanupErr) {
        console.error(`Orphan cleanup error for ${storagePath}:`, cleanupErr);
      }
      throw new Error(`Failed to update site content after upload: ${cmsErr.message}. Uploaded file was removed.`);
    }

    // 8. Remove previous image — ONLY if it was in the interior hero namespace
    if (prevPath && prevPath.startsWith(INTERIOR_HERO_PATH_PREFIX) && prevPath !== storagePath) {
      try {
        await supabaseAdmin.storage.from(INTERIOR_HERO_BUCKET).remove([prevPath]);
      } catch (cleanupErr) {
        // Non-fatal: old file cleanup failed — log but don't fail the whole operation
        console.error(`Old interior hero cleanup error for ${prevPath}:`, cleanupErr);
      }
    }

    // 9. Generate signed URL for immediate admin preview
    const { data: signed } = await supabaseAdmin.storage
      .from(INTERIOR_HERO_BUCKET)
      .createSignedUrl(storagePath, 60 * 60);

    return {
      success: true,
      storagePath,
      imageUrl: signed?.signedUrl ?? null,
      config: {
        imagePath: storagePath,
        altText: data.altText,
        eyebrow: data.eyebrow,
        title: data.title,
        description: data.description,
      },
    };
  });

/**
 * Updates only the interior hero metadata fields (altText, eyebrow, title, description).
 * Preserves the existing imagePath. Staff-only.
 */
export const updateInteriorHeroMetadata = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        altText: z.string().trim().max(300).default("ODE Outsole manufacturing facility"),
        eyebrow: z.string().trim().max(100).default(""),
        title: z.string().trim().max(200).default(""),
        description: z.string().trim().max(500).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { parseInteriorHero } = await import("./interior-hero");

    // Read current config to preserve imagePath
    const { data: row } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("content_key", "interior_hero")
      .maybeSingle();

    const current = parseInteriorHero(row?.content ?? null);
    const merged = JSON.stringify({
      imagePath: current.imagePath,
      altText: data.altText,
      eyebrow: data.eyebrow,
      title: data.title,
      description: data.description,
    });

    const { error } = await supabaseAdmin
      .from("site_content")
      .update({ content: merged })
      .eq("content_key", "interior_hero");

    if (error) throw new Error(`Failed to update interior hero metadata: ${error.message}`);

    return { success: true };
  });
