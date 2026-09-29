// Milestone 11: Admin Dashboard Overview Integration & Regression Test Suite
// Run with: node scratch/test-admin-dashboard.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(p) {
  let content = "";
  try {
    content = readFileSync(p, "utf-8");
  } catch {
    return;
  }
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

const AUTHENTIC_PRODUCT_IDS = [
  "f17b26c3-6b00-4bff-9809-8f164581baca", // Trail Grip X1
  "03d16e15-765d-451d-9364-50ff09d93b39", // RoadFlex R2
  "648a99bc-e252-4f80-90cf-e9975c4047cc", // SafeStep S3
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

const tempProductIds = new Set();
const tempInquiryIds = new Set();

async function runDashboardTests() {
  console.log("==================================================================");
  console.log("MILESTONE 11 — ADMIN DASHBOARD OVERVIEW INTEGRATION TESTS");
  console.log("==================================================================");

  try {
    // -------------------------------------------------------------
    // GROUP 1: Authentic Products Baseline
    // -------------------------------------------------------------
    console.log("\n[GROUP 1: Baseline & Authentic Products Safety]");
    const { data: dbOutsoles, error: outsolesErr } = await adminClient
      .from("outsoles")
      .select("id, name, model_number, status")
      .in("id", AUTHENTIC_PRODUCT_IDS);

    check(!outsolesErr && dbOutsoles?.length === 3, "All 3 authentic production products exist in DB");
    const trailGrip = dbOutsoles?.find((o) => o.id === "f17b26c3-6b00-4bff-9809-8f164581baca");
    const roadFlex = dbOutsoles?.find((o) => o.id === "03d16e15-765d-451d-9364-50ff09d93b39");
    const safeStep = dbOutsoles?.find((o) => o.id === "648a99bc-e252-4f80-90cf-e9975c4047cc");
    check(trailGrip?.name === "Trail Grip X1", "Authentic Trail Grip X1 verified");
    check(roadFlex?.name === "RoadFlex R2", "Authentic RoadFlex R2 verified");
    check(safeStep?.name === "SafeStep S3", "Authentic SafeStep S3 verified");

    // -------------------------------------------------------------
    // GROUP 2: Authorization & RLS Protection
    // -------------------------------------------------------------
    console.log("\n[GROUP 2: Authorization & Security]");
    const { getAdminDashboard, fetchDashboardMetrics } = await import(
      "../src/lib/admin-dashboard.functions.ts"
    );

    let unauthRejected = false;
    try {
      await getAdminDashboard();
    } catch {
      unauthRejected = true;
    }
    check(unauthRejected, "getAdminDashboard() rejects unauthenticated caller via assertStaffRole()");

    // Direct anonymous queries cannot access private sample inquiries
    const { data: anonInquiries, error: anonReadErr } = await anonClient
      .from("sample_inquiries")
      .select("id, client_name, email");
    check(
      anonReadErr != null || (Array.isArray(anonInquiries) && anonInquiries.length === 0),
      "RLS blocks anonymous caller from reading sample_inquiries directly",
    );

    // -------------------------------------------------------------
    // GROUP 3: Dashboard Metrics Initial State
    // -------------------------------------------------------------
    console.log("\n[GROUP 3: Dashboard Metrics Calculation]");
    const initialMetrics = await fetchDashboardMetrics(adminClient);

    // Products metrics
    check(typeof initialMetrics.products.total === "number", "Products total is a number");
    check(typeof initialMetrics.products.active === "number", "Products active is a number");
    check(typeof initialMetrics.products.draft === "number", "Products draft is a number");
    check(typeof initialMetrics.products.archived === "number", "Products archived is a number");
    check(
      initialMetrics.products.total ===
        initialMetrics.products.active + initialMetrics.products.draft + initialMetrics.products.archived,
      `Products total (${initialMetrics.products.total}) equals active (${initialMetrics.products.active}) + draft (${initialMetrics.products.draft}) + archived (${initialMetrics.products.archived})`,
    );
    check(initialMetrics.products.active >= 3, "At least 3 active products exist (authentic products)");

    // Inquiries metrics
    check(typeof initialMetrics.inquiries.total === "number", "Inquiries total is a number");
    check(typeof initialMetrics.inquiries.pending === "number", "Inquiries pending is a number");
    check(typeof initialMetrics.inquiries.contacted === "number", "Inquiries contacted is a number");
    check(typeof initialMetrics.inquiries.resolved === "number", "Inquiries resolved is a number");
    check(
      initialMetrics.inquiries.total ===
        initialMetrics.inquiries.pending + initialMetrics.inquiries.contacted + initialMetrics.inquiries.resolved,
      `Inquiries total (${initialMetrics.inquiries.total}) equals pending (${initialMetrics.inquiries.pending}) + contacted (${initialMetrics.inquiries.contacted}) + resolved (${initialMetrics.inquiries.resolved})`,
    );

    // Taxonomy metrics
    check(initialMetrics.taxonomy.categories >= 8, `Categories count >= 8 (got ${initialMetrics.taxonomy.categories})`);
    check(initialMetrics.taxonomy.materials >= 7, `Materials count >= 7 (got ${initialMetrics.taxonomy.materials})`);
    check(initialMetrics.taxonomy.tractionTypes >= 9, `Traction types count >= 9 (got ${initialMetrics.taxonomy.tractionTypes})`);

    // Recent items length constraint (at most 5)
    check(initialMetrics.recentInquiries.length <= 5, "Recent inquiries list capped at 5 items");
    check(initialMetrics.recentProducts.length <= 5, "Recent products list capped at 5 items");

    // -------------------------------------------------------------
    // GROUP 4: Dynamic Metrics Updates with Temporary Records
    // -------------------------------------------------------------
    console.log("\n[GROUP 4: Dynamic Metrics & Sorting Validation]");

    // 1. Create a temporary draft product
    const { data: tempDraft, error: draftErr } = await adminClient
      .from("outsoles")
      .insert({
        name: "Temp Test Draft Sole",
        slug: `temp-test-draft-${Date.now()}`,
        model_number: "TMP-DFT-001",
        status: "draft",
        description: "Temporary draft outsole for dashboard testing",
        is_featured: false,
        is_sampling_available: false,
      })
      .select("id, name, updated_at")
      .single();

    check(!draftErr && tempDraft != null, "Created temporary draft product");
    if (tempDraft) tempProductIds.add(tempDraft.id);

    // 2. Create a temporary archived product
    const { data: tempArchived, error: archErr } = await adminClient
      .from("outsoles")
      .insert({
        name: "Temp Test Archived Sole",
        slug: `temp-test-arch-${Date.now()}`,
        model_number: "TMP-ARC-002",
        status: "archived",
        description: "Temporary archived outsole for dashboard testing",
        is_featured: true,
        is_sampling_available: false,
      })
      .select("id, name, updated_at")
      .single();

    check(!archErr && tempArchived != null, "Created temporary archived product");
    if (tempArchived) tempProductIds.add(tempArchived.id);

    // 3. Create a temporary pending sample inquiry linked to Trail Grip X1
    const { data: tempInqPending, error: inq1Err } = await adminClient
      .from("sample_inquiries")
      .insert({
        client_name: "Dashboard Tester Pending",
        company_name: "Test Corp",
        email: `tester.pending.${Date.now()}@example.com`,
        phone: "+1 555 900 1234",
        message: "Need 5 samples of Trail Grip X1 for traction lab testing.",
        status: "pending",
        outsole_id: "f17b26c3-6b00-4bff-9809-8f164581baca",
      })
      .select("id, client_name, created_at")
      .single();

    check(!inq1Err && tempInqPending != null, "Created temporary pending inquiry");
    if (tempInqPending) tempInquiryIds.add(tempInqPending.id);

    // 4. Create a temporary contacted sample inquiry (general inquiry, no outsole)
    const { data: tempInqContacted, error: inq2Err } = await adminClient
      .from("sample_inquiries")
      .insert({
        client_name: "Dashboard Tester Contacted",
        company_name: "Global Soles Ltd",
        email: `tester.contacted.${Date.now()}@example.com`,
        message: "General question about lead times for custom mold prototyping.",
        status: "contacted",
        outsole_id: null,
      })
      .select("id, client_name, created_at")
      .single();

    check(!inq2Err && tempInqContacted != null, "Created temporary contacted general inquiry");
    if (tempInqContacted) tempInquiryIds.add(tempInqContacted.id);

    // Fetch refreshed dashboard metrics
    const refreshedMetrics = await fetchDashboardMetrics(adminClient);

    // Verify product counts incremented
    check(
      refreshedMetrics.products.draft === initialMetrics.products.draft + 1,
      `Draft products incremented: ${initialMetrics.products.draft} -> ${refreshedMetrics.products.draft}`,
    );
    check(
      refreshedMetrics.products.archived === initialMetrics.products.archived + 1,
      `Archived products incremented: ${initialMetrics.products.archived} -> ${refreshedMetrics.products.archived}`,
    );
    check(
      refreshedMetrics.products.total === initialMetrics.products.total + 2,
      `Total products incremented: ${initialMetrics.products.total} -> ${refreshedMetrics.products.total}`,
    );

    // Verify inquiry counts incremented
    check(
      refreshedMetrics.inquiries.pending === initialMetrics.inquiries.pending + 1,
      `Pending inquiries incremented: ${initialMetrics.inquiries.pending} -> ${refreshedMetrics.inquiries.pending}`,
    );
    check(
      refreshedMetrics.inquiries.contacted === initialMetrics.inquiries.contacted + 1,
      `Contacted inquiries incremented: ${initialMetrics.inquiries.contacted} -> ${refreshedMetrics.inquiries.contacted}`,
    );
    check(
      refreshedMetrics.inquiries.total === initialMetrics.inquiries.total + 2,
      `Total inquiries incremented: ${initialMetrics.inquiries.total} -> ${refreshedMetrics.inquiries.total}`,
    );

    // -------------------------------------------------------------
    // GROUP 5: Ordering and Data Formatting
    // -------------------------------------------------------------
    console.log("\n[GROUP 5: Recent Products & Inquiries Sorting]");

    // Recent products ordered by updated_at descending
    const recentProdDates = refreshedMetrics.recentProducts.map((p) => new Date(p.updated_at).getTime());
    const isProdSortedDesc = recentProdDates.every((val, i, arr) => i === 0 || arr[i - 1] >= val);
    check(isProdSortedDesc, "Recent products are ordered by updated_at descending");

    // Most recently created/updated product should appear in recent products
    const foundArchivedInRecent = refreshedMetrics.recentProducts.find((p) => p.id === tempArchived?.id);
    check(foundArchivedInRecent != null, "Newly added product appears in recent products");
    check(foundArchivedInRecent?.is_featured === true, "Featured indicator is preserved in recent product item");
    check(foundArchivedInRecent?.status === "archived", "Product status is correctly returned");

    // Recent inquiries ordered by created_at descending
    const recentInqDates = refreshedMetrics.recentInquiries.map((i) => new Date(i.created_at).getTime());
    const isInqSortedDesc = recentInqDates.every((val, i, arr) => i === 0 || arr[i - 1] >= val);
    check(isInqSortedDesc, "Recent inquiries are ordered by created_at descending");

    // Verify newly added inquiry appears in recent inquiries with resolved product name
    const foundPendingInRecent = refreshedMetrics.recentInquiries.find((i) => i.id === tempInqPending?.id);
    check(foundPendingInRecent != null, "Newly added inquiry appears in recent inquiries");
    check(
      foundPendingInRecent?.product_name === "Trail Grip X1",
      `Linked product resolved to "Trail Grip X1" (got: "${foundPendingInRecent?.product_name}")`,
    );
    check(
      foundPendingInRecent?.product_model === "OUT-TRAIL-001",
      `Linked product model resolved to "OUT-TRAIL-001" (got: "${foundPendingInRecent?.product_model}")`,
    );

    // Verify general inquiry has null product_name
    const foundContactedInRecent = refreshedMetrics.recentInquiries.find((i) => i.id === tempInqContacted?.id);
    check(foundContactedInRecent != null, "General inquiry appears in recent inquiries");
    check(foundContactedInRecent?.product_name === null, "General inquiry product_name is null");

  } finally {
    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log("\n[CLEANUP: Removing Temporary Test Records]");

    // Delete temp inquiries
    if (tempInquiryIds.size > 0) {
      const { error: inqDelErr } = await adminClient
        .from("sample_inquiries")
        .delete()
        .in("id", Array.from(tempInquiryIds));
      if (!inqDelErr) {
        console.log(`  ✓ Cleaned up ${tempInquiryIds.size} temporary test inquiries`);
      } else {
        console.error(`  ✗ Error cleaning up test inquiries: ${inqDelErr.message}`);
      }
    }

    // Delete temp products
    if (tempProductIds.size > 0) {
      const { error: prodDelErr } = await adminClient
        .from("outsoles")
        .delete()
        .in("id", Array.from(tempProductIds));
      if (!prodDelErr) {
        console.log(`  ✓ Cleaned up ${tempProductIds.size} temporary test products`);
      } else {
        console.error(`  ✗ Error cleaning up test products: ${prodDelErr.message}`);
      }
    }

    // Verify authentic products untouched
    const { data: finalOutsoles } = await adminClient
      .from("outsoles")
      .select("id, name, status")
      .in("id", AUTHENTIC_PRODUCT_IDS);
    check(finalOutsoles?.length === 3, "All 3 authentic production products remain untouched");
    check(finalOutsoles?.every((o) => o.status === "active"), "All authentic products remain active");
  }

  console.log("\n==================================================================");
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log("==================================================================");

  if (fail > 0) {
    process.exit(1);
  }
}

runDashboardTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
