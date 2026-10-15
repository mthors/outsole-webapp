import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { OutsoleStatus } from "./catalog-types";

export type AdminOutsoleListItem = {
  id: string;
  model_number: string;
  name: string;
  slug: string;
  description: string | null;
  status: OutsoleStatus;
  is_featured: boolean;
  is_sampling_available: boolean;
  shore_min: number | null;
  shore_max: number | null;
  shore_scale: string;
  din_abrasion_mm3: number | null;
  weight_grams: number | null;
  created_at: string;
  updated_at: string;
  categories: Array<{ id: string; name: string; slug: string }>;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
};

export const createOutsoleSchema = z
  .object({
    name: z.string().trim().min(2, "Product name must be at least 2 characters").max(150),
    slug: z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters")
      .max(150)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase alphanumeric with hyphens (e.g. trail-grip-x1)",
      ),
    model_number: z.string().trim().min(2, "Model number / SKU is required").max(50),
    description: z.string().trim().max(5000).optional().nullable(),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    is_featured: z.boolean().default(false),
    is_sampling_available: z.boolean().default(false),
    shore_min: z.coerce.number().int().positive("Must be greater than 0").nullable().optional(),
    shore_max: z.coerce.number().int().positive("Must be greater than 0").nullable().optional(),
    shore_scale: z.string().trim().min(1).max(10).default("A"),
    din_abrasion_mm3: z.coerce.number().positive("Must be greater than 0").nullable().optional(),
    weight_grams: z.coerce.number().int().positive("Must be greater than 0").nullable().optional(),
    category_ids: z.array(z.string().uuid()).default([]),
    material_ids: z.array(z.string().uuid()).default([]),
    traction_type_ids: z.array(z.string().uuid()).default([]),
  })
  .refine(
    (data) => {
      if (data.shore_min != null && data.shore_max != null) {
        return data.shore_min <= data.shore_max;
      }
      return true;
    },
    {
      message: "Shore hardness minimum cannot exceed maximum",
      path: ["shore_min"],
    },
  );

export type CreateOutsoleInput = z.infer<typeof createOutsoleSchema>;

/**
 * Server function: Lists all outsoles for the admin area (including draft & archived),
 * along with their categories and signed primary image URL.
 */
export const listAdminOutsoles = createServerFn({ method: "GET" }).handler(async () => {
  const { assertStaffRole } = await import("./admin-auth.server");
  await assertStaffRole();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("outsoles")
    .select(
      `
      id, model_number, name, slug, description, shore_min, shore_max, shore_scale,
      din_abrasion_mm3, weight_grams, is_featured, is_sampling_available, status, created_at, updated_at,
      outsole_categories ( categories ( id, name, slug ) ),
      outsole_images ( id, file_path, alt_text, is_primary, display_order )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load outsoles: ${error.message}`);
  }

  // Collect primary image paths to sign in a batch
  const imagePathsToSign: string[] = [];
  for (const r of rows ?? []) {
    const images = (r.outsole_images ?? []) as Array<{
      id: string;
      file_path: string;
      alt_text: string | null;
      is_primary: boolean;
      display_order: number;
    }>;
    const prim = images.find((i) => i.is_primary) ?? images[0];
    if (prim?.file_path) {
      imagePathsToSign.push(prim.file_path);
    }
  }

  const urlMap = new Map<string, string>();
  if (imagePathsToSign.length > 0) {
    const { data: signedEntries } = await supabaseAdmin.storage
      .from("outsole-images")
      .createSignedUrls(imagePathsToSign, 60 * 60 * 24);

    for (const entry of signedEntries ?? []) {
      if (entry.path && entry.signedUrl) {
        urlMap.set(entry.path, entry.signedUrl);
      }
    }
  }

  const outsoles: AdminOutsoleListItem[] = (rows ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cats = ((r.outsole_categories ?? []) as any[]).map((c) => c.categories).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgs = (r.outsole_images ?? []) as any[];
    const prim = imgs.find((i) => i.is_primary) ?? imgs[0];

    return {
      id: r.id,
      model_number: r.model_number,
      name: r.name,
      slug: r.slug,
      description: r.description ?? null,
      status: r.status as OutsoleStatus,
      is_featured: Boolean(r.is_featured),
      is_sampling_available: Boolean(r.is_sampling_available),
      shore_min: r.shore_min ?? null,
      shore_max: r.shore_max ?? null,
      shore_scale: r.shore_scale ?? "A",
      din_abrasion_mm3: r.din_abrasion_mm3 == null ? null : Number(r.din_abrasion_mm3),
      weight_grams: r.weight_grams ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      categories: cats,
      primaryImageUrl: prim?.file_path ? (urlMap.get(prim.file_path) ?? null) : null,
      primaryImageAlt: prim?.alt_text ?? null,
    };
  });

  return { outsoles };
});

/**
 * Server function: Loads full taxonomy for form selectors (categories, materials, traction types).
 */
export const getAdminTaxonomy = createServerFn({ method: "GET" }).handler(async () => {
  const { assertStaffRole } = await import("./admin-auth.server");
  await assertStaffRole();

  const { fetchTaxonomy } = await import("./public-catalog.server");
  const taxonomy = await fetchTaxonomy();
  return { taxonomy };
});

/**
 * Server function: Creates a new outsole and persists all associated junction records.
 */
