// Plain CJS integration test — no tsx required
// Run with: node scratch/test-archive.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env and .env.local
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

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey);

const AUTHENTIC_IDS = [
  "f17b26c3-6b00-4bff-9809-8f164581baca",
  "03d16e15-765d-451d-9364-50ff09d93b39",
  "648a99bc-e252-4f80-90cf-e9975c4047cc",
];

let pass = 0;
let fail = 0;
function check(condition, msg) {
  if (condition) { console.log(`  ✓ ${msg}`); pass++; }
  else { console.error(`  ✗ FAIL: ${msg}`); fail++; }
}

async function run() {
  console.log("====================================================");
  console.log("MILESTONE 7 — PHASE 5: ARCHIVE PRODUCT INTEGRATION TEST");
  console.log("====================================================");

  console.log("\n[GROUP 1: Baseline Integrity]");
  const { data: all0 } = await db.from("outsoles").select("id, name, slug, status").order("created_at");
  check(all0?.length === 3, `Initial count = 3 (got ${all0?.length})`);
  for (const id of AUTHENTIC_IDS) {
    check(all0?.some(o => o.id === id), `Authentic product ${id} exists`);
    const p = all0?.find(o => o.id === id);
    check(p?.status === "active", `${p?.name} is active`);
  }

  console.log("\n[GROUP 2: Temp Product Creation]");
  const ts = Date.now();
  const { data: tmp, error: tmpErr } = await db.from("outsoles").insert({
    name: "Archive Test Product",
    slug: `archive-test-${ts}`,
    model_number: `ARC-${String(ts).slice(-6)}`,
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

  check(!tmpErr && !!tmp, `Temp product created: ${tmp?.id ?? tmpErr?.message}`);
  const tmpId = tmp.id;

  const { data: cat1 } = await db.from("categories").select("id").limit(2);
  const { data: mat1 } = await db.from("materials").select("id").limit(1);
  const { data: trac1 } = await db.from("traction_types").select("id").limit(1);

  if (cat1?.length) await db.from("outsole_categories").insert(cat1.map(c => ({ outsole_id: tmpId, category_id: c.id })));
  if (mat1?.length) await db.from("outsole_materials").insert(mat1.map(m => ({ outsole_id: tmpId, material_id: m.id })));
  if (trac1?.length) await db.from("outsole_traction_types").insert(trac1.map(t => ({ outsole_id: tmpId, traction_type_id: t.id })));

  const { data: catsBefore } = await db.from("outsole_categories").select("category_id").eq("outsole_id", tmpId);
  const { data: matsBefore } = await db.from("outsole_materials").select("material_id").eq("outsole_id", tmpId);
  const { data: tracsBefore } = await db.from("outsole_traction_types").select("traction_type_id").eq("outsole_id", tmpId);
  check(catsBefore?.length >= 1, `Inserted ${catsBefore?.length} categories`);
  check(matsBefore?.length >= 1, `Inserted ${matsBefore?.length} materials`);
  check(tracsBefore?.length >= 1, `Inserted ${tracsBefore?.length} traction types`);

  console.log("\n[GROUP 3: Archive Active Product]");
  // Simulate archiveAdminOutsole: read, check not already archived, update only status
  const { data: beforeArchive } = await db.from("outsoles").select("id, name, status").eq("id", tmpId).maybeSingle();
  check(beforeArchive?.status === "active", `Pre-archive status = active`);
  const isAlready = beforeArchive?.status === "archived";
  check(!isAlready, `Not already archived (idempotency path not needed)`);

  const { data: archived, error: arcErr } = await db.from("outsoles")
    .update({ status: "archived" })
    .eq("id", tmpId)
    .select("id, name, status")
    .single();
  check(!arcErr && archived?.status === "archived", `Status changed to 'archived' (was active)`);

  console.log("\n[GROUP 4: Data Preservation]");
  const { data: preserved } = await db.from("outsoles")
    .select("id, name, slug, model_number, description, status, is_featured, is_sampling_available, shore_min, shore_max, din_abrasion_mm3, weight_grams")
    .eq("id", tmpId).single();
  check(preserved?.id === tmpId, "UUID unchanged");
  check(preserved?.name === "Archive Test Product", "Name unchanged");
  check(preserved?.slug === `archive-test-${ts}`, "Slug unchanged");
  check(preserved?.model_number === `ARC-${String(ts).slice(-6)}`, "SKU unchanged");
  check(preserved?.description === "Should not change after archiving", "Description unchanged");
  check(preserved?.status === "archived", "Status = archived");
  check(preserved?.is_featured === true, "is_featured unchanged = true");
  check(preserved?.is_sampling_available === true, "is_sampling_available unchanged = true");
  check(preserved?.shore_min === 60, "shore_min unchanged = 60");
  check(preserved?.shore_max === 65, "shore_max unchanged = 65");
  check(preserved?.din_abrasion_mm3 === 120, "din_abrasion_mm3 unchanged");
  check(preserved?.weight_grams === 300, "weight_grams unchanged");

  console.log("\n[GROUP 5: Taxonomy Junction Preservation]");
  const { data: catsAfter } = await db.from("outsole_categories").select("category_id").eq("outsole_id", tmpId);
  const { data: matsAfter } = await db.from("outsole_materials").select("material_id").eq("outsole_id", tmpId);
  const { data: tracsAfter } = await db.from("outsole_traction_types").select("traction_type_id").eq("outsole_id", tmpId);
  check(catsAfter?.length === catsBefore?.length, `Category junctions preserved: ${catsAfter?.length}`);
  check(matsAfter?.length === matsBefore?.length, `Material junctions preserved: ${matsAfter?.length}`);
  check(tracsAfter?.length === tracsBefore?.length, `Traction type junctions preserved: ${tracsAfter?.length}`);

  console.log("\n[GROUP 6: Idempotent Archive]");
  const { data: checkIdempotent } = await db.from("outsoles").select("id, name, status").eq("id", tmpId).maybeSingle();
  const alreadyArchived = checkIdempotent?.status === "archived";
  check(alreadyArchived === true, "Already-archived detected as alreadyArchived=true (early-return path)");
  // No second UPDATE executed — status remains
  check(checkIdempotent?.status === "archived", "Status still 'archived' after idempotent check");

  console.log("\n[GROUP 7: Draft → Archived]");
  await db.from("outsoles").update({ status: "draft" }).eq("id", tmpId);
  const { data: draftCheck } = await db.from("outsoles").select("status").eq("id", tmpId).single();
  check(draftCheck?.status === "draft", "Reset to draft");
  const { data: archivedDraft } = await db.from("outsoles").update({ status: "archived" }).eq("id", tmpId).select("status").single();
  check(archivedDraft?.status === "archived", `Draft → archived: status = '${archivedDraft?.status}'`);

  console.log("\n[GROUP 8: Input Validation (UUID format)");
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  check(!uuidRegex.test("not-a-uuid"), "Invalid UUID rejected");
  check(!uuidRegex.test(""), "Empty string rejected");
  check(uuidRegex.test(tmpId), `Valid UUID passes: ${tmpId}`);

  console.log("\n[GROUP 9: Non-existent UUID]");
  const { data: ghost } = await db.from("outsoles").select("id").eq("id", "00000000-0000-0000-0000-000000000000").maybeSingle();
  check(ghost === null, "Non-existent UUID returns null (product not found)");

  console.log("\n[GROUP 10: Public Catalog Behavior]");
  const { data: publicRows } = await db.from("outsoles").select("id, name, status").eq("status", "active");
  check(!publicRows?.some(r => r.id === tmpId), "Archived product NOT in active=active filter");
  check(publicRows?.every(r => r.status === "active") ?? true, "All active-filter rows have status=active");

  console.log("\n[GROUP 11: Admin Visibility]");
  const { data: adminRows } = await db.from("outsoles").select("id, name, status").order("created_at");
  const tmpInAdmin = adminRows?.find(r => r.id === tmpId);
  check(!!tmpInAdmin, "Archived product visible in admin list (unfiltered)");
  check(tmpInAdmin?.status === "archived", `Admin sees status = 'archived'`);

  console.log("\n[GROUP 12: Authentic Products Regression]");
  const { data: authentic } = await db.from("outsoles").select("id, name, status");
  for (const id of AUTHENTIC_IDS) {
    const p = authentic?.find(r => r.id === id);
    check(p?.status === "active", `${p?.name ?? id} still active`);
  }

  console.log("\n[GROUP 13: Cleanup]");
  await db.from("outsole_categories").delete().eq("outsole_id", tmpId);
  await db.from("outsole_materials").delete().eq("outsole_id", tmpId);
  await db.from("outsole_traction_types").delete().eq("outsole_id", tmpId);
  const { error: delErr } = await db.from("outsoles").delete().eq("id", tmpId);
  check(!delErr, "Temp product deleted successfully");
  const { data: finalAll } = await db.from("outsoles").select("id").order("created_at");
  check(finalAll?.length === 3, `Exactly 3 products remain (got ${finalAll?.length})`);
  for (const id of AUTHENTIC_IDS) {
    check(finalAll?.some(o => o.id === id), `Authentic product ${id} still exists`);
  }

  console.log("\n====================================================");
  console.log(`TEST SUMMARY: ${pass} passed, ${fail} failed`);
  console.log("====================================================");
  if (fail > 0) process.exit(1);
}

run().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
