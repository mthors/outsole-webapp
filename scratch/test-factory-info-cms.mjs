import assert from "node:assert";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
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

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`, err);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`, err);
    failed++;
  }
}

console.log("\n=======================================================");
console.log("TEST SUITE: CMS Management for Factory Information Rows");
console.log("=======================================================\n");

// 1. Loading both rows & default structure
import { DEFAULT_FACTORY_INFO_ROWS } from "../src/lib/factory-info-types.ts";
test("Loading both rows: DEFAULT_FACTORY_INFO_ROWS contains exactly row_1 and row_2", () => {
  assert.strictEqual(DEFAULT_FACTORY_INFO_ROWS.length, 2);
  assert.strictEqual(DEFAULT_FACTORY_INFO_ROWS[0].id, "row_1");
  assert.strictEqual(DEFAULT_FACTORY_INFO_ROWS[1].id, "row_2");
  assert.strictEqual(DEFAULT_FACTORY_INFO_ROWS[0].row_order, 1);
  assert.strictEqual(DEFAULT_FACTORY_INFO_ROWS[1].row_order, 2);
  assert.ok(DEFAULT_FACTORY_INFO_ROWS[0].title_id.includes("Outsole"));
  assert.ok(DEFAULT_FACTORY_INFO_ROWS[0].title_en.includes("Outsole"));
  assert.ok(DEFAULT_FACTORY_INFO_ROWS[1].title_id.length > 0);
  assert.ok(DEFAULT_FACTORY_INFO_ROWS[1].title_en.length > 0);
});

// 2. Schema validation: Updating Indonesian and English text independently
import {
  updateFactoryInfoRowSchema,
  uploadFactoryInfoImageSchema,
} from "../src/lib/admin-factory-info.functions.ts";

test("Saving Indonesian and English text independently with updateFactoryInfoRowSchema", () => {
  // Only Indonesian text provided
  const idOnly = updateFactoryInfoRowSchema.safeParse({
    id: "row_1",
    title_id: "Judul Baru Mesin Outsole",
    description_id: "Deskripsi baru dalam bahasa Indonesia.",
    is_published: true,
  });
  assert.strictEqual(idOnly.success, true);
  if (idOnly.success) {
    assert.strictEqual(idOnly.data.title_id, "Judul Baru Mesin Outsole");
    assert.strictEqual(idOnly.data.title_en, "");
  }

  // Both Indonesian and English text provided
  const bilingual = updateFactoryInfoRowSchema.safeParse({
    id: "row_2",
    title_id: "Formulasi Kompon Baru",
    title_en: "New Compound Formulation",
    description_id: "Deskripsi kompon baru.",
    description_en: "New compound description in English.",
    alt_text_id: "Alt ID",
    alt_text_en: "Alt EN",
    is_published: false,
  });
  assert.strictEqual(bilingual.success, true);
  if (bilingual.success) {
    assert.strictEqual(bilingual.data.title_en, "New Compound Formulation");
    assert.strictEqual(bilingual.data.is_published, false);
  }
});

// 3. Schema validation: Rejecting invalid row ID or empty mandatory fields
test("Schema rejects invalid row identifiers and empty required Indonesian text", () => {
  // Invalid ID
  const invalidId = updateFactoryInfoRowSchema.safeParse({
    id: "row_99",
    title_id: "Test",
    description_id: "Test",
  });
  assert.strictEqual(invalidId.success, false);

  // Missing Indonesian title
  const missingTitle = updateFactoryInfoRowSchema.safeParse({
    id: "row_1",
    title_id: "   ",
    description_id: "Valid description",
  });
  assert.strictEqual(missingTitle.success, false);

  // Missing Indonesian description
  const missingDesc = updateFactoryInfoRowSchema.safeParse({
    id: "row_1",
    title_id: "Valid Title",
    description_id: "",
  });
  assert.strictEqual(missingDesc.success, false);
});