export const createAdminOutsole = createServerFn({ method: "POST" })
  .validator((data: unknown) => createOutsoleSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Uniqueness check for slug
    const { data: existingSlug } = await supabaseAdmin
      .from("outsoles")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();

    if (existingSlug) {
      throw new Error(
        `A product with the slug "${data.slug}" already exists. Please choose a unique slug.`,
      );
    }

    // 2. Uniqueness check for model_number / SKU
    const { data: existingModel } = await supabaseAdmin
      .from("outsoles")
      .select("id")
      .eq("model_number", data.model_number)
      .maybeSingle();

    if (existingModel) {
      throw new Error(
        `A product with the SKU / Model Number "${data.model_number}" already exists.`,
      );
    }

    // 3. Insert primary product record
    const { data: newOutsole, error: insertError } = await supabaseAdmin
      .from("outsoles")
      .insert({
        name: data.name,
        slug: data.slug,
        model_number: data.model_number,
        description: data.description || null,
        status: data.status,
        is_featured: data.is_featured,
        is_sampling_available: data.is_sampling_available,
        shore_min: data.shore_min ?? null,
        shore_max: data.shore_max ?? null,
        shore_scale: data.shore_scale || "A",
        din_abrasion_mm3: data.din_abrasion_mm3 ?? null,
        weight_grams: data.weight_grams ?? null,
      })
      .select("id, slug, model_number, name")
      .single();

    if (insertError || !newOutsole) {
      throw new Error(
        `Failed to create product: ${insertError?.message ?? "Unknown database error"}`,
      );
    }

    // 4. Insert junction records with deduplication
    const uniqueCategoryIds = Array.from(new Set(data.category_ids.filter(Boolean)));
    if (uniqueCategoryIds.length > 0) {
      const { error: catError } = await supabaseAdmin.from("outsole_categories").insert(
        uniqueCategoryIds.map((categoryId) => ({
          outsole_id: newOutsole.id,
          category_id: categoryId,
        })),
      );
      if (catError) {
        console.error("Failed to associate categories:", catError);
      }
    }

    const uniqueMaterialIds = Array.from(new Set(data.material_ids.filter(Boolean)));
    if (uniqueMaterialIds.length > 0) {
      const { error: matError } = await supabaseAdmin.from("outsole_materials").insert(
        uniqueMaterialIds.map((materialId) => ({
          outsole_id: newOutsole.id,
          material_id: materialId,
        })),
      );
      if (matError) {
        console.error("Failed to associate materials:", matError);
      }
    }

    const uniqueTractionIds = Array.from(new Set(data.traction_type_ids.filter(Boolean)));
    if (uniqueTractionIds.length > 0) {
      const { error: tracError } = await supabaseAdmin.from("outsole_traction_types").insert(
        uniqueTractionIds.map((tractionId) => ({
          outsole_id: newOutsole.id,
          traction_type_id: tractionId,
        })),
      );
      if (tracError) {
        console.error("Failed to associate traction types:", tracError);
      }
    }

    return {
      success: true,
      id: newOutsole.id,
      slug: newOutsole.slug,
      name: newOutsole.name,
    };
  });

export type AdminOutsoleDetail = {
  id: string;
  model_number: string;
  name: string;
  slug: string;
  description: string | null;
  status: OutsoleStatus;
  is_featured: boolean;
  is_sampling_available: boolean;
  shore_min: number | null;
  shore_max: number | null;
  shore_scale: string;
  din_abrasion_mm3: number | null;
  weight_grams: number | null;
  created_at: string;
  updated_at: string;
  category_ids: string[];
  material_ids: string[];
  traction_type_ids: string[];
  categories: Array<{ id: string; name: string; slug?: string | null }>;
  materials: Array<{ id: string; name: string; description?: string | null }>;
  tractionTypes: Array<{ id: string; name: string; description?: string | null }>;
  images: Array<{
    id: string;
    file_path: string;
    alt_text: string | null;
    is_primary: boolean;
    display_order: number;
    url: string | null;
  }>;
};

export const updateOutsoleSchema = z
  .object({
    id: z.string().uuid("Invalid product ID"),
    name: z.string().trim().min(2, "Product name must be at least 2 characters").max(150),
    slug: z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters")
      .max(150)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug must be lowercase alphanumeric with hyphens (e.g. trail-grip-x1)",
      ),
    model_number: z.string().trim().min(2, "Model number / SKU is required").max(50),
    description: z.string().trim().max(5000).optional().nullable(),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    is_featured: z.boolean().default(false),
    is_sampling_available: z.boolean().default(false),
    shore_min: z.coerce.number().int().positive("Must be greater than 0").nullable().optional(),
    shore_max: z.coerce.number().int().positive("Must be greater than 0").nullable().optional(),
    shore_scale: z.string().trim().min(1).max(10).default("A"),
    din_abrasion_mm3: z.coerce.number().positive("Must be greater than 0").nullable().optional(),
    weight_grams: z.coerce.number().int().positive("Must be greater than 0").nullable().optional(),
    category_ids: z.array(z.string().uuid()).default([]),
    material_ids: z.array(z.string().uuid()).default([]),
    traction_type_ids: z.array(z.string().uuid()).default([]),
  })
  .refine(
    (data) => {
      if (data.shore_min != null && data.shore_max != null) {
        return data.shore_min <= data.shore_max;
      }
      return true;
    },
    {
      message: "Shore hardness minimum cannot exceed maximum",
      path: ["shore_min"],
    },
  );

export type UpdateOutsoleInput = z.infer<typeof updateOutsoleSchema>;

/**
 * Server function: Fetches a single outsole by immutable UUID with full taxonomy relationships and signed images.
 */
