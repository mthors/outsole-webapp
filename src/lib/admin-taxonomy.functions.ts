import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100, "Slug cannot exceed 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase alphanumeric characters and hyphens",
    ),
});

export const updateCategorySchema = categorySchema.extend({
  id: z.string().uuid("Invalid category ID"),
});

export const materialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Material name is required")
    .max(100, "Material name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const updateMaterialSchema = z.object({
  id: z.string().uuid("Invalid material ID"),
  name: z
    .string()
    .trim()
    .min(1, "Material name is required")
    .max(100, "Material name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const tractionTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Traction type name is required")
    .max(100, "Traction type name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const updateTractionTypeSchema = z.object({
  id: z.string().uuid("Invalid traction type ID"),
  name: z
    .string()
    .trim()
    .min(1, "Traction type name is required")
    .max(100, "Traction type name cannot exceed 100 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const deleteTaxonomySchema = z.object({
  id: z.string().uuid("Invalid ID"),
});

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  productCount: number;
};

export type MaterialItem = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  productCount: number;
};

export type TractionTypeItem = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  productCount: number;
};

export type AdminTaxonomyListResponse = {
  categories: CategoryItem[];
  materials: MaterialItem[];
  tractionTypes: TractionTypeItem[];
};

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Server function: List all categories, materials, and traction types with usage counts.
 */
export const getAdminTaxonomyList = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminTaxonomyListResponse> => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [categoriesRes, materialsRes, tractionRes, ocRes, omRes, otRes] = await Promise.all([
      supabaseAdmin.from("categories").select("id, name, slug, created_at").order("name", { ascending: true }),
      supabaseAdmin.from("materials").select("id, name, description, created_at").order("name", { ascending: true }),
      supabaseAdmin.from("traction_types").select("id, name, description, created_at").order("name", { ascending: true }),
      supabaseAdmin.from("outsole_categories").select("category_id"),
      supabaseAdmin.from("outsole_materials").select("material_id"),
      supabaseAdmin.from("outsole_traction_types").select("traction_type_id"),
    ]);

    if (categoriesRes.error) throw new Error(`Failed to fetch categories: ${categoriesRes.error.message}`);
    if (materialsRes.error) throw new Error(`Failed to fetch materials: ${materialsRes.error.message}`);
    if (tractionRes.error) throw new Error(`Failed to fetch traction types: ${tractionRes.error.message}`);

    const categoryCounts = new Map<string, number>();
    for (const r of ocRes.data ?? []) {
      categoryCounts.set(r.category_id, (categoryCounts.get(r.category_id) ?? 0) + 1);
    }

    const materialCounts = new Map<string, number>();
    for (const r of omRes.data ?? []) {
      materialCounts.set(r.material_id, (materialCounts.get(r.material_id) ?? 0) + 1);
    }

    const tractionCounts = new Map<string, number>();
    for (const r of otRes.data ?? []) {
      tractionCounts.set(r.traction_type_id, (tractionCounts.get(r.traction_type_id) ?? 0) + 1);
    }

    return {
      categories: (categoriesRes.data ?? []).map((c) => ({
        ...c,
        productCount: categoryCounts.get(c.id) ?? 0,
      })),
      materials: (materialsRes.data ?? []).map((m) => ({
        ...m,
        productCount: materialCounts.get(m.id) ?? 0,
      })),
      tractionTypes: (tractionRes.data ?? []).map((t) => ({
        ...t,
        productCount: tractionCounts.get(t.id) ?? 0,
      })),
    };
  },
);

// ────────────────────────────────────────────────────────────────────────────
// Categories Mutations
// ────────────────────────────────────────────────────────────────────────────

export const createAdminCategory = createServerFn({ method: "POST" })
  .validator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check duplicate name
    const { data: existingName } = await supabaseAdmin
      .from("categories")
      .select("id")
      .ilike("name", data.name)
      .maybeSingle();
    if (existingName) {
      throw new Error(`A category with the name "${data.name}" already exists.`);
    }

    // Check duplicate slug
    const { data: existingSlug } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existingSlug) {
      throw new Error(`A category with the slug "${data.slug}" already exists.`);
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("categories")
      .insert({
        name: data.name,
        slug: data.slug,
      })
      .select()
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create category: ${error?.message ?? "Unknown database error"}`);
    }

    return { success: true, category: inserted };
  });

export const updateAdminCategory = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateCategorySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check duplicate name excluding self
    const { data: existingName } = await supabaseAdmin
      .from("categories")
      .select("id")
      .ilike("name", data.name)
      .neq("id", data.id)
      .maybeSingle();
    if (existingName) {
      throw new Error(`A category with the name "${data.name}" already exists.`);
    }

    // Check duplicate slug excluding self
    const { data: existingSlug } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("slug", data.slug)
      .neq("id", data.id)
      .maybeSingle();
    if (existingSlug) {
      throw new Error(`A category with the slug "${data.slug}" already exists.`);
    }

    const { data: updated, error } = await supabaseAdmin
      .from("categories")
      .update({
        name: data.name,
        slug: data.slug,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update category: ${error?.message ?? "Unknown database error"}`);
    }

    return { success: true, category: updated };
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteTaxonomySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check existence
    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("id", data.id)
      .maybeSingle();
    if (!cat) {
      throw new Error("Category not found.");
    }

    // Guard against deleting in-use taxonomy records
    const { count } = await supabaseAdmin
      .from("outsole_categories")
      .select("*", { count: "exact", head: true })
      .eq("category_id", data.id);

    if (count && count > 0) {
      throw new Error(
        `Cannot delete category "${cat.name}" because it is currently assigned to ${count} product(s). Please unassign it from all products first.`,
      );
    }

    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    return { success: true };
  });

