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
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens (e.g. trail-grip-x1)"),
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
    const cats = ((r.outsole_categories ?? []) as any[])
      .map((c) => c.categories)
      .filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imgs = ((r.outsole_images ?? []) as any[]);
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
      primaryImageUrl: prim?.file_path ? urlMap.get(prim.file_path) ?? null : null,
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
      throw new Error(`A product with the slug "${data.slug}" already exists. Please choose a unique slug.`);
    }

    // 2. Uniqueness check for model_number / SKU
    const { data: existingModel } = await supabaseAdmin
      .from("outsoles")
      .select("id")
      .eq("model_number", data.model_number)
      .maybeSingle();

    if (existingModel) {
      throw new Error(`A product with the SKU / Model Number "${data.model_number}" already exists.`);
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
      throw new Error(`Failed to create product: ${insertError?.message ?? "Unknown database error"}`);
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
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens (e.g. trail-grip-x1)"),
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
  .validator((data: unknown) =>
    z.object({ id: z.string().uuid("Invalid product ID") }).parse(data),
  )
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
    const cats = ((row.outsole_categories ?? []) as any[])
      .map((c) => c.categories)
      .filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mats = ((row.outsole_materials ?? []) as any[])
      .map((m) => m.materials)
      .filter(Boolean);

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
      url: img.file_path ? urlMap.get(img.file_path) ?? null : null,
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
      throw new Error(`Failed to remove deselected associations from ${tableName}: ${delError.message}`);
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
      throw new Error(`A product with the slug "${data.slug}" already exists. Please choose a unique slug.`);
    }

    // 3. Uniqueness check for model_number / SKU (excluding current product)
    const { data: existingModel } = await supabaseAdmin
      .from("outsoles")
      .select("id")
      .eq("model_number", data.model_number)
      .neq("id", data.id)
      .maybeSingle();

    if (existingModel) {
      throw new Error(`A product with the SKU / Model Number "${data.model_number}" already exists.`);
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
        throw new Error(`A product with the slug "${data.slug}" already exists. Please choose a unique slug.`);
      }
      if (updateError?.code === "23505" || updateError?.message.includes("outsoles_model_number_key")) {
        throw new Error(`A product with the SKU / Model Number "${data.model_number}" already exists.`);
      }
      throw new Error(`Failed to update product: ${updateError?.message ?? "Unknown database error"}`);
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