export const getAdminOutsole = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().uuid("Invalid product ID") }).parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("outsoles")
      .select(
        `
        id, model_number, name, slug, description, shore_min, shore_max, shore_scale,
        din_abrasion_mm3, weight_grams, is_featured, is_sampling_available, status, created_at, updated_at,
        outsole_categories ( category_id, categories ( id, name, slug ) ),
        outsole_materials ( material_id, materials ( id, name, description ) ),
        outsole_traction_types ( traction_type_id, traction_types ( id, name, description ) ),
        outsole_images ( id, file_path, alt_text, is_primary, display_order )
      `,
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load product: ${error.message}`);
    }

    if (!row) {
      throw new Error("Product not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cats = ((row.outsole_categories ?? []) as any[]).map((c) => c.categories).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mats = ((row.outsole_materials ?? []) as any[]).map((m) => m.materials).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tracs = ((row.outsole_traction_types ?? []) as any[])
      .map((t) => t.traction_types)
      .filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category_ids = ((row.outsole_categories ?? []) as any[])
      .map((c) => c.category_id || c.categories?.id)
      .filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const material_ids = ((row.outsole_materials ?? []) as any[])
      .map((m) => m.material_id || m.materials?.id)
      .filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traction_type_ids = ((row.outsole_traction_types ?? []) as any[])
      .map((t) => t.traction_type_id || t.traction_types?.id)
      .filter(Boolean);

    // Collect image paths and generate signed URLs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawImages = (row.outsole_images ?? []) as any[];
    const imagePaths = rawImages.map((i) => i.file_path).filter(Boolean);
    const urlMap = new Map<string, string>();
    if (imagePaths.length > 0) {
      const { data: signedEntries } = await supabaseAdmin.storage
        .from("outsole-images")
        .createSignedUrls(imagePaths, 60 * 60 * 24);

      for (const entry of signedEntries ?? []) {
        if (entry.path && entry.signedUrl) {
          urlMap.set(entry.path, entry.signedUrl);
        }
      }
    }

    const images = rawImages.map((img) => ({
      id: img.id,
      file_path: img.file_path,
      alt_text: img.alt_text ?? null,
      is_primary: Boolean(img.is_primary),
      display_order: img.display_order ?? 0,
      url: img.file_path ? (urlMap.get(img.file_path) ?? null) : null,
    }));

    const outsole: AdminOutsoleDetail = {
      id: row.id,
      model_number: row.model_number,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      status: row.status as OutsoleStatus,
      is_featured: Boolean(row.is_featured),
      is_sampling_available: Boolean(row.is_sampling_available),
      shore_min: row.shore_min ?? null,
      shore_max: row.shore_max ?? null,
      shore_scale: row.shore_scale ?? "A",
      din_abrasion_mm3: row.din_abrasion_mm3 == null ? null : Number(row.din_abrasion_mm3),
      weight_grams: row.weight_grams ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      category_ids,
      material_ids,
      traction_type_ids,
      categories: cats,
      materials: mats,
      tractionTypes: tracs,
      images,
    };

    return { outsole };
  });

/**
 * Synchronizes a junction table by adding new associations and removing deselected ones.
 * Unchanged associations remain untouched.
 */
async function syncJunctionTable(params: {
  tableName: "outsole_categories" | "outsole_materials" | "outsole_traction_types";
  idColumn: "category_id" | "material_id" | "traction_type_id";
  outsoleId: string;
  targetIds: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any;
}) {
  const { tableName, idColumn, outsoleId, targetIds, supabaseAdmin } = params;

  // 1. Fetch current existing relations for this product
  const { data: existingRows, error: fetchError } = await supabaseAdmin
    .from(tableName)
    .select(idColumn)
    .eq("outsole_id", outsoleId);

  if (fetchError) {
    throw new Error(`Failed to load existing associations for ${tableName}: ${fetchError.message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentIds: string[] = (existingRows ?? []).map((r: any) => r[idColumn] as string);
  const uniqueTargetIds = Array.from(new Set(targetIds.filter(Boolean)));

  const toAdd = uniqueTargetIds.filter((id) => !currentIds.includes(id));
  const toRemove = currentIds.filter((id) => !uniqueTargetIds.includes(id));

  // 2. Remove deselected relations
  if (toRemove.length > 0) {
    const { error: delError } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq("outsole_id", outsoleId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .in(idColumn as any, toRemove);

    if (delError) {
      throw new Error(
        `Failed to remove deselected associations from ${tableName}: ${delError.message}`,
      );
    }
  }

  // 3. Insert newly selected relations
  if (toAdd.length > 0) {
    const insertPayload = toAdd.map((id) => ({
      outsole_id: outsoleId,
      [idColumn]: id,
    }));

    const { error: insError } = await supabaseAdmin
      .from(tableName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insertPayload as any);

    if (insError) {
      throw new Error(`Failed to insert new associations into ${tableName}: ${insError.message}`);
    }
  }
}

/**
 * Server function: Updates an existing outsole and synchronizes its junction records.
 */
export const updateAdminOutsole = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateOutsoleSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify product exists
    const { data: existingProduct, error: fetchError } = await supabaseAdmin
      .from("outsoles")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchError || !existingProduct) {
      throw new Error("Product not found");
    }

    // 2. Uniqueness check for slug (excluding current product)
    const { data: existingSlug } = await supabaseAdmin
      .from("outsoles")
      .select("id")
      .eq("slug", data.slug)
      .neq("id", data.id)
      .maybeSingle();

    if (existingSlug) {
      throw new Error(
        `A product with the slug "${data.slug}" already exists. Please choose a unique slug.`,
      );
    }

    // 3. Uniqueness check for model_number / SKU (excluding current product)
    const { data: existingModel } = await supabaseAdmin
      .from("outsoles")
      .select("id")
      .eq("model_number", data.model_number)
      .neq("id", data.id)
      .maybeSingle();

    if (existingModel) {
      throw new Error(
        `A product with the SKU / Model Number "${data.model_number}" already exists.`,
      );
    }

    // 4. Update primary product record
    const { data: updatedOutsole, error: updateError } = await supabaseAdmin
      .from("outsoles")
      .update({
        name: data.name,
        slug: data.slug,
        model_number: data.model_number,
        description: data.description || null,
        status: data.status,
        is_featured: data.is_featured,
        is_sampling_available: data.is_sampling_available,
        shore_min: data.shore_min ?? null,
        shore_max: data.shore_max ?? null,
        shore_scale: data.shore_scale || "A",
        din_abrasion_mm3: data.din_abrasion_mm3 ?? null,
        weight_grams: data.weight_grams ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("id, slug, model_number, name")
      .single();

    if (updateError || !updatedOutsole) {
      if (updateError?.code === "23505" || updateError?.message.includes("outsoles_slug_key")) {
        throw new Error(
          `A product with the slug "${data.slug}" already exists. Please choose a unique slug.`,
        );
      }
      if (
        updateError?.code === "23505" ||
        updateError?.message.includes("outsoles_model_number_key")
      ) {
        throw new Error(
          `A product with the SKU / Model Number "${data.model_number}" already exists.`,
        );
      }
      throw new Error(
        `Failed to update product: ${updateError?.message ?? "Unknown database error"}`,
      );
    }

    // 5. Synchronize taxonomy relationships
    await syncJunctionTable({
      tableName: "outsole_categories",
      idColumn: "category_id",
      outsoleId: data.id,
      targetIds: data.category_ids,
      supabaseAdmin,
    });

    await syncJunctionTable({
      tableName: "outsole_materials",
      idColumn: "material_id",
      outsoleId: data.id,
      targetIds: data.material_ids,
      supabaseAdmin,
    });

    await syncJunctionTable({
      tableName: "outsole_traction_types",
      idColumn: "traction_type_id",
      outsoleId: data.id,
      targetIds: data.traction_type_ids,
      supabaseAdmin,
    });

    return {
      success: true,
      id: updatedOutsole.id,
      slug: updatedOutsole.slug,
      name: updatedOutsole.name,
    };
  });

/**
 * Server function: Archives an existing outsole product.
 * Sets status = "archived" without touching any other field,
 * taxonomy junctions, image metadata, or Storage objects.
 */
export const archiveAdminOutsole = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid("Invalid product ID") }).parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify the product exists
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("outsoles")
      .select("id, name, status")
      .eq("id", data.id)
      .maybeSingle();

    if (lookupError) {
      throw new Error("Failed to verify product existence");
    }

    if (!existing) {
      throw new Error("Product not found");
    }

    // 2. Idempotent: already archived is fine
    if (existing.status === "archived") {
      return { success: true, id: existing.id, name: existing.name, alreadyArchived: true };
    }

    // 3. Update ONLY the status field
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("outsoles")
      .update({ status: "archived" })
      .eq("id", data.id)
      .select("id, name, slug")
      .single();

    if (updateError || !updated) {
      throw new Error("Failed to archive product. Please try again.");
    }

    return { success: true, id: updated.id, name: updated.name, alreadyArchived: false };
  });

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6A — EXISTING IMAGE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the full images list for an outsole (with signed URLs) — used to
 * refresh the image panel after a mutation without reloading the full form.
 */