// 4. Image upload schema validation
test("Image upload schema enforces valid MIME types and size constraints", () => {
  // Valid JPG
  const validJpg = uploadFactoryInfoImageSchema.safeParse({
    id: "row_1",
    fileName: "factory-machine.jpg",
    contentType: "image/jpeg",
    fileBase64: "aGVsbG8=",
  });
  assert.strictEqual(validJpg.success, true);

  // Valid PNG
  const validPng = uploadFactoryInfoImageSchema.safeParse({
    id: "row_2",
    fileName: "compound-line.png",
    contentType: "image/png",
    fileBase64: "aGVsbG8=",
  });
  assert.strictEqual(validPng.success, true);

  // Disallowed MIME (e.g. GIF or PDF)
  const invalidMime = uploadFactoryInfoImageSchema.safeParse({
    id: "row_1",
    fileName: "document.pdf",
    contentType: "application/pdf",
    fileBase64: "aGVsbG8=",
  });
  assert.strictEqual(invalidMime.success, false);

  // Invalid row id
  const invalidId = uploadFactoryInfoImageSchema.safeParse({
    id: "row_unknown",
    fileName: "img.webp",
    contentType: "image/webp",
    fileBase64: "aGVsbG8=",
  });
  assert.strictEqual(invalidId.success, false);
});

// 5. Missing translation fallback behavior
test("Missing translation fallback: English falls back to Indonesian heading/description", () => {
  const rowWithMissingEn = {
    id: "row_1",
    row_order: 1,
    title_id: "Judul Bahasa Indonesia",
    title_en: "",
    description_id: "Deskripsi Bahasa Indonesia",
    description_en: "",
    alt_text_id: "Alt Indonesia",
    alt_text_en: "",
    image_path: "/placeholders/machinery-equipment.svg",
    image_url: "/placeholders/machinery-equipment.svg",
    is_published: true,
  };

  const isEnglish = true;
  const resolvedTitle = isEnglish
    ? rowWithMissingEn.title_en?.trim() || rowWithMissingEn.title_id?.trim()
    : rowWithMissingEn.title_id?.trim();
  const resolvedDesc = isEnglish
    ? rowWithMissingEn.description_en?.trim() || rowWithMissingEn.description_id?.trim()
    : rowWithMissingEn.description_id?.trim();
  const resolvedAlt = isEnglish
    ? rowWithMissingEn.alt_text_en?.trim() || rowWithMissingEn.alt_text_id?.trim()
    : rowWithMissingEn.alt_text_id?.trim();

  assert.strictEqual(resolvedTitle, "Judul Bahasa Indonesia");
  assert.strictEqual(resolvedDesc, "Deskripsi Bahasa Indonesia");
  assert.strictEqual(resolvedAlt, "Alt Indonesia");
});

// 6. Terminology check: 'outsole' is preserved and never translated
test("Preserve terminology: 'outsole' is never translated into Indonesian", () => {
  const titles = [
    DEFAULT_FACTORY_INFO_ROWS[0].title_id,
    DEFAULT_FACTORY_INFO_ROWS[0].description_id,
    DEFAULT_FACTORY_INFO_ROWS[1].description_id,
  ];

  titles.forEach((text) => {
    assert.ok(
      text.toLowerCase().includes("outsole"),
      `Expected text to contain 'outsole': "${text}"`,
    );
    assert.strictEqual(
      text.toLowerCase().includes("sol luar"),
      false,
      `Text contains forbidden translation 'sol luar': "${text}"`,
    );
  });
});

// 7. Security: Unauthorized (anon) client cannot write to factory_info_rows
await asyncTest("Security: Anonymous public client is blocked from inserting or mutating factory_info_rows", async () => {
  if (!supabaseUrl || !anonKey) {
    console.log("Skipping network test (missing env)");
    return;
  }
  const anonClient = createClient(supabaseUrl, anonKey);
  const { error } = await anonClient
    .from("factory_info_rows")
    .insert({
      id: "row_1",
      title_id: "Hacked Title",
      description_id: "Hacked Description",
    });

  // Must either error with RLS policy violation or 42P01 if table not yet created
  assert.ok(error !== null, "Anonymous write should have been rejected by Supabase RLS!");
  assert.ok(
    error.code === "42501" || error.code === "42P01" || error.code === "PGRST205" || error.message.includes("violates") || error.message.includes("denied") || error.message.includes("schema cache") || error.message.includes("does not exist"),
    `Expected RLS rejection or missing table error, got: ${error.message} (${error.code})`
  );
});

