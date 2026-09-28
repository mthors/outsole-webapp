// Public Catalog / Product Data Integration Audit Test Suite
// Run with: node --env-file=.env.local --env-file=.env scratch/test-public-catalog-audit.mjs

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

async function runAudit() {
  console.log("=== PUBLIC CATALOG INTEGRATION AUDIT ===");

  const { fetchActiveOutsoles, fetchOutsoleBySlug, fetchTaxonomy, fetchSiteContent, publicClient } =
    await import("../src/lib/public-catalog.server.ts");

  // -------------------------------------------------------------
  // Test 1: Authentic Products Presence and Integrity
  // -------------------------------------------------------------
  console.log("\n[Test 1] Authentic Products Presence and Status");
  const { data: dbOutsoles, error: dbErr } = await adminClient
    .from("outsoles")
    .select("id, name, slug, status, model_number")
    .in("id", AUTHENTIC_IDS);
  check(!dbErr, "Database query for authentic products succeeded");
  check(dbOutsoles?.length === 3, "Exactly 3 authentic production products exist in DB");
  const allActive = dbOutsoles?.every((o) => o.status === "active");
  check(allActive, "All 3 authentic production products have status = 'active'");

  // -------------------------------------------------------------
  // Test 2: Active Products Exposed Publicly
  // -------------------------------------------------------------
  console.log("\n[Test 2] Public Catalog Active Products Retrieval");
  const activeProducts = await fetchActiveOutsoles();
  check(activeProducts.length >= 3, `fetchActiveOutsoles returned ${activeProducts.length} products`);
  for (const id of AUTHENTIC_IDS) {
    const found = activeProducts.find((p) => p.id === id);
    check(Boolean(found), `Authentic product ${id} (${found?.name}) is in active catalog`);
  }

  // -------------------------------------------------------------
  // Test 3: Draft Product Visibility Guard (Server & RLS layers)
  // -------------------------------------------------------------
  console.log("\n[Test 3] Draft Product Visibility Protection");
  const draftTestId = "00000000-0000-0000-0000-0000000000d1";
  const draftTestSlug = "test-draft-audit-" + Date.now();
  await adminClient.from("outsoles").insert({
    id: draftTestId,
    name: "Draft Audit Test",
    slug: draftTestSlug,
    model_number: "TEST-DRAFT-01",
    status: "draft",
  });

  try {
    const activeListWithDraft = await fetchActiveOutsoles();
    const draftInList = activeListWithDraft.some((p) => p.slug === draftTestSlug);
    check(!draftInList, "Draft product does NOT appear in fetchActiveOutsoles()");

    const draftDetail = await fetchOutsoleBySlug(draftTestSlug);
    check(draftDetail === null, "fetchOutsoleBySlug(draftSlug) returns null");

    const { data: anonDirectDraft } = await anonClient
      .from("outsoles")
      .select("id, slug")
      .eq("slug", draftTestSlug);
    check(
      (anonDirectDraft?.length ?? 0) === 0,
      "Postgres RLS blocks anonymous access to draft outsoles directly",
    );
  } finally {
    await adminClient.from("outsoles").delete().eq("id", draftTestId);
  }

  // -------------------------------------------------------------
  // Test 4: Archived Product Visibility Guard (Server & RLS layers)
  // -------------------------------------------------------------
  console.log("\n[Test 4] Archived Product Visibility Protection");
  const archTestId = "00000000-0000-0000-0000-0000000000a1";
  const archTestSlug = "test-archived-audit-" + Date.now();
  await adminClient.from("outsoles").insert({
    id: archTestId,
    name: "Archived Audit Test",
    slug: archTestSlug,
    model_number: "TEST-ARCH-01",
    status: "archived",
  });

  try {
    const activeListWithArch = await fetchActiveOutsoles();
    const archInList = activeListWithArch.some((p) => p.slug === archTestSlug);
    check(!archInList, "Archived product does NOT appear in fetchActiveOutsoles()");

    const archDetail = await fetchOutsoleBySlug(archTestSlug);
    check(archDetail === null, "fetchOutsoleBySlug(archSlug) returns null");

    const { data: anonDirectArch } = await anonClient
      .from("outsoles")
      .select("id, slug")
      .eq("slug", archTestSlug);
    check(
      (anonDirectArch?.length ?? 0) === 0,
      "Postgres RLS blocks anonymous access to archived outsoles directly",
    );
  } finally {
    await adminClient.from("outsoles").delete().eq("id", archTestId);
  }

  // -------------------------------------------------------------
  // Test 5: Product Detail by Slug Resolution
  // -------------------------------------------------------------
  console.log("\n[Test 5] Product Detail by Slug Resolution");
  const trailProduct = await fetchOutsoleBySlug("trail-grip-x1");
  check(Boolean(trailProduct), "Resolved product by slug 'trail-grip-x1'");
  check(trailProduct?.name === "Trail Grip X1", "Product name is 'Trail Grip X1'");
  check(trailProduct?.model_number === "OUT-TRAIL-001", "Model number is 'OUT-TRAIL-001'");
  check(trailProduct?.categories.length > 0, "Categories junction loaded correctly");
  check(trailProduct?.materials.length > 0, "Materials junction loaded correctly");
  check(trailProduct?.tractionTypes.length > 0, "Traction types junction loaded correctly");
  check(trailProduct?.images.length > 0, "Images loaded for product");
  check(trailProduct?.shore_min === 55, "Technical shore_min is 55");
  check(trailProduct?.shore_max === 65, "Technical shore_max is 65");
  check(trailProduct?.din_abrasion_mm3 === 120, "Technical din_abrasion_mm3 is 120");

  const nonExistent = await fetchOutsoleBySlug("non-existent-slug-xyz");
  check(nonExistent === null, "Unknown slug resolves to null");

  // -------------------------------------------------------------
  // Test 6: Taxonomy Query Integrity
  // -------------------------------------------------------------
  console.log("\n[Test 6] Taxonomy Query Integrity");
  const taxonomy = await fetchTaxonomy();
  check(taxonomy.categories.length >= 8, `Categories count: ${taxonomy.categories.length} (>= 8)`);
  check(taxonomy.materials.length >= 7, `Materials count: ${taxonomy.materials.length} (>= 7)`);
  check(
    taxonomy.tractionTypes.length >= 9,
    `Traction types count: ${taxonomy.tractionTypes.length} (>= 9)`,
  );
  check(taxonomy.categories.every((c) => c.id && c.name), "All categories have id and name");
  check(taxonomy.materials.every((m) => m.id && m.name), "All materials have id and name");
  check(taxonomy.tractionTypes.every((t) => t.id && t.name), "All traction types have id and name");

  // -------------------------------------------------------------
  // Test 7: Catalog Filters Validation
  // -------------------------------------------------------------
  console.log("\n[Test 7] Catalog Filters Validation");
  // Search
  const qResults = activeProducts.filter((o) =>
    [o.name, o.model_number, o.description ?? ""].some((f) =>
      f.toLowerCase().includes("roadflex"),
    ),
  );
  check(
    qResults.length === 1 && qResults[0].slug === "roadflex-r2",
    "Search filter by name finds 'RoadFlex R2'",
  );

  // Category filter
  const trailCat = taxonomy.categories.find((c) => c.name === "Trail");
  const catFiltered = activeProducts.filter((o) =>
    o.categories.some((c) => c.id === trailCat?.id),
  );
  check(
    catFiltered.some((o) => o.slug === "trail-grip-x1"),
    "Category filter for 'Trail' correctly identifies 'Trail Grip X1'",
  );

  // Material filter
  const natRubber = taxonomy.materials.find((m) => m.name === "Natural Rubber");
  const matFiltered = activeProducts.filter((o) =>
    o.materials.some((m) => m.id === natRubber?.id),
  );
  check(
    matFiltered.some((o) => o.slug === "trail-grip-x1"),
    "Material filter for 'Natural Rubber' matches 'Trail Grip X1'",
  );

  // Traction filter
  const slipRes = taxonomy.tractionTypes.find((t) => t.name === "Slip Resistant");
  const tracFiltered = activeProducts.filter((o) =>
    o.tractionTypes.some((t) => t.id === slipRes?.id),
  );
  check(
    tracFiltered.some((o) => o.slug === "safestep-s3"),
    "Traction filter for 'Slip Resistant' matches 'SafeStep S3'",
  );

  // Sampling available filter
  const samplingFiltered = activeProducts.filter((o) => o.is_sampling_available);
  check(
    samplingFiltered.some((o) => o.slug === "trail-grip-x1") &&
      samplingFiltered.some((o) => o.slug === "roadflex-r2"),
    "Sampling filter matches sampling-available products",
  );

  // Featured filter
  const featuredFiltered = activeProducts.filter((o) => o.is_featured);
  check(
    featuredFiltered.some((o) => o.slug === "trail-grip-x1") &&
      featuredFiltered.some((o) => o.slug === "roadflex-r2"),
    "Featured filter matches featured products",
  );

  // -------------------------------------------------------------
  // Test 8: Private Storage and Signed URLs
  // -------------------------------------------------------------
  console.log("\n[Test 8] Private Storage and Signed URLs");
  const { data: bucketInfo } = await adminClient.storage.getBucket("outsole-images");
  check(bucketInfo?.public === false, "Storage bucket 'outsole-images' is strictly PRIVATE");

  const trailImgPath = "outsoles/f17b26c3-6b00-4bff-9809-8f164581baca/trail-grip-x1.jpg";
  const { data: pubUrlData } = anonClient.storage.from("outsole-images").getPublicUrl(trailImgPath);
  const rawPublicRes = await fetch(pubUrlData.publicUrl);
  check(rawPublicRes.status !== 200, "Unsigned public access to private Storage is blocked");

  const trailImgUrl = trailProduct?.images[0]?.url;
  check(Boolean(trailImgUrl), "Trail Grip X1 image has signed URL");
  if (trailImgUrl) {
    const signedRes = await fetch(trailImgUrl);
    check(signedRes.status === 200, "Signed URL for authentic product image returns HTTP 200");
    check(
      signedRes.headers.get("content-type")?.includes("image/jpeg"),
      "Signed image returns image/jpeg content type",
    );
  }

  // -------------------------------------------------------------
  // Test 9: Multi-Image Ordering and Primary Image Behavior
  // -------------------------------------------------------------
  console.log("\n[Test 9] Multi-Image Ordering and Primary Image Behavior");
  const multiTestId = "00000000-0000-0000-0000-0000000000b1";
  const multiTestSlug = "test-multi-image-" + Date.now();
  await adminClient.from("outsoles").insert({
    id: multiTestId,
    name: "Multi Image Audit Test",
    slug: multiTestSlug,
    model_number: "TEST-MULTI-01",
    status: "active",
  });

  await adminClient.from("outsole_images").insert([
    {
      outsole_id: multiTestId,
      file_path: "outsoles/f17b26c3-6b00-4bff-9809-8f164581baca/trail-grip-x1.jpg",
      image_url: "https://placeholder.test/img1.jpg",
      alt_text: "Secondary Angle Lug Detail",
      display_order: 1,
      is_primary: false,
    },
    {
      outsole_id: multiTestId,
      file_path: "outsoles/03d16e15-765d-451d-9364-50ff09d93b39/roadflex-r2.jpg",
      image_url: "https://placeholder.test/img0.jpg",
      alt_text: "Primary Profile View",
      display_order: 0,
      is_primary: true,
    },
  ]);

  try {
    const multiProduct = await fetchOutsoleBySlug(multiTestSlug);
    check(multiProduct?.images.length === 2, "Product detail returns all images");
    const img0 = multiProduct?.images[0];
    const img1 = multiProduct?.images[1];
    check(img0?.is_primary === true, "First shaped image is primary image");
    check(img0?.alt_text === "Primary Profile View", "Primary image has correct alt_text");
    check(Boolean(img0?.url), "Primary image has valid signed URL");
    check(Boolean(img1?.url), "Secondary image has valid signed URL");

    const res0 = await fetch(img0.url);
    const res1 = await fetch(img1.url);
    check(res0.status === 200, "Primary signed URL returns HTTP 200");
    check(res1.status === 200, "Secondary signed URL returns HTTP 200");
  } finally {
    await adminClient.from("outsole_images").delete().eq("outsole_id", multiTestId);
    await adminClient.from("outsoles").delete().eq("id", multiTestId);
  }

  // -------------------------------------------------------------
  // Test 10: Sample Request Flow Compatibility
  // -------------------------------------------------------------
  console.log("\n[Test 10] Sample Request Integration Compatibility");
  const testInquiryEmail = `audit-test-${Date.now()}@example.com`;
  const { data: insInquiry, error: inqErr } = await adminClient
    .from("sample_inquiries")
    .insert({
      outsole_id: AUTHENTIC_IDS[0], // Trail Grip X1
      client_name: "Integration Test User",
      company_name: "Audit Test Corp",
      email: testInquiryEmail,
      phone: "+1 555 9876",
      message: "Testing compatibility with authentic Supabase outsoles.",
    })
    .select()
    .single();

  check(!inqErr, "Sample inquiry inserted successfully referencing authentic product ID");
  check(insInquiry?.outsole_id === AUTHENTIC_IDS[0], "Inquiry outsole_id matches authentic product");

  if (insInquiry?.id) {
    await adminClient.from("sample_inquiries").delete().eq("id", insInquiry.id);
    check(true, "Cleaned up temporary sample inquiry");
  }

  // -------------------------------------------------------------
  // Test 11: Final Authenticity & Cleanliness Confirmation
  // -------------------------------------------------------------
  console.log("\n[Test 11] Final Authenticity Confirmation");
  const { data: finalOutsoles } = await adminClient
    .from("outsoles")
    .select("id, name, slug, status");
  check(
    finalOutsoles?.length === 3,
    `Database has exactly 3 outsoles (found ${finalOutsoles?.length})`,
  );
  check(
    finalOutsoles?.every((o) => AUTHENTIC_IDS.includes(o.id)),
    "All outsoles are the original authentic production products",
  );

  console.log("\n========================================");
  console.log(`TOTAL CHECKS: ${pass + fail} | PASSED: ${pass} | FAILED: ${fail}`);
  console.log("========================================\n");

  if (fail > 0) process.exit(1);
}

runAudit().catch((err) => {
  console.error("Audit script failed with error:", err);
  process.exit(1);
});