export const getAdminOutsoleImages = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ outsoleId: z.string().uuid("Invalid outsole ID") }).parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("outsole_images")
      .select("id, outsole_id, file_path, alt_text, display_order, is_primary")
      .eq("outsole_id", data.outsoleId)
      .order("display_order", { ascending: true });

    if (error) throw new Error(`Failed to load images: ${error.message}`);

    const paths = (rows ?? []).map((r) => r.file_path).filter(Boolean);
    const urlMap = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabaseAdmin.storage
        .from("outsole-images")
        .createSignedUrls(paths, 60 * 60 * 24);
      for (const entry of signed ?? []) {
        if (entry.path && entry.signedUrl) urlMap.set(entry.path, entry.signedUrl);
      }
    }

    const images = (rows ?? []).map((r) => ({
      id: r.id,
      outsole_id: r.outsole_id,
      file_path: r.file_path,
      alt_text: r.alt_text ?? null,
      display_order: r.display_order ?? 0,
      is_primary: Boolean(r.is_primary),
      url: urlMap.get(r.file_path) ?? null,
    }));

    return { images };
  });

export type AdminOutsoleImage = {
  id: string;
  outsole_id: string;
  file_path: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
  url: string | null;
};

/**
 * Server function: Sets a specific image as the primary image for an outsole.
 *
 * Unique-constraint safety:
 *   The `unique_primary_outsole_image` partial unique index enforces at most
 *   one row with is_primary=true per outsole_id.
 *
 *   We use a two-step UPDATE sequence (clear old primary → set new primary)
 *   via the service-role client. Because each step modifies a different row,
 *   there is no window where TWO primaries would exist simultaneously.
 *   If step 2 fails after step 1 succeeds, the outsole temporarily has zero
 *   primaries (acceptable — the UI will refresh and allow re-selection).
 *
 *   True ACID atomicity would require an RPC/plpgsql function; this is noted
 *   as a known limitation and is safe for the current single-writer admin use.
 */
export const setPrimaryOutsoleImage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        outsoleId: z.string().uuid("Invalid outsole ID"),
        imageId: z.string().uuid("Invalid image ID"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify image belongs to this outsole
    const { data: img, error: lookupErr } = await supabaseAdmin
      .from("outsole_images")
      .select("id, outsole_id, is_primary, file_path")
      .eq("id", data.imageId)
      .eq("outsole_id", data.outsoleId)
      .maybeSingle();

    if (lookupErr) throw new Error("Failed to verify image ownership");
    if (!img) throw new Error("Image not found or does not belong to this product");

    // 2. Idempotent: already primary → nothing to do
    if (img.is_primary) {
      return { success: true, imageId: data.imageId, alreadyPrimary: true };
    }

    // 3. Step A: Clear current primary (if any) — no-op if none
    const { error: clearErr } = await supabaseAdmin
      .from("outsole_images")
      .update({ is_primary: false })
      .eq("outsole_id", data.outsoleId)
      .eq("is_primary", true);

    if (clearErr) throw new Error(`Failed to clear existing primary: ${clearErr.message}`);

    // 4. Step B: Mark new primary
    const { error: setErr } = await supabaseAdmin
      .from("outsole_images")
      .update({ is_primary: true })
      .eq("id", data.imageId)
      .eq("outsole_id", data.outsoleId);

    if (setErr) throw new Error(`Failed to set new primary image: ${setErr.message}`);

    return { success: true, imageId: data.imageId, alreadyPrimary: false };
  });

/**
 * Server function: Swaps display_order between two adjacent images.
 * Supports "move up" (lower order) and "move down" (higher order).
 *
 * Renumbers the complete set for the product to keep orders compact and
 * collision-free. Does not modify file paths or image content.
 */
export const reorderOutsoleImages = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        outsoleId: z.string().uuid("Invalid outsole ID"),
        imageId: z.string().uuid("Invalid image ID"),
        direction: z.enum(["up", "down"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Load all images for the outsole, sorted by current display_order
    const { data: allImgs, error: listErr } = await supabaseAdmin
      .from("outsole_images")
      .select("id, outsole_id, display_order")
      .eq("outsole_id", data.outsoleId)
      .order("display_order", { ascending: true });

    if (listErr) throw new Error(`Failed to load images: ${listErr.message}`);
    if (!allImgs || allImgs.length === 0) throw new Error("No images found for this product");

    // 2. Verify the target image belongs to this outsole
    const targetIdx = allImgs.findIndex((i) => i.id === data.imageId);
    if (targetIdx === -1) throw new Error("Image not found or does not belong to this product");

    // 3. Compute swap index
    const swapIdx = data.direction === "up" ? targetIdx - 1 : targetIdx + 1;
    if (swapIdx < 0 || swapIdx >= allImgs.length) {
      // Already at boundary — no-op
      return { success: true, noOp: true };
    }

    // 4. Build reordered array
    const reordered = [...allImgs];
    // Non-null assertions are safe: swapIdx and targetIdx are bounds-checked above
    const temp = reordered[swapIdx]!;
    reordered[swapIdx] = reordered[targetIdx]!;
    reordered[targetIdx] = temp;

    // 5. Assign compact sequential orders starting from 0
    const updates = reordered.map((img, idx) => ({ id: img.id, display_order: idx }));

    // 6. Apply updates sequentially
    for (const u of updates) {
      const { error: upErr } = await supabaseAdmin
        .from("outsole_images")
        .update({ display_order: u.display_order })
        .eq("id", u.id)
        .eq("outsole_id", data.outsoleId);
      if (upErr) throw new Error(`Failed to update display_order for ${u.id}: ${upErr.message}`);
    }

    return { success: true, noOp: false };
  });

