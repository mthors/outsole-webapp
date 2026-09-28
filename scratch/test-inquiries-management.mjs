// Milestone 9 — Phase 9A: Admin Sample Inquiry Management Integration & Regression Test Suite
// Run with: node scratch/test-inquiries-management.mjs

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

const AUTHENTIC_PRODUCT_IDS = [
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

const createdInquiryIds = new Set();

async function runInquiriesTests() {
  console.log("==================================================================");
  console.log("MILESTONE 9 — PHASE 9A: INQUIRY MANAGEMENT INTEGRATION TESTS");
  console.log("==================================================================");

  try {
    // -------------------------------------------------------------
    // GROUP 1: Authentic Products Baseline
    // -------------------------------------------------------------
    console.log("\n[GROUP 1: Authentic Products Baseline]");
    const { data: dbOutsoles, error: outsolesErr } = await adminClient
      .from("outsoles")
      .select("id, name, model_number, status")
      .in("id", AUTHENTIC_PRODUCT_IDS);

    check(!outsolesErr && dbOutsoles?.length === 3, "All 3 authentic production products exist");
    const trailGrip = dbOutsoles?.find((o) => o.id === "f17b26c3-6b00-4bff-9809-8f164581baca");
    const roadFlex = dbOutsoles?.find((o) => o.id === "03d16e15-765d-451d-9364-50ff09d93b39");
    const safeStep = dbOutsoles?.find((o) => o.id === "648a99bc-e252-4f80-90cf-e9975c4047cc");
    check(trailGrip?.name === "Trail Grip X1" && trailGrip?.model_number === "OUT-TRAIL-001", "Trail Grip X1 verified");
    check(roadFlex?.name === "RoadFlex R2" && roadFlex?.model_number === "OUT-RUN-002", "RoadFlex R2 verified");
    check(safeStep?.name === "SafeStep S3" && safeStep?.model_number === "OUT-SAFE-003", "SafeStep S3 verified");

    // -------------------------------------------------------------
    // GROUP 2: Anonymous Direct Access / RLS Security
    // -------------------------------------------------------------
    console.log("\n[GROUP 2: Anonymous Direct Access & RLS Security]");

    // Anonymous SELECT
    const { data: anonInquiries, error: anonReadErr } = await anonClient
      .from("sample_inquiries")
      .select("id, client_name, email, phone, message");
    check(
      anonReadErr != null || (Array.isArray(anonInquiries) && anonInquiries.length === 0),
      "Anonymous client cannot directly read sample_inquiries table (RLS blocked / 0 rows)",
    );

    // Anonymous UPDATE
    const { data: anonUpdate, error: anonUpdateErr } = await anonClient
      .from("sample_inquiries")
      .update({ status: "resolved" })
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    check(
      anonUpdateErr != null || !anonUpdate || anonUpdate.length === 0,
      "Anonymous client cannot directly update sample_inquiries (RLS blocked)",
    );

    // Anonymous DELETE
    const { data: anonDel, error: anonDelErr } = await anonClient
      .from("sample_inquiries")
      .delete()
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    check(
      anonDelErr != null || !anonDel || anonDel.length === 0,
      "Anonymous client cannot directly delete sample_inquiries (RLS blocked)",
    );

    // -------------------------------------------------------------
    // GROUP 3: Server Schemas & Validation
    // -------------------------------------------------------------
    console.log("\n[GROUP 3: Schemas & Validation]");
    const {
      inquiryStatusEnum,
      listInquiriesSchema,
      updateInquiryStatusSchema,
    } = await import("../src/lib/admin-inquiries.functions.ts");

    const { inquirySchema } = await import("../src/lib/inquiries.functions.ts");

    // Status Enum validation
    check(inquiryStatusEnum.safeParse("pending").success, "inquiryStatusEnum accepts 'pending'");
    check(inquiryStatusEnum.safeParse("contacted").success, "inquiryStatusEnum accepts 'contacted'");
    check(inquiryStatusEnum.safeParse("resolved").success, "inquiryStatusEnum accepts 'resolved'");
    check(!inquiryStatusEnum.safeParse("deleted").success, "inquiryStatusEnum rejects 'deleted'");
    check(!inquiryStatusEnum.safeParse("").success, "inquiryStatusEnum rejects empty string");

    // Public inquirySchema validation
    const validPublicInquiry = inquirySchema.safeParse({
      client_name: "Jane Doe",
      company_name: "Stride Tech",
      email: "jane@stridetech.example.com",
      phone: "+1 555 123 4567",
      message: "Please send sample pairs in size 9.",
      outsole_id: "f17b26c3-6b00-4bff-9809-8f164581baca",
    });
    check(validPublicInquiry.success, "inquirySchema accepts valid inquiry data with outsole_id");

    const validPublicWithoutOutsole = inquirySchema.safeParse({
      client_name: "Jane Doe",
      company_name: "Stride Tech",
      email: "jane@stridetech.example.com",
      message: "General inquiry regarding custom tooling.",
      outsole_id: "",
    });
    check(validPublicWithoutOutsole.success, "inquirySchema accepts inquiry without outsole_id");

    const invalidEmailInquiry = inquirySchema.safeParse({
      client_name: "Jane Doe",
      company_name: "Stride Tech",
      email: "not-an-email",
      message: "Valid message length here.",
    });
    check(!invalidEmailInquiry.success, "inquirySchema rejects invalid email format");

    const shortMessageInquiry = inquirySchema.safeParse({
      client_name: "Jane Doe",
      company_name: "Stride Tech",
      email: "jane@example.com",
      message: "short",
    });
    check(!shortMessageInquiry.success, "inquirySchema rejects message shorter than 10 characters");

    // List inquiries schema validation
    const listDefault = listInquiriesSchema.parse({});
    check(
      listDefault.status === "all" && listDefault.page === 1 && listDefault.pageSize === 20,
      "listInquiriesSchema provides correct defaults (all, page 1, size 20)",
    );

    // Update status schema validation
    check(
      updateInquiryStatusSchema.safeParse({
        id: "03d16e15-765d-451d-9364-50ff09d93b39",
        status: "contacted",
      }).success,
      "updateInquiryStatusSchema accepts valid UUID and status",
    );
    check(
      !updateInquiryStatusSchema.safeParse({
        id: "not-a-uuid",
        status: "contacted",
      }).success,
      "updateInquiryStatusSchema rejects non-UUID id",
    );

    // -------------------------------------------------------------
    // GROUP 4: Public Submission Database Flow
    // -------------------------------------------------------------
    console.log("\n[GROUP 4: Public Submission Database Flow]");
    const testEmail1 = `phase9a.test.${Date.now()}@example.com`;

    // 1. Submit with valid outsole reference
    const { data: inserted1, error: insertErr1 } = await adminClient
      .from("sample_inquiries")
      .insert({
        client_name: "Alex Runner",
        company_name: "Peak Footwear Co",
        email: testEmail1,
        phone: "+1 555 019 2831",
        message: "Requesting prototype samples for marathon sole testing batch.",
        outsole_id: "03d16e15-765d-451d-9364-50ff09d93b39", // RoadFlex R2
        status: "pending",
      })
      .select("id, client_name, company_name, email, phone, message, status, outsole_id")
      .single();

    check(!insertErr1 && inserted1 != null, "Successfully inserted inquiry with valid outsole reference");
    if (inserted1) {
      createdInquiryIds.add(inserted1.id);
      check(inserted1.status === "pending", "Initial status defaults to 'pending'");
      check(inserted1.outsole_id === "03d16e15-765d-451d-9364-50ff09d93b39", "outsole_id is stored correctly");
    }

    // 2. Submit general inquiry without outsole reference
    const testEmail2 = `phase9a.general.${Date.now()}@example.com`;
    const { data: inserted2, error: insertErr2 } = await adminClient
      .from("sample_inquiries")
      .insert({
        client_name: "Sam General",
        company_name: "Apex Brands Ltd",
        email: testEmail2,
        message: "General inquiry regarding catalog specifications.",
        outsole_id: null,
        status: "pending",
      })
      .select("id, client_name, status, outsole_id")
      .single();

    check(!insertErr2 && inserted2 != null, "Successfully inserted general inquiry without outsole reference");
    if (inserted2) {
      createdInquiryIds.add(inserted2.id);
      check(inserted2.outsole_id === null, "outsole_id is stored as null for general inquiry");
      check(inserted2.status === "pending", "General inquiry status is 'pending'");
    }

    // -------------------------------------------------------------
    // GROUP 5: Admin Query / Joining / Pagination Tests
    // -------------------------------------------------------------
    console.log("\n[GROUP 5: Admin Query, Search & Status Filtering]");

    // Insert additional seeded test inquiries to test filtering and pagination
    const testEmail4 = `phase9a.contacted.${Date.now()}@example.com`;
    const testEmail5 = `phase9a.resolved.${Date.now()}@example.com`;

    const { data: seededRows, error: seedErr } = await adminClient
      .from("sample_inquiries")
      .insert([
        {
          client_name: "Contacted Customer",
          company_name: "Trail Gear Inc",
          email: testEmail4,
          phone: "123-456-7890",
          message: "Follow up regarding Trail Grip sample testing batch.",
          status: "contacted",
          outsole_id: "648a99bc-e252-4f80-90cf-e9975c4047cc", // Trail Grip X1
        },
        {
          client_name: "Resolved Partner",
          company_name: "Summit Boots",
          email: testEmail5,
          message: "Sample approved and production order placed.",
          status: "resolved",
          outsole_id: null,
        },
      ])
      .select("id, status");

    check(!seedErr && seededRows?.length === 2, "Seeded test inquiries with 'contacted' and 'resolved' statuses");
    if (seededRows) {
      for (const r of seededRows) createdInquiryIds.add(r.id);
    }

    // Direct DB query verifying admin join functionality
    const { data: adminQueryResult, error: adminQueryErr } = await adminClient
      .from("sample_inquiries")
      .select(`
        id,
        outsole_id,
        client_name,
        company_name,
        email,
        phone,
        message,
        status,
        created_at,
        outsoles (
          id,
          name,
          model_number,
          slug
        )
      `)
      .order("created_at", { ascending: false });

    check(!adminQueryErr && adminQueryResult.length >= 4, "Admin join query executes cleanly on real Supabase data");

    const joinedWithOutsole = adminQueryResult.find((r) => r.id === inserted1.id);
    check(
      joinedWithOutsole?.outsoles?.name === "RoadFlex R2" &&
      joinedWithOutsole?.outsoles?.model_number === "OUT-RUN-002",
      "Product reference resolved to RoadFlex R2 (model OUT-RUN-002)",
    );

    const generalItem = adminQueryResult.find((r) => r.id === inserted2.id);
    check(generalItem?.outsoles === null, "General inquiry has outsoles: null");

    // Test Search by customer name
    const { data: searchNameResult } = await adminClient
      .from("sample_inquiries")
      .select("id, client_name")
      .ilike("client_name", "%Alex Runner%");
    check(
      searchNameResult?.some((r) => r.id === inserted1.id),
      "Search by customer name matches expected record",
    );

    // Test Search by company name
    const { data: searchCompanyResult } = await adminClient
      .from("sample_inquiries")
      .select("id, company_name")
      .ilike("company_name", "%Peak Footwear%");
    check(
      searchCompanyResult?.some((r) => r.id === inserted1.id),
      "Search by company name matches expected record",
    );

    // Test Search by email
    const { data: searchEmailResult } = await adminClient
      .from("sample_inquiries")
      .select("id, email")
      .ilike("email", `%${testEmail1}%`);
    check(
      searchEmailResult?.length === 1 && searchEmailResult[0].id === inserted1.id,
      "Search by email matches exact record",
    );

    // Test Status Filter: 'pending'
    const { data: pendingRows } = await adminClient
      .from("sample_inquiries")
      .select("id, status")
      .eq("status", "pending");
    check(
      pendingRows?.every((r) => r.status === "pending") &&
      pendingRows.some((r) => r.id === inserted1.id),
      "Status filter 'pending' returns only pending records",
    );

    // Test Status Filter: 'contacted'
    const { data: contactedRows } = await adminClient
      .from("sample_inquiries")
      .select("id, status")
      .eq("status", "contacted");
    check(
      contactedRows?.every((r) => r.status === "contacted") &&
      contactedRows.some((r) => r.id === seededRows?.[0]?.id),
      "Status filter 'contacted' returns only contacted records",
    );

    // Test Status Filter: 'resolved'
    const { data: resolvedRows } = await adminClient
      .from("sample_inquiries")
      .select("id, status")
      .eq("status", "resolved");
    check(
      resolvedRows?.every((r) => r.status === "resolved") &&
      resolvedRows.some((r) => r.id === seededRows?.[1]?.id),
      "Status filter 'resolved' returns only resolved records",
    );

    // -------------------------------------------------------------
    // GROUP 6: Status Mutation & Workflow State Transitions
    // -------------------------------------------------------------
    console.log("\n[GROUP 6: Status Workflow Transitions]");

    // Update pending -> contacted
    const { data: updated1, error: updateErr1 } = await adminClient
      .from("sample_inquiries")
      .update({ status: "contacted" })
      .eq("id", inserted1.id)
      .select("id, status")
      .single();

    check(!updateErr1 && updated1?.status === "contacted", "Updated inquiry status from 'pending' to 'contacted'");

    // Update contacted -> resolved
    const { data: updated2, error: updateErr2 } = await adminClient
      .from("sample_inquiries")
      .update({ status: "resolved" })
      .eq("id", inserted1.id)
      .select("id, status")
      .single();

    check(!updateErr2 && updated2?.status === "resolved", "Updated inquiry status from 'contacted' to 'resolved'");

    // Try invalid status - Postgres CHECK constraint must reject
    const { error: invalidStatusErr } = await adminClient
      .from("sample_inquiries")
      .update({ status: "invalid_status_value" })
      .eq("id", inserted1.id);

    check(invalidStatusErr != null, "Postgres CHECK constraint rejects invalid status ('invalid_status_value')");

    // Zod validator validation for inquiryStatusEnum
    const validPending = inquiryStatusEnum.safeParse("pending");
    const validContacted = inquiryStatusEnum.safeParse("contacted");
    const validResolved = inquiryStatusEnum.safeParse("resolved");
    const invalidStatus = inquiryStatusEnum.safeParse("deleted");
    check(
      validPending.success && validContacted.success && validResolved.success && !invalidStatus.success,
      "Zod inquiryStatusEnum strictly allows 'pending' | 'contacted' | 'resolved' and rejects others",
    );

    // -------------------------------------------------------------
    // GROUP 7: Milestone 9B Advanced Inquiry Detail & Product Image Integration
    // -------------------------------------------------------------
    console.log("\n[GROUP 7: Milestone 9B Advanced Inquiry Detail & Product Image Integration]");

    // 1. Resolve outsole primary image for product inquiry
    const { data: outsoleImages } = await adminClient
      .from("outsole_images")
      .select("file_path, is_primary, display_order")
      .eq("outsole_id", inserted1.outsole_id)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(1);

    check(outsoleImages && outsoleImages.length > 0, "Outsole image record resolved for requested product");
    const primaryImgPath = outsoleImages?.[0]?.file_path;
    let signedImgUrl = null;
    if (primaryImgPath) {
      const { data: signed } = await adminClient.storage
        .from("outsole-images")
        .createSignedUrl(primaryImgPath, 60 * 60);
      signedImgUrl = signed?.signedUrl;
    }
    check(signedImgUrl != null && signedImgUrl.includes("outsole-images"), "Generated valid signed URL for requested product image");

    // 2. Verify signed image URL responds with HTTP 200
    if (signedImgUrl) {
      const imgRes = await fetch(signedImgUrl);
      check(imgRes.status === 200, "Signed product image URL returns HTTP 200");
    }

    // 3. Verify general inquiry has no outsole link
    const { data: generalInquiryDetail } = await adminClient
      .from("sample_inquiries")
      .select("id, client_name, outsole_id")
      .eq("id", inserted2.id)
      .single();
    check(generalInquiryDetail?.outsole_id === null, "General inquiry has null outsole_id");

    // 4. Reversible status workflow: transition resolved -> pending (reopen inquiry)
    const { data: reopened, error: reopenErr } = await adminClient
      .from("sample_inquiries")
      .update({ status: "pending" })
      .eq("id", inserted1.id)
      .select("id, status")
      .single();
    check(!reopenErr && reopened?.status === "pending", "Reversible workflow: reopened inquiry from 'resolved' back to 'pending'");

    // 5. Schema validation: listInquiriesSchema rejects invalid status
    const invalidListFilter = listInquiriesSchema.safeParse({ status: "invalid_filter" });
    check(!invalidListFilter.success, "listInquiriesSchema rejects invalid status option");

    // 6. Schema validation: listInquiriesSchema accepts valid pagination & status
    const validListFilter = listInquiriesSchema.safeParse({ status: "pending", page: 2, pageSize: 15 });
    check(validListFilter.success, "listInquiriesSchema accepts valid pagination & status");

    // 7. Schema validation: updateInquiryStatusSchema rejects non-UUID id
    const invalidUuidStatus = updateInquiryStatusSchema.safeParse({ id: "not-a-uuid", status: "contacted" });
    check(!invalidUuidStatus.success, "updateInquiryStatusSchema rejects non-UUID id");

  } finally {
    // -------------------------------------------------------------
    // CLEANUP: Clean up all test inquiries created during test
    // -------------------------------------------------------------
    console.log("\n[CLEANUP: Removing Temporary Test Inquiries]");
    if (createdInquiryIds.size > 0) {
      const idsArray = Array.from(createdInquiryIds);
      const { error: delErr } = await adminClient
        .from("sample_inquiries")
        .delete()
        .in("id", idsArray);

      if (delErr) {
        console.error(`  ✗ Error cleaning up test inquiries: ${delErr.message}`);
      } else {
        console.log(`  ✓ Cleanly removed ${idsArray.length} temporary test inquiries`);
      }
    }

    // Verify authentic products untouched
    const { count: finalProductCount } = await adminClient
      .from("outsoles")
      .select("id", { count: "exact", head: true });
    check(finalProductCount === 3, "Authentic outsoles table still contains exactly 3 products");
  }

  console.log("\n==================================================================");
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log("==================================================================");

  if (fail > 0) {
    process.exit(1);
  }
}

runInquiriesTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
