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
] as const;

export const contentKeyEnum = z.enum(allowedContentKeys);
export type ContentKey = z.infer<typeof contentKeyEnum>;

export const updateSiteContentSchema = z.object({
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
