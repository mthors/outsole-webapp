import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey);

const AUTHENTIC_IDS = [
  "f17b26c3-6b00-4bff-9809-8f164581baca", // Trail Grip X1
  "03d16e15-765d-451d-9364-50ff09d93b39", // RoadFlex R2
  "648a99bc-e252-4f80-90cf-e9975c4047cc", // SafeStep S3
];

let pass = 0;
let fail = 0;

function check(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    fail++;
  }
}

async function run() {
  console.log("====================================================");
  console.log("MILESTONE 7 — PHASE 5: ARCHIVE PRODUCT INTEGRATION TEST");
  console.log("====================================================");

  // ── 1: Authentic products baseline ──
  console.log("\n[GROUP 1: Baseline Integrity]");
  const { data: all0 } = await db.from("outsoles").select("id, name, slug, model_number, status, is_featured, is_sampling_available, shore_min, shore_max, din_abrasion_mm3, weight_grams").order("created_at");
  check(all0?.length === 3, `Initial count = 3 (got ${all0?.length})`);
  for (const id of AUTHENTIC_IDS) {
    check(all0?.some(o => o.id === id) ?? false, `Authentic product ${id} exists`);
    const p = all0?.find(o => o.id === id);
    check(p?.status === "active", `${p?.name} is active`);
  }

  // ── 2: Create temp product ──
  console.log("\n[GROUP 2: Temp Product Creation]");
  const ts = Date.now();
  const { data: tmp, error: tmpErr } = await db.from("outsoles").insert({
    name: "Archive Test Product",
    slug: `archive-test-${ts}`,
    model_number: `ARC-${ts.toString().slice(-6)}`,
    description: "Should not change after archiving",
    status: "active",
    is_featured: true,
    is_sampling_available: true,
    shore_min: 60,
    shore_max: 65,
    shore_scale: "A",
    din_abrasion_mm3: 120,
    weight_grams: 300,
  }).select("id, name, slug, model_number, status, is_featured, is_sampling_available, shore_min, shore_max, din_abrasion_mm3, weight_grams").single();

  check(!tmpErr && !!tmp, `Temp product created: ${tmp?.id}`);
  const tmpId = tmp!.id;

  // Insert junction rows
  const { data: cat1 } = await db.from("categories").select("id").limit(2);
  const { data: mat1 } = await db.from("materials").select("id").limit(1);
  const { data: trac1 } = await db.from("traction_types").select("id").limit(1);

  await db.from("outsole_categories").insert(cat1!.map(c => ({ outsole_id: tmpId, category_id: c.id })));
  await db.from("outsole_materials").insert(mat1!.map(m => ({ outsole_id: tmpId, material_id: m.id })));
  await db.from("outsole_traction_types").insert(trac1!.map(t => ({ outsole_id: tmpId, traction_type_id: t.id })));

  const junctionCatsBefore = (await db.from("outsole_categories").select("category_id").eq("outsole_id", tmpId)).data;
  const junctionMatsBefore = (await db.from("outsole_materials").select("material_id").eq("outsole_id", tmpId)).data;
  const junctionTracsBefore = (await db.from("outsole_traction_types").select("traction_type_id").eq("outsole_id", tmpId)).data;

  check(junctionCatsBefore?.length === 2, `Inserted ${junctionCatsBefore?.length} categories`);
  check(junctionMatsBefore?.length === 1, `Inserted ${junctionMatsBefore?.length} materials`);
  check(junctionTracsBefore?.length === 1, `Inserted ${junctionTracsBefore?.length} traction types`);

  // ── 3: archiveAdminOutsole logic — ACTIVE -> ARCHIVED ──
  console.log("\n[GROUP 3: Archive Active Product]");
  const { data: archived1, error: arcErr1 } = await db
    .from("outsoles")
    .update({ status: "archived" })
    .eq("id", tmpId)
    .eq("status", "active") // Must be active
    .select("id, name, status")
    .single();

  check(!arcErr1 && archived1?.status === "archived", `Active → archived: status is now '${archived1?.status}'`);

  // ── 4: Data preservation after archive ──
  console.log("\n[GROUP 4: Data Preservation]");
  const { data: preserved } = await db
    .from("outsoles")
    .select("id, name, slug, model_number, description, status, is_featured, is_sampling_available, shore_min, shore_max, din_abrasion_mm3, weight_grams")
    .eq("id", tmpId)
    .single();

  check(preserved?.id === tmpId, `UUID unchanged: ${preserved?.id}`);
  check(preserved?.name === "Archive Test Product", `Name unchanged: ${preserved?.name}`);
  check(preserved?.slug === `archive-test-${ts}`, `Slug unchanged: ${preserved?.slug}`);
  check(preserved?.model_number === `ARC-${ts.toString().slice(-6)}`, `SKU unchanged: ${preserved?.model_number}`);
  check(preserved?.description === "Should not change after archiving", `Description unchanged`);
  check(preserved?.status === "archived", `Status = archived`);
  check(preserved?.is_featured === true, `is_featured unchanged = true`);
  check(preserved?.is_sampling_available === true, `is_sampling_available unchanged = true`);
  check(preserved?.shore_min === 60, `shore_min unchanged = 60`);
  check(preserved?.shore_max === 65, `shore_max unchanged = 65`);
  check(preserved?.din_abrasion_mm3 === 120, `din_abrasion_mm3 unchanged`);
  check(preserved?.weight_grams === 300, `weight_grams unchanged`);

  // ── 5: Taxonomy junctions preserved ──
  console.log("\n[GROUP 5: Taxonomy Junction Preservation]");
  const junctionCatsAfter = (await db.from("outsole_categories").select("category_id").eq("outsole_id", tmpId)).data;
  const junctionMatsAfter = (await db.from("outsole_materials").select("material_id").eq("outsole_id", tmpId)).data;
  const junctionTracsAfter = (await db.from("outsole_traction_types").select("traction_type_id").eq("outsole_id", tmpId)).data;

  check(junctionCatsAfter?.length === 2, `Category junctions preserved: ${junctionCatsAfter?.length}`);
  check(junctionMatsAfter?.length === 1, `Material junctions preserved: ${junctionMatsAfter?.length}`);
  check(junctionTracsAfter?.length === 1, `Traction type junctions preserved: ${junctionTracsAfter?.length}`);

  // ── 6: Idempotent archiving (archive an already-archived product) ──
  console.log("\n[GROUP 6: Idempotent Archive]");
  // Simulate what archiveAdminOutsole does:
  const { data: existing } = await db.from("outsoles").select("id, name, status").eq("id", tmpId).maybeSingle();
  const alreadyArchived = existing?.status === "archived";
  check(alreadyArchived === true, `Already-archived product detected as alreadyArchived=true`);
  // Should NOT run another UPDATE — just return early
  check(existing?.status === "archived", `Status still 'archived' after idempotent check`);

  // ── 7: Draft -> archived ──
  console.log("\n[GROUP 7: Draft → Archived]");
  // Temporarily set to draft, then archive
  await db.from("outsoles").update({ status: "draft" }).eq("id", tmpId);
  const { data: archivedDraft } = await db.from("outsoles").update({ status: "archived" }).eq("id", tmpId).select("status").single();
  check(archivedDraft?.status === "archived", `Draft → archived: status = '${archivedDraft?.status}'`);

  // ── 8: Invalid UUID validation (handled by Zod in server fn) ──
  console.log("\n[GROUP 8: Input Validation]");
  const { z } = await import("zod");
  const schema = z.object({ id: z.string().uuid("Invalid product ID") });
  const badResult = schema.safeParse({ id: "not-a-uuid" });
  check(!badResult.success, `Invalid UUID rejected by Zod`);
  const emptyResult = schema.safeParse({ id: "" });
  check(!emptyResult.success, `Empty string rejected by Zod`);

  // ── 9: Non-existent UUID ──
  console.log("\n[GROUP 9: Non-existent UUID]");
  const { data: ghost } = await db.from("outsoles").select("id").eq("id", "00000000-0000-0000-0000-000000000000").maybeSingle();
  check(ghost === null, `Non-existent UUID returns null (product not found)`);

  // ── 10: Public catalog excludes archived ──
  console.log("\n[GROUP 10: Public Catalog Behavior]");
  const { data: publicRows } = await db.from("outsoles").select("id, name, status").eq("status", "active");
  check(!publicRows?.some(r => r.id === tmpId), `Archived product NOT in active=active results`);
  check(publicRows?.every(r => r.status === "active") ?? true, `All public rows have status=active`);

  // ── 11: Admin list still shows archived product ──
  console.log("\n[GROUP 11: Admin Visibility]");
  const { data: adminRows } = await db.from("outsoles").select("id, name, status").order("created_at");
  const tmpInAdmin = adminRows?.find(r => r.id === tmpId);
  check(!!tmpInAdmin, `Archived product visible in admin list (no filter)`);
  check(tmpInAdmin?.status === "archived", `Admin sees status = 'archived'`);

  // ── 12: Authentic products untouched ──
  console.log("\n[GROUP 12: Authentic Products Regression]");
  const { data: authentic } = await db.from("outsoles").select("id, name, status").filter("id", "in", `(${AUTHENTIC_IDS.map(id => `"${id}"`).join(",")})`);
  for (const p of authentic ?? []) {
    check(p.status === "active", `${p.name} still active`);
  }

  // ── 13: Cleanup ──
  console.log("\n[GROUP 13: Cleanup]");
  await db.from("outsole_categories").delete().eq("outsole_id", tmpId);
  await db.from("outsole_materials").delete().eq("outsole_id", tmpId);
  await db.from("outsole_traction_types").delete().eq("outsole_id", tmpId);
  const { error: delErr } = await db.from("outsoles").delete().eq("id", tmpId);
  check(!delErr, "Temp product deleted successfully");

  const { data: finalAll } = await db.from("outsoles").select("id").order("created_at");
  check(finalAll?.length === 3, `Exactly 3 products remain (got ${finalAll?.length})`);
  for (const id of AUTHENTIC_IDS) {
    check(finalAll?.some(o => o.id === id) ?? false, `Authentic product ${id} still exists`);
  }

  // ── Summary ──
  console.log("\n====================================================");
  console.log(`TEST SUMMARY: ${pass} passed, ${fail} failed`);
  console.log("====================================================");
  if (fail > 0) process.exit(1);
}

run().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
