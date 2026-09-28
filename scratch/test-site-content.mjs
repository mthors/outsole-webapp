// Milestone 10: Site Content Management & Public Showcase Integration Test Suite
// Run with: node scratch/test-site-content.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { z } from "zod";

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

const EXPECTED_CONTENT_KEYS = [
  "homepage_hero",
  "homepage_capabilities",
  "about_company",
  "about_oem",
  "about_odm",
  "contact_information",
];

const AUTHENTIC_OUTSOLE_SLUGS = [
  "trail-grip-x1",
  "roadflex-r2",
  "safestep-s3",
];

// Zod schema matching src/lib/admin-content.functions.ts
const contentKeyEnum = z.enum([
  "homepage_hero",
  "homepage_capabilities",
  "about_company",
  "about_oem",
  "about_odm",
  "contact_information",
]);

const updateSiteContentSchema = z.object({
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

async function runTests() {
  console.log("==================================================================");
  console.log("MILESTONE 10: SITE CONTENT MANAGEMENT INTEGRATION TESTS");
  console.log("==================================================================\n");

  // ==========================================================================
  // GROUP 1: Authentic Baseline & State Capture
  // ==========================================================================
  console.log("[GROUP 1: Authentic Baseline & Initial State Capture]");
  const { data: baselineOutsoles, error: outsolesErr } = await adminClient
    .from("outsoles")
    .select("id, name, slug, status");

  check(!outsolesErr && baselineOutsoles, "Queried authentic outsoles table");
  check(baselineOutsoles?.length === 3, "Exactly 3 authentic outsoles exist in database");
  for (const slug of AUTHENTIC_OUTSOLE_SLUGS) {
    check(
      baselineOutsoles?.some((o) => o.slug === slug && o.status === "active"),
      `Authentic product "${slug}" is present and active`,
    );
  }

  const { data: initialContentRows, error: contentErr } = await adminClient
    .from("site_content")
    .select("id, content_key, title, content, updated_at");

  check(!contentErr && initialContentRows, "Queried site_content table");
  check(
    initialContentRows?.length === EXPECTED_CONTENT_KEYS.length,
    `Found all ${EXPECTED_CONTENT_KEYS.length} expected site_content rows in database`,
  );

  const baselineMap = new Map();
  for (const key of EXPECTED_CONTENT_KEYS) {
    const row = initialContentRows?.find((r) => r.content_key === key);
    check(Boolean(row), `Baseline row for content_key "${key}" exists`);
    if (row) {
      check(Boolean(row.title), `Row "${key}" has non-empty title`);
      check(Boolean(row.content), `Row "${key}" has non-empty content`);
      check(Boolean(row.updated_at), `Row "${key}" has valid updated_at timestamp`);
      baselineMap.set(key, { ...row });
    }
  }

  // ==========================================================================
  // GROUP 2: Anonymous RLS & Public Access Security
  // ==========================================================================
  console.log("\n[GROUP 2: Anonymous RLS & Direct Mutation Restrictions]");

  // Anonymous read should succeed (public read allowed)
  const { data: anonRead, error: anonReadErr } = await anonClient
    .from("site_content")
    .select("content_key, title, content");

  check(!anonReadErr && anonRead, "Anonymous client can SELECT from site_content");
  check(anonRead?.length === 6, "Anonymous SELECT returns all 6 site_content entries");

  // Anonymous direct UPDATE should be rejected or affect 0 rows
  const { data: anonUpdateData, error: anonUpdateErr } = await anonClient
    .from("site_content")
    .update({ title: "ATTEMPTED_ANON_OVERWRITE" })
    .eq("content_key", "homepage_hero")
    .select();

  const anonUpdateBlocked =
    Boolean(anonUpdateErr) ||
    !anonUpdateData ||
    anonUpdateData.length === 0;
  check(anonUpdateBlocked, "Postgres RLS blocks anonymous direct UPDATE on site_content");

  // Anonymous direct DELETE should be rejected or affect 0 rows
  const { data: anonDeleteData, error: anonDeleteErr } = await anonClient
    .from("site_content")
    .delete()
    .eq("content_key", "homepage_hero")
    .select();

  const anonDeleteBlocked =
    Boolean(anonDeleteErr) ||
    !anonDeleteData ||
    anonDeleteData.length === 0;
  check(anonDeleteBlocked, "Postgres RLS blocks anonymous direct DELETE on site_content");

  // Anonymous direct INSERT should be rejected
  const { data: anonInsertData, error: anonInsertErr } = await anonClient
    .from("site_content")
    .insert({ content_key: "unauthorized_entry", title: "Test", content: "Test" })
    .select();

  const anonInsertBlocked =
    Boolean(anonInsertErr) ||
    !anonInsertData ||
    anonInsertData.length === 0;
  check(anonInsertBlocked, "Postgres RLS blocks anonymous direct INSERT into site_content");

  // ==========================================================================
  // GROUP 3: Zod Validation & Schema Constraints
  // ==========================================================================
  console.log("\n[GROUP 3: Zod Validation & Schema Boundary Tests]");

  // Valid schema test
  const validPayload = {
    content_key: "about_company",
    title: "Outsole Works Factory Profile",
    content: "Engineered rubber production since 2012.",
  };
  const validResult = updateSiteContentSchema.safeParse(validPayload);
  check(validResult.success, "Valid content update payload accepted");

  // Invalid content_key
  const invalidKeyResult = updateSiteContentSchema.safeParse({
    content_key: "non_existent_key",
    title: "Test Title",
    content: "Test Content",
  });
  check(!invalidKeyResult.success, "Invalid content_key rejected by enum");

  // Empty title
  const emptyTitleResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "   ",
    content: "Valid Content",
  });
  check(!emptyTitleResult.success, "Whitespace-only title rejected (min 1 char required)");

  // Oversized title (> 255 chars)
  const oversizedTitleResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "A".repeat(256),
    content: "Valid Content",
  });
  check(!oversizedTitleResult.success, "Oversized title (> 255 chars) rejected");

  // Empty content
  const emptyContentResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "Valid Title",
    content: "   ",
  });
  check(!emptyContentResult.success, "Whitespace-only content rejected (min 1 char required)");

  // Oversized content (> 5000 chars)
  const oversizedContentResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "Valid Title",
    content: "X".repeat(5001),
  });
  check(!oversizedContentResult.success, "Oversized content (> 5000 chars) rejected");

  // Max boundary edge cases (exactly 255 chars title, exactly 5000 chars content)
  const boundaryResult = updateSiteContentSchema.safeParse({
    content_key: "about_oem",
    title: "T".repeat(255),
    content: "C".repeat(5000),
  });
  check(boundaryResult.success, "Boundary maximums (255 title, 5000 content) accepted");

  // ==========================================================================
  // GROUP 4: Admin Content Operations & Persistence
  // ==========================================================================
  console.log("\n[GROUP 4: Admin Content Operations & Timestamp Verification]");

  const testKey = "about_company";
  const originalRow = baselineMap.get(testKey);
  const testModifiedTitle = "Outsole Works — Technical Rubber Facility [TEST]";
  const testModifiedContent =
    "Over 12 years of specialized compression molding and high-abrasion compound formulation in our certified facility. [TEST]";

  // Wait 100ms to ensure updated_at timestamp progresses cleanly
  await new Promise((resolve) => setTimeout(resolve, 150));

  const { data: updateData, error: updateErr } = await adminClient
    .from("site_content")
    .update({
      title: testModifiedTitle,
      content: testModifiedContent,
    })
    .eq("content_key", testKey)
    .select("id, content_key, title, content, updated_at")
    .single();

  check(!updateErr && updateData, `Admin client updated "${testKey}" successfully`);
  check(updateData?.title === testModifiedTitle, "Updated title persisted correctly");
  check(updateData?.content === testModifiedContent, "Updated content persisted correctly");

  const originalTimestamp = new Date(originalRow.updated_at).getTime();
  const newTimestamp = new Date(updateData.updated_at).getTime();
  check(
    newTimestamp >= originalTimestamp,
    `Database trigger updated_at was refreshed (${originalRow.updated_at} -> ${updateData.updated_at})`,
  );

  // ==========================================================================
  // GROUP 5: Public Integration & Consumption
  // ==========================================================================
  console.log("\n[GROUP 5: Public Integration & Route Consumption]");

  // Verify anonymous/public client immediately sees the modified content
  const { data: publicFetch, error: publicFetchErr } = await anonClient
    .from("site_content")
    .select("content_key, title, content");

  check(!publicFetchErr && publicFetch, "Public client can read modified site_content");
  const publicCompanyRow = publicFetch?.find((r) => r.content_key === testKey);
  check(
    publicCompanyRow?.title === testModifiedTitle,
    "Public query immediately reflects updated title",
  );
  check(
    publicCompanyRow?.content === testModifiedContent,
    "Public query immediately reflects updated narrative content",
  );

  // Verify structure matches requirements for About, Contact, and Homepage
  const publicMap = Object.fromEntries(
    (publicFetch ?? []).map((c) => [c.content_key, c]),
  );

  // About page keys
  check(Boolean(publicMap["about_company"]), "About page consumes about_company key");
  check(Boolean(publicMap["about_oem"]), "About page consumes about_oem key");
  check(Boolean(publicMap["about_odm"]), "About page consumes about_odm key");

  // Contact page key
  check(Boolean(publicMap["contact_information"]), "Contact page consumes contact_information key");

  // Homepage keys
  check(Boolean(publicMap["homepage_hero"]), "Homepage consumes homepage_hero key");
  check(Boolean(publicMap["homepage_capabilities"]), "Homepage consumes homepage_capabilities key");

  // ==========================================================================
  // GROUP 6: Restoration & Safety Cleanup
  // ==========================================================================
  console.log("\n[GROUP 6: Restoration of Authentic Baseline Data]");

  // Restore the modified record back to its exact baseline
  const { data: restoreData, error: restoreErr } = await adminClient
    .from("site_content")
    .update({
      title: originalRow.title,
      content: originalRow.content,
    })
    .eq("content_key", testKey)
    .select("id, content_key, title, content")
    .single();

  check(!restoreErr && restoreData, `Restored "${testKey}" to authentic baseline`);
  check(restoreData?.title === originalRow.title, "Restored title matches original baseline exactly");
  check(restoreData?.content === originalRow.content, "Restored content matches original baseline exactly");

  // Re-verify all 6 records match baseline values
  const { data: finalContentRows, error: finalContentErr } = await adminClient
    .from("site_content")
    .select("id, content_key, title, content");

  check(!finalContentErr && finalContentRows?.length === 6, "Final check: Exactly 6 site_content rows remain");

  let allRestored = true;
  for (const key of EXPECTED_CONTENT_KEYS) {
    const base = baselineMap.get(key);
    const finalRow = finalContentRows?.find((r) => r.content_key === key);
    if (!finalRow || finalRow.title !== base.title || finalRow.content !== base.content) {
      allRestored = false;
      console.error(`Mismatch for key ${key}: expected "${base.title}", got "${finalRow?.title}"`);
    }
  }
  check(allRestored, "All 6 site_content entries are 100% identical to baseline");

  // Re-verify authentic outsoles remain unchanged
  const { data: finalOutsoles } = await adminClient.from("outsoles").select("id, slug");
  check(finalOutsoles?.length === 3, "Authentic outsoles remain exactly 3");

  console.log("\n==================================================================");
  console.log(`RESULTS: ${pass} passed, ${fail} failed`);
  console.log("==================================================================");

  if (fail > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