/**
 * Server function: Updates ONLY the alt_text for an existing outsole image.
 * Does not modify file_path, image_url, display_order, or is_primary.
 */
export const updateOutsoleImageMetadata = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        outsoleId: z.string().uuid("Invalid outsole ID"),
        imageId: z.string().uuid("Invalid image ID"),
        alt_text: z
          .string()
          .trim()
          .max(500, "Alt text must be 500 characters or fewer")
          .nullable()
          .optional()
          .transform((v) => v ?? null),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify image belongs to this outsole
    const { data: img, error: lookupErr } = await supabaseAdmin
      .from("outsole_images")
      .select("id, outsole_id, alt_text")
      .eq("id", data.imageId)
      .eq("outsole_id", data.outsoleId)
      .maybeSingle();

    if (lookupErr) throw new Error("Failed to verify image ownership");
    if (!img) throw new Error("Image not found or does not belong to this product");

    // 2. Update ONLY alt_text
    const { error: updErr } = await supabaseAdmin
      .from("outsole_images")
      .update({ alt_text: data.alt_text ?? null })
      .eq("id", data.imageId)
      .eq("outsole_id", data.outsoleId);

    if (updErr) throw new Error(`Failed to update alt text: ${updErr.message}`);

    return { success: true, imageId: data.imageId };
  });

/**
 * Server function: Removes an existing image from an outsole.
 *
 * Order of operations (to minimise orphan risk):
 *   1. Authenticate + authorise caller.
 *   2. Validate IDs.
 *   3. Look up image row to get the *trusted* file_path from the DB.
 *   4. Delete Storage object.
 *   5. Delete outsole_images metadata row.
 *
 * If Storage deletion fails → abort, return error, leave DB intact.
 * If metadata deletion fails after Storage deletion → return partial failure.
 *
 * The caller must never supply an arbitrary file_path — it is always read
 * from the authorised database record to prevent path injection.
 *
 * Primary-image edge cases:
 *   - Removing the last image → product has zero images (allowed).
 *   - Removing the primary image when others exist → no automatic replacement;
 *     admin must explicitly set a new primary via setPrimaryOutsoleImage.
 *   - Removing a non-primary image → primary remains unchanged.
 *   - Removing an image belonging to another product → rejected (cross-product guard).
 */
