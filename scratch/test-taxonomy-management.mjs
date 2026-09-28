// Milestone 8 — Phase 8A: Taxonomy Management Integration & Regression Test Suite
// Run with: node --env-file=.env.local --env-file=.env scratch/test-taxonomy-management.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(p) {
  let content = "";
  try { content = readFileSync(p, "utf-8"); } catch { return; }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= val;
  }
}
loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

const AUTHENTIC_IDS = [
  "f17b26c3-6b00-4bff-9809-8f164581baca",
  "03d16e15-765d-451d-9364-50ff09d93b39",
  "648a99bc-e252-4f80-90cf-e9975c4047cc",
];

let pass = 0;
let fail = 0;
function check(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    fail++;
  }
}

async function runTaxonomyTests() {
  console.log("==================================================================");
  console.log("MILESTONE 8 — PHASE 8A: TAXONOMY MANAGEMENT INTEGRATION TESTS");
  console.log("==================================================================");

  const {
    categorySchema,
    materialSchema,
    tractionTypeSchema,
    updateCategorySchema,
    updateMaterialSchema,
    updateTractionTypeSchema,
  } = await import("../src/lib/admin-taxonomy.functions.ts");

  const { fetchTaxonomy, fetchActiveOutsoles } = await import(
    "../src/lib/public-catalog.server.ts"
  );

  // -------------------------------------------------------------
  // GROUP 1: Baseline & Authentic Products Safety
  // -------------------------------------------------------------
  console.log("\n[GROUP 1: Baseline & Authentic Products Safety]");
  const { data: dbOutsoles, error: outsolesErr } = await adminClient
    .from("outsoles")
    .select("id, name, slug, status")
    .in("id", AUTHENTIC_IDS);
  check(!outsolesErr, "Queried authentic outsoles successfully");
  check(dbOutsoles?.length === 3, "Exactly 3 authentic production products exist");
  check(
    dbOutsoles?.every((o) => o.status === "active"),
    "All authentic products are active",
  );

  const baselineTaxonomy = await fetchTaxonomy();
  check(baselineTaxonomy.categories.length === 8, "Baseline categories count is exactly 8");
  check(baselineTaxonomy.materials.length === 7, "Baseline materials count is exactly 7");
  check(baselineTaxonomy.tractionTypes.length === 9, "Baseline traction types count is exactly 9");

  // -------------------------------------------------------------
  // GROUP 2: Validation Schemas
  // -------------------------------------------------------------
  console.log("\n[GROUP 2: Validation Schemas]");
  // Categories
  check(categorySchema.safeParse({ name: "Running", slug: "running" }).success, "Valid category accepted");
  check(!categorySchema.safeParse({ name: "", slug: "running" }).success, "Empty category name rejected");
  check(!categorySchema.safeParse({ name: "Running", slug: "" }).success, "Empty category slug rejected");
  check(!categorySchema.safeParse({ name: "Running", slug: "Running Upper" }).success, "Invalid slug format rejected");

  // Materials
  check(materialSchema.safeParse({ name: "Carbon Foam", description: "Ultra-light" }).success, "Valid material accepted");
  check(materialSchema.safeParse({ name: "Pure Rubber" }).success, "Material without description accepted");
  check(!materialSchema.safeParse({ name: "" }).success, "Empty material name rejected");

  // Traction Types
  check(tractionTypeSchema.safeParse({ name: "Mud Spike", description: "Soft ground" }).success, "Valid traction type accepted");
  check(!tractionTypeSchema.safeParse({ name: "" }).success, "Empty traction type name rejected");

  // -------------------------------------------------------------
  // GROUP 3: Categories CRUD & Safe Delete
  // -------------------------------------------------------------
  console.log("\n[GROUP 3: Categories CRUD & Safe Delete]");
  const testCatId = "00000000-0000-0000-0000-0000000000c1";
  const testCatName = "Audit Category Test";
  const testCatSlug = "audit-category-test";

  // Create
  const { data: createdCat, error: catInsErr } = await adminClient
    .from("categories")
    .insert({ id: testCatId, name: testCatName, slug: testCatSlug })
    .select()
    .single();
  check(!catInsErr && createdCat?.id === testCatId, "Created new category successfully");

  // Duplicate name check (case-insensitive query logic)
  const { data: dupCatName } = await adminClient
    .from("categories")
    .select("id")
    .ilike("name", testCatName.toLowerCase());
  check((dupCatName?.length ?? 0) >= 1, "Duplicate category name detection logic identifies existing record");

  // Duplicate slug check
  const { data: dupCatSlug } = await adminClient
    .from("categories")
    .select("id")
    .eq("slug", testCatSlug);
  check(dupCatSlug?.length === 1, "Duplicate category slug detection logic identifies existing record");

  // Edit
  const editedCatName = "Audit Category Test (Edited)";
  const editedCatSlug = "audit-category-test-edited";
  const { data: updatedCat, error: catUpdErr } = await adminClient
    .from("categories")
    .update({ name: editedCatName, slug: editedCatSlug })
    .eq("id", testCatId)
    .select()
    .single();
  check(!catUpdErr && updatedCat?.name === editedCatName, "Updated category name and slug successfully");

  // Safe Delete Guard: Assign to a temporary product and attempt delete
  const tempProdId = "00000000-0000-0000-0000-0000000000b1";
  await adminClient.from("outsoles").insert({
    id: tempProdId,
    name: "Temp Product For Taxonomy",
    slug: "temp-product-for-taxonomy-" + Date.now(),
    model_number: "TMP-TAX-01",
    status: "draft",
  });
  await adminClient.from("outsole_categories").insert({
    outsole_id: tempProdId,
    category_id: testCatId,
  });

  // Verify deletion guard triggers when in-use
  const { count: catUsage } = await adminClient
    .from("outsole_categories")
    .select("*", { count: "exact", head: true })
    .eq("category_id", testCatId);
  check((catUsage ?? 0) > 0, "Category usage count correctly reports active assignment");

  // Unassign from temporary product
  await adminClient.from("outsole_categories").delete().eq("category_id", testCatId);
  const { count: catUsageAfter } = await adminClient
    .from("outsole_categories")
    .select("*", { count: "exact", head: true })
    .eq("category_id", testCatId);
  check(catUsageAfter === 0, "Category unassigned, usage count is now 0");

  // Now delete succeeds safely
  const { error: catDelErr } = await adminClient.from("categories").delete().eq("id", testCatId);
  check(!catDelErr, "Category safely deleted when not assigned to any product");

  // -------------------------------------------------------------
  // GROUP 4: Materials CRUD & Safe Delete
  // -------------------------------------------------------------
  console.log("\n[GROUP 4: Materials CRUD & Safe Delete]");
  const testMatId = "00000000-0000-0000-0000-0000000000b2";
  const testMatName = "Audit Material Test";
  const testMatDesc = "Synthetic bio-foam prototype.";

  // Create
  const { data: createdMat, error: matInsErr } = await adminClient
    .from("materials")
    .insert({ id: testMatId, name: testMatName, description: testMatDesc })
    .select()
    .single();
  check(!matInsErr && createdMat?.id === testMatId, "Created new material successfully");

  // Edit
  const editedMatName = "Audit Material Test (Edited)";
  const editedMatDesc = "Updated description for bio-foam.";
  const { data: updatedMat, error: matUpdErr } = await adminClient
    .from("materials")
    .update({ name: editedMatName, description: editedMatDesc })
    .eq("id", testMatId)
    .select()
    .single();
  check(!matUpdErr && updatedMat?.name === editedMatName, "Updated material successfully");

  // Assign to temp product
  await adminClient.from("outsole_materials").insert({
    outsole_id: tempProdId,
    material_id: testMatId,
  });
  const { count: matUsage } = await adminClient
    .from("outsole_materials")
    .select("*", { count: "exact", head: true })
    .eq("material_id", testMatId);
  check((matUsage ?? 0) > 0, "Material usage count correctly detects product assignment");

  // Unassign and delete
  await adminClient.from("outsole_materials").delete().eq("material_id", testMatId);
  const { error: matDelErr } = await adminClient.from("materials").delete().eq("id", testMatId);
  check(!matDelErr, "Material safely deleted after being unassigned");

  // -------------------------------------------------------------
  // GROUP 5: Traction Types CRUD & Safe Delete
  // -------------------------------------------------------------
  console.log("\n[GROUP 5: Traction Types CRUD & Safe Delete]");
  const testTracId = "00000000-0000-0000-0000-0000000000b3";
  const testTracName = "Audit Traction Test";
  const testTracDesc = "Hexagonal suction studs for polished surfaces.";

  // Create
  const { data: createdTrac, error: tracInsErr } = await adminClient
    .from("traction_types")
    .insert({ id: testTracId, name: testTracName, description: testTracDesc })
    .select()
    .single();
  check(!tracInsErr && createdTrac?.id === testTracId, "Created new traction type successfully");

  // Edit
  const editedTracName = "Audit Traction Test (Edited)";
  const editedTracDesc = "Updated hexagonal studs.";
  const { data: updatedTrac, error: tracUpdErr } = await adminClient
    .from("traction_types")
    .update({ name: editedTracName, description: editedTracDesc })
    .eq("id", testTracId)
    .select()
    .single();
  check(!tracUpdErr && updatedTrac?.name === editedTracName, "Updated traction type successfully");

  // Assign to temp product
  await adminClient.from("outsole_traction_types").insert({
    outsole_id: tempProdId,
    traction_type_id: testTracId,
  });
  const { count: tracUsage } = await adminClient
    .from("outsole_traction_types")
    .select("*", { count: "exact", head: true })
    .eq("traction_type_id", testTracId);
  check((tracUsage ?? 0) > 0, "Traction type usage count correctly detects product assignment");

  // Unassign and delete
  await adminClient.from("outsole_traction_types").delete().eq("traction_type_id", testTracId);
  const { error: tracDelErr } = await adminClient.from("traction_types").delete().eq("id", testTracId);
  check(!tracDelErr, "Traction type safely deleted after being unassigned");

  // Clean up temporary product
  await adminClient.from("outsoles").delete().eq("id", tempProdId);

  // -------------------------------------------------------------
  // GROUP 6: Dynamic Public Catalog Integration
  // -------------------------------------------------------------
  console.log("\n[GROUP 6: Dynamic Public Catalog Integration]");
  // Create a new taxonomy item
  const liveCatId = "00000000-0000-0000-0000-0000000000b4";
  const liveCatSlug = "winter-specialist";
  await adminClient.from("categories").insert({
    id: liveCatId,
    name: "Winter Specialist",
    slug: liveCatSlug,
  });

  try {
    // 1. Appears in fetchTaxonomy (used by public catalog filters & admin selectors)
    const updatedTax = await fetchTaxonomy();
    const foundInTax = updatedTax.categories.find((c) => c.slug === liveCatSlug);
    check(Boolean(foundInTax), "Newly created category immediately appears in fetchTaxonomy()");

    // 2. Create active test product with this category
    const liveProdId = "00000000-0000-0000-0000-0000000000b5";
    await adminClient.from("outsoles").insert({
      id: liveProdId,
      name: "Winter Grip Pro",
      slug: "winter-grip-pro-" + Date.now(),
      model_number: "OUT-WINT-99",
      status: "active",
    });
    await adminClient.from("outsole_categories").insert({
      outsole_id: liveProdId,
      category_id: liveCatId,
    });

    // 3. Appears in public catalog query
    const activeCatalog = await fetchActiveOutsoles();
    const foundActiveProd = activeCatalog.find((p) => p.id === liveProdId);
    check(Boolean(foundActiveProd), "Product with new category appears in public active catalog");
    check(
      foundActiveProd?.categories.some((c) => c.slug === liveCatSlug),
      "Product in public catalog has new category attached",
    );

    // 4. Clean up test active product
    await adminClient.from("outsole_categories").delete().eq("outsole_id", liveProdId);
    await adminClient.from("outsoles").delete().eq("id", liveProdId);
  } finally {
    await adminClient.from("categories").delete().eq("id", liveCatId);
  }

  // -------------------------------------------------------------
  // GROUP 7: Authentic Production Products Integrity Check
  // -------------------------------------------------------------
  console.log("\n[GROUP 7: Authentic Production Products Integrity Check]");
  const { data: finalOutsoles } = await adminClient
    .from("outsoles")
    .select("id, name, slug, status");
  check(
    finalOutsoles?.length === 3,
    `Exactly 3 outsoles remain in database (found ${finalOutsoles?.length})`,
  );
  check(
    finalOutsoles?.every((o) => AUTHENTIC_IDS.includes(o.id)),
    "All outsoles are the original authentic production products",
  );

  const finalTax = await fetchTaxonomy();
  check(finalTax.categories.length === 8, "Categories restored to authentic 8 rows");
  check(finalTax.materials.length === 7, "Materials restored to authentic 7 rows");
  check(finalTax.tractionTypes.length === 9, "Traction types restored to authentic 9 rows");

  // -------------------------------------------------------------
  // GROUP 8: Authorization & RLS Protection Checks
  // -------------------------------------------------------------
  console.log("\n[GROUP 8: Authorization & RLS Protection Checks]");

  // 1. Anonymous client cannot insert into categories
  const { error: anonCatInsErr } = await anonClient
    .from("categories")
    .insert({ name: "Hacker Category", slug: "hacker-cat" });
  check(Boolean(anonCatInsErr), "Postgres RLS blocks unauthenticated insert into categories");

  // 2. Anonymous client cannot update categories (affects 0 rows under RLS)
  const { data: anonCatUpdData } = await anonClient
    .from("categories")
    .update({ name: "Hacked Category" })
    .eq("id", baselineTaxonomy.categories[0].id)
    .select();
  check((anonCatUpdData?.length ?? 0) === 0, "Postgres RLS blocks unauthenticated update on categories (0 rows affected)");

  // 3. Anonymous client cannot delete categories (affects 0 rows under RLS)
  const { data: anonCatDelData } = await anonClient
    .from("categories")
    .delete()
    .eq("id", baselineTaxonomy.categories[0].id)
    .select();
  check((anonCatDelData?.length ?? 0) === 0, "Postgres RLS blocks unauthenticated delete on categories (0 rows affected)");

  // 4. Anonymous client cannot insert into materials
  const { error: anonMatInsErr } = await anonClient
    .from("materials")
    .insert({ name: "Hacker Material" });
  check(Boolean(anonMatInsErr), "Postgres RLS blocks unauthenticated insert into materials");

  // 5. Anonymous client cannot insert into traction_types
  const { error: anonTracInsErr } = await anonClient
    .from("traction_types")
    .insert({ name: "Hacker Traction" });
  check(Boolean(anonTracInsErr), "Postgres RLS blocks unauthenticated insert into traction_types");

  console.log("\n==================================================================");
  console.log(`TOTAL CHECKS: ${pass + fail} | PASSED: ${pass} | FAILED: ${fail}`);
  console.log("==================================================================\n");

  if (fail > 0) process.exit(1);
}

runTaxonomyTests().catch((err) => {
  console.error("Taxonomy test suite failed with error:", err);
  process.exit(1);
});