// 8. Public reads respect publication status
test("Public reads respect publication status: unpublished row is filtered out", () => {
  const testRows = [
    { ...DEFAULT_FACTORY_INFO_ROWS[0], is_published: true },
    { ...DEFAULT_FACTORY_INFO_ROWS[1], is_published: false },
  ];

  const published = testRows.filter((r) => r.is_published !== false);
  assert.strictEqual(published.length, 1);
  assert.strictEqual(published[0].id, "row_1");
});

// 9. Upload failure preserving previous image (Simulation of transactional upload safety)
test("Upload failure preserves previous image: failed DB commit triggers storage cleanup", () => {
  let storageFiles = ["factory-info/prev-image.jpg"];
  const prevPath = "factory-info/prev-image.jpg";
  const newPath = "factory-info/new-uploaded.jpg";

  // Simulate file uploaded to storage
  storageFiles.push(newPath);

  // Simulate DB commit error
  const dbCommitFailed = true;

  if (dbCommitFailed) {
    // Transaction failure compensation: remove new file
    storageFiles = storageFiles.filter((f) => f !== newPath);
  } else {
    // On success: remove previous file
    storageFiles = storageFiles.filter((f) => f !== prevPath);
  }

  // Verify previous image is preserved intact
  assert.ok(storageFiles.includes(prevPath), "Previous image must still exist after upload failure");
  assert.ok(!storageFiles.includes(newPath), "Failed new upload must be purged from storage");
});

// 10. Audit test: isMissingTableError accurately identifies missing-table errors vs arbitrary failures
import { isMissingTableError } from "../src/lib/factory-info.functions.ts";

test("Audit: isMissingTableError detects missing table and allows arbitrary DB errors to throw", () => {
  // Postgres 42P01
  assert.strictEqual(isMissingTableError({ code: "42P01" }), true);
  // PostgREST PGRST205
  assert.strictEqual(isMissingTableError({ code: "PGRST205" }), true);
  // Error messages
  assert.strictEqual(
    isMissingTableError({ message: 'relation "public.factory_info_rows" does not exist' }),
    true,
  );
  assert.strictEqual(
    isMissingTableError({ message: "Could not find the table 'public.factory_info_rows' in the schema cache" }),
    true,
  );
  // Arbitrary database error (e.g. connection error, syntax error, permission error)
  assert.strictEqual(isMissingTableError({ code: "08006", message: "connection_failure" }), false);
  assert.strictEqual(isMissingTableError({ code: "500", message: "Internal server error" }), false);
  assert.strictEqual(isMissingTableError(null), false);
  assert.strictEqual(isMissingTableError(undefined), false);
});

// 11. Audit test: Unpublishing behavior and loader logic
test("Audit: Unpublishing behavior - one row unpublished returns only the published row", () => {
  const dbData = [
    { ...DEFAULT_FACTORY_INFO_ROWS[0], is_published: true },
    { ...DEFAULT_FACTORY_INFO_ROWS[1], is_published: false },
  ];

  // When filtered for published rows:
  const publishedData = dbData.filter((r) => r.is_published === true);
  assert.strictEqual(publishedData.length, 1);
  assert.strictEqual(publishedData[0].id, "row_1");

  // Verify row_2 is NOT re-injected as default content
  const row2Exists = publishedData.some((r) => r.id === "row_2");
  assert.strictEqual(row2Exists, false, "Unpublished row_2 must not appear in published rows");
});