export const removeOutsoleImage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        outsoleId: z.string().uuid("Invalid outsole ID"),
        imageId: z.string().uuid("Invalid image ID"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify image belongs to this outsole — read trusted file_path from DB
    const { data: img, error: lookupErr } = await supabaseAdmin
      .from("outsole_images")
      .select("id, outsole_id, file_path, is_primary")
      .eq("id", data.imageId)
      .eq("outsole_id", data.outsoleId)
      .maybeSingle();

    if (lookupErr) throw new Error("Failed to verify image ownership");
    if (!img) throw new Error("Image not found or does not belong to this product");

    const trustedPath = img.file_path;

    // 2. Delete Storage object first — if this fails we leave the DB intact
    const { error: storageErr } = await supabaseAdmin.storage
      .from("outsole-images")
      .remove([trustedPath]);

    if (storageErr) {
      throw new Error(
        `Storage deletion failed for "${trustedPath}": ${storageErr.message}. ` +
          `The image record has NOT been removed. Please try again.`,
      );
    }

    // 3. Delete metadata row
    const { error: rowErr } = await supabaseAdmin
      .from("outsole_images")
      .delete()
      .eq("id", data.imageId)
      .eq("outsole_id", data.outsoleId);

    if (rowErr) {
      // Partial failure: Storage file deleted but metadata row remains.
      // This is an orphan situation — report clearly.
      throw new Error(
        `PARTIAL FAILURE: Storage file "${trustedPath}" was deleted but the ` +
          `database record could not be removed (${rowErr.message}). ` +
          `Please contact your database administrator to remove image ID ${data.imageId} manually.`,
      );
    }

    return {
      success: true,
      imageId: data.imageId,
      removedPath: trustedPath,
      wasPrimary: img.is_primary,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 6B — NEW PRODUCT IMAGE UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8MB

function validateImageMagicBytes(buf: Buffer, expectedMime: string): boolean {
  if (buf.length < 12) return false;
  if (expectedMime === "image/jpeg") {
    // JPEG starts with FF D8 FF
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (expectedMime === "image/png") {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
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
    // WebP: RIFF at 0..3 and WEBP at 8..11
    const riff = buf.toString("ascii", 0, 4);
    const webp = buf.toString("ascii", 8, 12);
    return riff === "RIFF" && webp === "WEBP";
  }
  return false;
}

/**
 * Server function: Uploads a new product image to Supabase Storage and inserts
 * an outsole_images database record.
 *
 * Security & Integrity:
 * - Authenticates caller and verifies staff role via assertStaffRole().
 * - Verifies the target outsole exists in the database.
 * - Validates file size (max 8MB), mime type, extension, and magic bytes.
 * - Server constructs and controls the storage path: outsoles/<outsole_id>/<safe_filename>.
 * - Default display_order: next sequential integer (max + 1, or 0 if first).
 * - Default is_primary: false, unless product currently has no images (first image).
 * - Failure cleanup: If storage upload succeeds but database insertion fails,
 *   the uploaded storage object is deleted immediately to prevent orphaned files.
 */
export const uploadOutsoleImage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        outsoleId: z.string().uuid("Invalid outsole ID"),
        fileName: z.string().min(1, "File name is required"),
        contentType: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
          errorMap: () => ({ message: "Only JPG, PNG, and WebP images are allowed" }),
        }),
        fileBase64: z.string().min(1, "Image data is required"),
        altText: z
          .string()
          .trim()
          .max(500, "Alt text must be 500 characters or fewer")
          .nullable()
          .optional()
          .transform((v) => v || null),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify target outsole exists
    const { data: outsole, error: outsoleErr } = await supabaseAdmin
      .from("outsoles")
      .select("id, name")
      .eq("id", data.outsoleId)
      .maybeSingle();

    if (outsoleErr) throw new Error(`Database error verifying product: ${outsoleErr.message}`);
    if (!outsole) throw new Error("Target outsole does not exist");

    // 2. Validate file extension
    const extMatch = data.fileName.split(".").pop()?.toLowerCase();
    if (!extMatch || !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extMatch)) {
      throw new Error("Unsupported file extension. Only .jpg, .png, and .webp files are allowed.");
    }
    const normalizedExt = extMatch === "jpeg" ? "jpg" : extMatch;

    // 3. Decode base64 to buffer and validate file size
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(data.fileBase64, "base64");
    } catch {
      throw new Error("Invalid image data encoding.");
    }

    if (fileBuffer.length === 0) {
      throw new Error("Uploaded file is empty.");
    }

    if (fileBuffer.length > MAX_IMAGE_FILE_SIZE) {
      throw new Error("File size exceeds the 8MB limit. Please choose a smaller image.");
    }

    // 4. Verify binary magic bytes
    if (!validateImageMagicBytes(fileBuffer, data.contentType)) {
      throw new Error("File content does not match the specified image format.");
    }

    // 5. Construct safe, product-specific, unique Storage path
    const rawBase = data.fileName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40)
      .replace(/^-|-$/g, "");
    const safeBase = rawBase || "image";

    const timestamp = Date.now();
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const safeFilename = `${timestamp}-${randomSuffix}-${safeBase}.${normalizedExt}`;
    const storagePath = `outsoles/${data.outsoleId}/${safeFilename}`;

    // 6. Upload to private Supabase Storage bucket 'outsole-images'
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("outsole-images")
      .upload(storagePath, fileBuffer, {
        contentType: data.contentType,
        upsert: false,
      });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    // 7. Insert outsole_images record with failure cleanup
    try {
      // Query existing images to compute next display_order and determine is_primary
      const { data: existing, error: existErr } = await supabaseAdmin
        .from("outsole_images")
        .select("id, display_order, is_primary")
        .eq("outsole_id", data.outsoleId)
        .order("display_order", { ascending: true });

      if (existErr) {
        throw new Error(`Failed to query existing images: ${existErr.message}`);
      }

      const existingImages = existing ?? [];
      const maxOrder =
        existingImages.length > 0
          ? Math.max(...existingImages.map((i) => i.display_order ?? 0))
          : -1;
      const nextDisplayOrder = maxOrder + 1;

      // Handle is_primary:
      // New images default to false and do NOT replace an existing primary.
      // If the product currently has no images at all, the first image becomes primary.
      const hasPrimary = existingImages.some((i) => i.is_primary);
      const isPrimary = existingImages.length === 0 && !hasPrimary;

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("outsole-images")
        .getPublicUrl(storagePath);
      const imageUrl = publicUrlData.publicUrl;

      const { data: row, error: insertErr } = await supabaseAdmin
        .from("outsole_images")
        .insert({
          outsole_id: data.outsoleId,
          file_path: storagePath,
          image_url: imageUrl,
          alt_text: data.altText ?? null,
          display_order: nextDisplayOrder,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (insertErr || !row) {
        throw new Error(`Database insert error: ${insertErr?.message ?? "Unknown insert error"}`);
      }

      // Generate signed URL for immediate preview
      const { data: signed } = await supabaseAdmin.storage
        .from("outsole-images")
        .createSignedUrl(storagePath, 60 * 60 * 24);

      return {
        success: true,
        image: {
          id: row.id,
          outsole_id: row.outsole_id,
          file_path: row.file_path,
          alt_text: row.alt_text,
          display_order: row.display_order,
          is_primary: row.is_primary,
          url: signed?.signedUrl ?? null,
        },
      };
    } catch (insertErr: unknown) {
      // FAILURE CLEANUP:
      // If Storage upload succeeded but database insertion failed, delete the newly uploaded Storage object
      try {
        await supabaseAdmin.storage.from("outsole-images").remove([storagePath]);
      } catch (cleanupErr) {
        console.error(`Orphan cleanup error for ${storagePath}:`, cleanupErr);
      }
      throw new Error(
        `Failed to save image metadata: ${insertErr instanceof Error ? insertErr.message : "Unknown error"}. Cleaned up uploaded file.`,
      );
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// BULK OPERATIONS & PERMANENT DELETION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Server function: Restores an archived outsole product to 'active' status.
 */
export const restoreAdminOutsole = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid("Invalid product ID") }).parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify product exists
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("outsoles")
      .select("id, name, status, model_number")
      .eq("id", data.id)
      .maybeSingle();

    if (lookupError) {
      throw new Error("Failed to verify product existence");
    }

    if (!existing) {
      throw new Error("Product not found");
    }

    if (existing.status === "active") {
      return { success: true, id: existing.id, name: existing.name, alreadyActive: true };
    }

    // 2. Update status to active
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("outsoles")
      .update({ status: "active" })
      .eq("id", data.id)
      .select("id, name, slug, model_number")
      .single();

    if (updateError || !updated) {
      throw new Error("Failed to restore product. Please try again.");
    }

    return { success: true, id: updated.id, name: updated.name, alreadyActive: false };
  });

/**
 * Server function: Bulk archives multiple outsoles by ID.
 * Skips products that are already archived and reports them clearly.
 */
export const bulkArchiveAdminOutsoles = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ids: z
          .array(z.string().uuid("Invalid product ID"))
          .min(1, "At least one product ID must be provided"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // M-2: Deduplicate bulk input IDs to prevent skewed reporting
    const uniqueIds = Array.from(new Set(data.ids));

    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("outsoles")
      .select("id, name, model_number, status")
      .in("id", uniqueIds);

    if (lookupError) {
      throw new Error(`Failed to query products: ${lookupError.message}`);
    }

    const foundMap = new Map((rows ?? []).map((r) => [r.id, r]));
    const eligible: Array<{ id: string; name: string; model_number: string }> = [];
    const skipped: Array<{ id: string; name: string; model_number: string; reason: string }> = [];
    const missing: Array<{ id: string; reason: string }> = [];

    for (const id of uniqueIds) {
      const item = foundMap.get(id);
      if (!item) {
        missing.push({ id, reason: "Product not found" });
      } else if (item.status === "archived") {
        skipped.push({
          id: item.id,
          name: item.name,
          model_number: item.model_number,
          reason: "Already archived",
        });
      } else {
        eligible.push({ id: item.id, name: item.name, model_number: item.model_number });
      }
    }

    let archived: Array<{ id: string; name: string; model_number: string }> = [];

    if (eligible.length > 0) {
      const eligibleIds = eligible.map((e) => e.id);
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from("outsoles")
        .update({ status: "archived" })
        .in("id", eligibleIds)
        .select("id, name, model_number");

      if (updateError) {
        throw new Error(`Bulk archive failed: ${updateError.message}`);
      }
      archived = updatedRows ?? [];
    }

    return {
      success: true,
      archivedCount: archived.length,
      skippedCount: skipped.length,
      missingCount: missing.length,
      archived,
      skipped,
      missing,
    };
  });