// ────────────────────────────────────────────────────────────────────────────
// Materials Mutations
// ────────────────────────────────────────────────────────────────────────────

export const createAdminMaterial = createServerFn({ method: "POST" })
  .validator((data: unknown) => materialSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check duplicate name
    const { data: existingName } = await supabaseAdmin
      .from("materials")
      .select("id")
      .ilike("name", data.name)
      .maybeSingle();
    if (existingName) {
      throw new Error(`A material with the name "${data.name}" already exists.`);
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("materials")
      .insert({
        name: data.name,
        description: data.description,
      })
      .select()
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create material: ${error?.message ?? "Unknown database error"}`);
    }

    return { success: true, material: inserted };
  });

export const updateAdminMaterial = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateMaterialSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check duplicate name excluding self
    const { data: existingName } = await supabaseAdmin
      .from("materials")
      .select("id")
      .ilike("name", data.name)
      .neq("id", data.id)
      .maybeSingle();
    if (existingName) {
      throw new Error(`A material with the name "${data.name}" already exists.`);
    }

    const { data: updated, error } = await supabaseAdmin
      .from("materials")
      .update({
        name: data.name,
        description: data.description,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update material: ${error?.message ?? "Unknown database error"}`);
    }

    return { success: true, material: updated };
  });

export const deleteAdminMaterial = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteTaxonomySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check existence
    const { data: mat } = await supabaseAdmin
      .from("materials")
      .select("id, name")
      .eq("id", data.id)
      .maybeSingle();
    if (!mat) {
      throw new Error("Material not found.");
    }

    // Guard against deleting in-use taxonomy records
    const { count } = await supabaseAdmin
      .from("outsole_materials")
      .select("*", { count: "exact", head: true })
      .eq("material_id", data.id);

    if (count && count > 0) {
      throw new Error(
        `Cannot delete material "${mat.name}" because it is currently assigned to ${count} product(s). Please unassign it from all products first.`,
      );
    }

    const { error } = await supabaseAdmin.from("materials").delete().eq("id", data.id);
    if (error) {
      throw new Error(`Failed to delete material: ${error.message}`);
    }

    return { success: true };
  });

// ────────────────────────────────────────────────────────────────────────────
// Traction Types Mutations
// ────────────────────────────────────────────────────────────────────────────

export const createAdminTractionType = createServerFn({ method: "POST" })
  .validator((data: unknown) => tractionTypeSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check duplicate name
    const { data: existingName } = await supabaseAdmin
      .from("traction_types")
      .select("id")
      .ilike("name", data.name)
      .maybeSingle();
    if (existingName) {
      throw new Error(`A traction type with the name "${data.name}" already exists.`);
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("traction_types")
      .insert({
        name: data.name,
        description: data.description,
      })
      .select()
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create traction type: ${error?.message ?? "Unknown database error"}`);
    }

    return { success: true, tractionType: inserted };
  });

export const updateAdminTractionType = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateTractionTypeSchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check duplicate name excluding self
    const { data: existingName } = await supabaseAdmin
      .from("traction_types")
      .select("id")
      .ilike("name", data.name)
      .neq("id", data.id)
      .maybeSingle();
    if (existingName) {
      throw new Error(`A traction type with the name "${data.name}" already exists.`);
    }

    const { data: updated, error } = await supabaseAdmin
      .from("traction_types")
      .update({
        name: data.name,
        description: data.description,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update traction type: ${error?.message ?? "Unknown database error"}`);
    }

    return { success: true, tractionType: updated };
  });

export const deleteAdminTractionType = createServerFn({ method: "POST" })
  .validator((data: unknown) => deleteTaxonomySchema.parse(data))
  .handler(async ({ data }) => {
    const { assertStaffRole } = await import("./admin-auth.server");
    await assertStaffRole();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check existence
    const { data: trac } = await supabaseAdmin
      .from("traction_types")
      .select("id, name")
      .eq("id", data.id)
      .maybeSingle();
    if (!trac) {
      throw new Error("Traction type not found.");
    }

    // Guard against deleting in-use taxonomy records
    const { count } = await supabaseAdmin
      .from("outsole_traction_types")
      .select("*", { count: "exact", head: true })
      .eq("traction_type_id", data.id);

    if (count && count > 0) {
      throw new Error(
        `Cannot delete traction type "${trac.name}" because it is currently assigned to ${count} product(s). Please unassign it from all products first.`,
      );
    }

    const { error } = await supabaseAdmin.from("traction_types").delete().eq("id", data.id);
    if (error) {
      throw new Error(`Failed to delete traction type: ${error.message}`);
    }

    return { success: true };
  });