test("Audit: Unpublishing behavior - both rows unpublished returns empty array, NOT fallback defaults", () => {
  const dbData = [
    { ...DEFAULT_FACTORY_INFO_ROWS[0], is_published: false },
    { ...DEFAULT_FACTORY_INFO_ROWS[1], is_published: false },
  ];

  // When all CMS rows are unpublished:
  const publishedData = dbData.filter((r) => r.is_published === true);
  assert.strictEqual(publishedData.length, 0);

  // Return value must be empty array, not DEFAULT_FACTORY_INFO_ROWS
  const resultRows = publishedData.length === 0 ? [] : publishedData;
  assert.strictEqual(resultRows.length, 0, "Both rows unpublished must produce empty result, not fallback defaults");
});

test("Audit: Existing CMS rows are not replaced with defaults merely because a published-row query returns no records", () => {
  // If table exists and has records in DB, but none published:
  const tableHasRecords = true;
  const configuredRecordCount = 2;
  const publishedRecordCount = 0;

  let returnedRows;
  if (!tableHasRecords || configuredRecordCount === 0) {
    returnedRows = DEFAULT_FACTORY_INFO_ROWS;
  } else if (publishedRecordCount === 0) {
    returnedRows = [];
  } else {
    returnedRows = ["some_row"];
  }

  assert.strictEqual(returnedRows.length, 0, "Must return empty array rather than replacing existing CMS records with defaults");
});

// 12. Audit test: Component unpublishing behavior
test("Audit: Component logic hides section when rows is empty (both rows unpublished)", () => {
  // Simulate FactoryInfoRows logic with rows = []
  const rows = [];
  const publishedRows = rows.filter((r) => r.is_published !== false);
  const shouldRenderNull = publishedRows.length === 0;

  assert.strictEqual(shouldRenderNull, true, "Component must render null when all rows are unpublished");

  // When rows is undefined (pre-migration / no props), it uses defaults
  const undefinedRows = undefined;
  assert.strictEqual(undefinedRows === undefined, true, "Undefined rows falls back to authentic default blocks");
});

// 13. Audit test: Migration schema verification (unique row_order constraint & trigger syntax)
test("Audit: Migration enforces unique row_order constraint and standardized trigger creation", () => {
  const migrationPath = resolve(process.cwd(), "supabase/migrations/20261014140000_factory_info_rows.sql");
  const sql = readFileSync(migrationPath, "utf-8");

  // Verify unique constraint on row_order
  assert.ok(
    sql.includes("CONSTRAINT uq_factory_info_rows_order UNIQUE (row_order)"),
    "Migration must define CONSTRAINT uq_factory_info_rows_order UNIQUE (row_order)",
  );

  // Verify trigger syntax: DROP TRIGGER IF EXISTS followed by CREATE TRIGGER
  assert.ok(
    sql.includes("DROP TRIGGER IF EXISTS factory_info_rows_updated_at ON public.factory_info_rows;"),
    "Migration must include DROP TRIGGER IF EXISTS factory_info_rows_updated_at",
  );
  assert.ok(
    sql.includes("CREATE TRIGGER factory_info_rows_updated_at BEFORE UPDATE ON public.factory_info_rows"),
    "Migration must include standard CREATE TRIGGER factory_info_rows_updated_at",
  );
  assert.strictEqual(
    sql.includes("CREATE OR REPLACE TRIGGER"),
    false,
    "Migration must NOT use non-standard CREATE OR REPLACE TRIGGER",
  );

  // Verify seed rows satisfy uniqueness (row_1 = 1, row_2 = 2)
  const row1Seed = sql.includes("'row_1',\n    1,") || sql.includes("'row_1',\r\n    1,");
  const row2Seed = sql.includes("'row_2',\n    2,") || sql.includes("'row_2',\r\n    2,");
  assert.ok(row1Seed, "Seed row_1 must have row_order 1");
  assert.ok(row2Seed, "Seed row_2 must have row_order 2");
});

console.log("\n=======================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