/**
 * Server function: Bulk restores multiple outsoles by ID to 'active' status.
 * Skips products that are already active and reports them clearly.
 */
export const bulkRestoreAdminOutsoles = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ids: z
          .array(z.string().uuid("Invalid product ID"))
          .min(1, "At least one product ID must be provided"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // M-2: Deduplicate bulk input IDs to prevent skewed reporting
    const uniqueIds = Array.from(new Set(data.ids));

    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("outsoles")
      .select("id, name, model_number, status")
      .in("id", uniqueIds);

    if (lookupError) {
      throw new Error(`Failed to query products: ${lookupError.message}`);
    }

    const foundMap = new Map((rows ?? []).map((r) => [r.id, r]));
    const eligible: Array<{ id: string; name: string; model_number: string }> = [];
    const skipped: Array<{ id: string; name: string; model_number: string; reason: string }> = [];
    const missing: Array<{ id: string; reason: string }> = [];

    for (const id of uniqueIds) {
      const item = foundMap.get(id);
      if (!item) {
        missing.push({ id, reason: "Product not found" });
      } else if (item.status === "active") {
        skipped.push({
          id: item.id,
          name: item.name,
          model_number: item.model_number,
          reason: "Already active",
        });
      } else {
        eligible.push({ id: item.id, name: item.name, model_number: item.model_number });
      }
    }

    let restored: Array<{ id: string; name: string; model_number: string }> = [];

    if (eligible.length > 0) {
      const eligibleIds = eligible.map((e) => e.id);
      const { data: updatedRows, error: updateError } = await supabaseAdmin
        .from("outsoles")
        .update({ status: "active" })
        .in("id", eligibleIds)
        .select("id, name, model_number");

      if (updateError) {
        throw new Error(`Bulk restore failed: ${updateError.message}`);
      }
      restored = updatedRows ?? [];
    }

    return {
      success: true,
      restoredCount: restored.length,
      skippedCount: skipped.length,
      missingCount: missing.length,
      restored,
      skipped,
      missing,
    };
  });

/**
 * Internal core helper to execute permanent deletion of verified archived products.
 * Guarantees:
 * 1. Only archived products are deleted. Non-archived products are rejected before any write.
 * 2. Database deletion (DELETE ... WHERE id IN (...) AND status = 'archived') determines the exact set of confirmed-deleted IDs.
 * 3. Never deletes Storage files belonging to products that still exist in the database (H-1).
 * 4. Fails closed on reference queries: any query failure skips Storage cleanup for candidate paths and surfaces an explicit warning (H-2).
 * 5. Re-checks surviving references after database deletion across outsole_images, factory_gallery, and factory_info_rows.
 * 6. Concurrency limitation note: While Postgres cascades and reference checks are performed strictly, there is an unavoidable non-transactional gap between Postgres DELETE and Supabase Storage HTTP API calls. If an image upload concurrently writes to an identical path during this window, atomicity across both systems cannot be guaranteed.
 * 7. Sample inquiries have ON DELETE SET NULL and are preserved in DB.
 * 8. Returns accurate per-product success/failure and cleanup warning results.
 */
export async function executePermanentDeletion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  products: Array<{ id: string; name: string; model_number: string; status: string }>,
) {
  const eligibleIds: string[] = [];
  const rejected: Array<{
    id: string;
    name?: string | undefined;
    model_number?: string | undefined;
    reason: string;
  }> = [];

  for (const p of products) {
    if (p.status !== "archived") {
      rejected.push({
        id: p.id,
        name: p.name,
        model_number: p.model_number,
        reason: `Cannot permanently delete product with status "${p.status}". Product must be archived first.`,
      });
    } else {
      eligibleIds.push(p.id);
    }
  }

  if (eligibleIds.length === 0) {
    return {
      deleted: [],
      rejected,
      storageCleanupErrors: [],
      deletedImagesCount: 0,
    };
  }

  // 1. Gather candidate image file_paths for eligible products BEFORE deleting database rows
  // (because once outsoles are deleted, cascade delete removes their outsole_images rows)
  const { data: imgRows, error: imgLookupErr } = await supabaseAdmin
    .from("outsole_images")
    .select("id, outsole_id, file_path")
    .in("outsole_id", eligibleIds);

  if (imgLookupErr) {
    throw new Error(`Failed to inspect product images prior to deletion: ${imgLookupErr.message}`);
  }

  const candidateImages = (imgRows ?? []) as Array<{
    id: string;
    outsole_id: string;
    file_path: string;
  }>;

  // 2. Delete from outsoles database table.
  // Enforce status = 'archived' in the delete query itself as an extra layer of defense!
  const { data: deletedRows, error: deleteErr } = await supabaseAdmin
    .from("outsoles")
    .delete()
    .in("id", eligibleIds)
    .eq("status", "archived")
    .select("id, name, model_number");

  if (deleteErr) {
    throw new Error(`Database permanent deletion failed: ${deleteErr.message}`);
  }

  const actuallyDeleted = (deletedRows ?? []) as Array<{
    id: string;
    name: string;
    model_number: string;
  }>;
  const actuallyDeletedIdSet = new Set(actuallyDeleted.map((r) => r.id));

  // Any eligible ID that was not returned by the DELETE query was not deleted (e.g. concurrent status change)
  for (const id of eligibleIds) {
    if (!actuallyDeletedIdSet.has(id)) {
      const orig = products.find((p) => p.id === id);
      rejected.push({
        id,
        name: orig?.name,
        model_number: orig?.model_number,
        reason:
          "Product was not deleted from database (status may have changed concurrently or record no longer exists).",
      });
    }
  }

  // H-1: ONLY consider image paths belonging to products that were confirmed deleted!
  // Products that still exist in the database MUST NOT have their Storage files deleted.
  const confirmedDeletedImagePaths = Array.from(
    new Set(
      candidateImages
        .filter((i) => actuallyDeletedIdSet.has(i.outsole_id))
        .map((i) => i.file_path)
        .filter(Boolean),
    ),
  );

  const storageCleanupErrors: string[] = [];
  let deletedImagesCount = 0;

  if (confirmedDeletedImagePaths.length > 0) {
    // H-2: Fail-closed shared reference checks immediately after database deletion
    const sharedPaths = new Set<string>();
    let referenceCheckFailed = false;

    // Check surviving outsole_images (from products that were NOT deleted)
    const { data: remainingOutsoleImgs, error: outsoleImgErr } = await supabaseAdmin
      .from("outsole_images")
      .select("file_path")
      .in("file_path", confirmedDeletedImagePaths);

    if (outsoleImgErr) {
      referenceCheckFailed = true;
      storageCleanupErrors.push(
        `Failed to verify surviving outsole image references: ${outsoleImgErr.message}. Skipped cleanup for affected storage files.`,
      );
    } else {
      for (const oi of remainingOutsoleImgs ?? []) {
        if (oi.file_path) sharedPaths.add(oi.file_path);
      }
    }

    // Check factory_gallery
    const { data: fgImgs, error: fgErr } = await supabaseAdmin
      .from("factory_gallery")
      .select("image_path")
      .in("image_path", confirmedDeletedImagePaths);

    if (fgErr) {
      referenceCheckFailed = true;
      storageCleanupErrors.push(
        `Failed to verify factory gallery image references: ${fgErr.message}. Skipped cleanup for affected storage files.`,
      );
    } else {
      for (const fg of fgImgs ?? []) {
        if (fg.image_path) sharedPaths.add(fg.image_path);
      }
    }

    // Check factory_info_rows
    const { data: firImgs, error: firErr } = await supabaseAdmin
      .from("factory_info_rows")
      .select("image_path")
      .in("image_path", confirmedDeletedImagePaths);

    if (firErr) {
      referenceCheckFailed = true;
      storageCleanupErrors.push(
        `Failed to verify factory info image references: ${firErr.message}. Skipped cleanup for affected storage files.`,
      );
    } else {
      for (const fir of firImgs ?? []) {
        if (fir.image_path) sharedPaths.add(fir.image_path);
      }
    }

    // Fail-closed: If ANY reference check failed, we do NOT perform Storage removal for any candidates to prevent accidental data loss.
    if (!referenceCheckFailed) {
      const safeStoragePaths = confirmedDeletedImagePaths.filter((path) => !sharedPaths.has(path));

      if (safeStoragePaths.length > 0) {
        const { error: storageRemoveErr } = await supabaseAdmin.storage
          .from("outsole-images")
          .remove(safeStoragePaths);

        if (storageRemoveErr) {
          storageCleanupErrors.push(
            `Storage cleanup failed for ${safeStoragePaths.length} file(s): ${storageRemoveErr.message}. Paths requiring manual administrator cleanup: ${safeStoragePaths.join(", ")}`,
          );
        } else {
          deletedImagesCount = safeStoragePaths.length;
        }
      }
    } else {
      storageCleanupErrors.push(
        `Reference check failed. Skipped Storage cleanup for ${confirmedDeletedImagePaths.length} candidate file(s) to avoid deleting shared assets. Paths: ${confirmedDeletedImagePaths.join(", ")}`,
      );
    }
  }

  return {
    deleted: actuallyDeleted,
    rejected,
    storageCleanupErrors,
    deletedImagesCount,
  };
}

/**
 * Server function: Permanently deletes a single archived product.
 * Validates staff authorization and rejects any active or draft products.
 */
export const deleteAdminOutsole = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid("Invalid product ID") }).parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify existence and archived status
    const { data: product, error: lookupErr } = await supabaseAdmin
      .from("outsoles")
      .select("id, name, model_number, status")
      .eq("id", data.id)
      .maybeSingle();

    if (lookupErr) {
      throw new Error(`Failed to query product: ${lookupErr.message}`);
    }

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.status !== "archived") {
      throw new Error(
        `Cannot permanently delete product "${product.name}". Only archived products can be permanently deleted. (Current status: "${product.status}")`,
      );
    }

    const result = await executePermanentDeletion(supabaseAdmin, [product]);

    if (result.deleted.length === 0) {
      const failureReason =
        result.rejected[0]?.reason ?? "Permanent deletion could not be completed.";
      throw new Error(failureReason);
    }

    return {
      success: true,
      id: product.id,
      name: product.name,
      model_number: product.model_number,
      deletedImagesCount: result.deletedImagesCount,
      storageCleanupErrors: result.storageCleanupErrors,
    };
  });

/**
 * Server function: Bulk permanently deletes multiple archived outsoles by ID.
 * Validates staff authorization and rejects any non-archived products.
 */
export const bulkDeleteAdminOutsoles = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        ids: z
          .array(z.string().uuid("Invalid product ID"))
          .min(1, "At least one product ID must be provided"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // M-2: Deduplicate bulk input IDs to prevent skewed reporting
    const uniqueIds = Array.from(new Set(data.ids));

    // 1. Fetch matching products
    const { data: rows, error: lookupErr } = await supabaseAdmin
      .from("outsoles")
      .select("id, name, model_number, status")
      .in("id", uniqueIds);

    if (lookupErr) {
      throw new Error(`Failed to query products: ${lookupErr.message}`);
    }

    const foundMap = new Map((rows ?? []).map((r) => [r.id, r]));
    const products: Array<{ id: string; name: string; model_number: string; status: string }> = [];
    const missing: Array<{ id: string; reason: string }> = [];

    for (const id of uniqueIds) {
      const item = foundMap.get(id);
      if (!item) {
        missing.push({ id, reason: "Product not found" });
      } else {
        products.push(item);
      }
    }

    const result = await executePermanentDeletion(supabaseAdmin, products);

    return {
      success: true,
      deletedCount: result.deleted.length,
      rejectedCount: result.rejected.length + missing.length,
      deleted: result.deleted,
      rejected: [...result.rejected, ...missing],
      deletedImagesCount: result.deletedImagesCount,
      storageCleanupErrors: result.storageCleanupErrors,
    };
  });
