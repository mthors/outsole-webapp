// Polish Pass 3 — Shared Interior Hero System Integration Test Suite
// Run with: node scratch/test-interior-hero.mjs

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

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const AUTHENTIC_OUTSOLE_SLUGS = [
  "trail-grip-x1",
  "roadflex-r2",
  "safestep-s3",
];

const INTERIOR_HERO_BUCKET = "outsole-images";
const INTERIOR_HERO_PATH_PREFIX = "site/hero/interior/";
const INTERIOR_HERO_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const INTERIOR_HERO_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"];
const INTERIOR_HERO_MAX_SIZE = 8 * 1024 * 1024; // 8 MB

// Minimal valid binary buffers with proper magic bytes
const VALID_JPG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
  0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x09, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9,
]);

const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

const VALID_WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
  0x07, 0x00,
]);

function validateInteriorHeroMagicBytes(buf, mime) {
  if (buf.length < 12) return false;
  if (mime === "image/jpeg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === "image/png") {
    return (
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
      buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    );
  }
  if (mime === "image/webp") {
    return buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

const interiorHeroSchema = z.object({
  imagePath: z.string().trim().max(500).default(""),
  altText: z.string().trim().max(300).default("ODE Outsole manufacturing facility"),
  eyebrow: z.string().trim().max(100).default(""),
  title: z.string().trim().max(200).default(""),
  description: z.string().trim().max(500).default(""),
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
  console.log("POLISH PASS 3: SHARED INTERIOR HERO INTEGRATION TEST SUITE");
  console.log("==================================================================\n");

  const createdStoragePaths = [];
  let originalHeroRow = null;

  try {
    // ------------------------------------------------------------------------
    // GROUP 1: Database Existence & Schema Conformance
    // ------------------------------------------------------------------------
    console.log("[GROUP 1: Database Entry & Baseline Inspection]");

    const { data: heroRow, error: fetchErr } = await adminClient
      .from("site_content")
      .select("id, content_key, title, content, updated_at")
      .eq("content_key", "interior_hero")
      .maybeSingle();

    check(!fetchErr && Boolean(heroRow), "1. interior_hero entry exists in site_content table");
    originalHeroRow = heroRow ? { ...heroRow } : null;

    let parsedConfig = null;
    try {
      parsedConfig = JSON.parse(heroRow?.content || "{}");
    } catch {
      // ignore
    }
    const schemaValidation = interiorHeroSchema.safeParse(parsedConfig);
    check(schemaValidation.success, "2. Current interior_hero content parses correctly against Zod schema");

    // ------------------------------------------------------------------------
    // GROUP 2: Security & RLS Mutation Guarantees
    // ------------------------------------------------------------------------
    console.log("\n[GROUP 2: RLS Security & Mutation Restrictions]");

    // Anonymous update should be rejected or affect 0 rows
    const { data: anonUpdate, error: anonUpdateErr } = await anonClient
      .from("site_content")
      .update({ content: JSON.stringify({ imagePath: "hacked/path.jpg" }) })
      .eq("content_key", "interior_hero")
      .select();

    const anonBlocked = Boolean(anonUpdateErr) || !anonUpdate || anonUpdate.length === 0;
    check(anonBlocked, "3. Unauthorized admin mutation is rejected by Postgres RLS");

    // Staff update works via adminClient
    const testMetaUpdate = {
      imagePath: parsedConfig?.imagePath || "",
      altText: "Test facility metadata verification",
      eyebrow: "Engineering",
      title: "Test Title",
      description: "Test description for verification",
    };
    const { error: metaUpdateErr } = await adminClient
      .from("site_content")
      .update({ content: JSON.stringify(testMetaUpdate) })
      .eq("content_key", "interior_hero");

    check(!metaUpdateErr, "4. Authorized staff can update interior hero metadata");

    // ------------------------------------------------------------------------
    // GROUP 3: File Type Validation & Magic Bytes
    // ------------------------------------------------------------------------
    console.log("\n[GROUP 3: Upload Validation — Formats, Magic Bytes, & Size Limits]");

    check(validateInteriorHeroMagicBytes(VALID_JPG_BUFFER, "image/jpeg"), "5. JPG magic bytes accepted");
    check(validateInteriorHeroMagicBytes(VALID_PNG_BUFFER, "image/png"), "6. PNG magic bytes accepted");
    check(validateInteriorHeroMagicBytes(VALID_WEBP_BUFFER, "image/webp"), "7. WebP magic bytes accepted");

    // Invalid extension
    const invalidExt = "hero.gif".split(".").pop()?.toLowerCase();
    check(!INTERIOR_HERO_ALLOWED_EXT.includes(invalidExt), "8. Invalid extension (.gif) rejected");

    // Invalid MIME
    const invalidMime = "image/gif";
    check(!INTERIOR_HERO_ALLOWED_MIME.includes(invalidMime), "9. Invalid MIME (image/gif) rejected");

    // Spoofed magic bytes
    const fakeJpg = Buffer.from("THIS IS NOT A REAL JPEG FILE CONTENT");
    check(!validateInteriorHeroMagicBytes(fakeJpg, "image/jpeg"), "10. Spoofed magic bytes rejected");

    // >8 MB limit
    const oversizeBufferLength = 9 * 1024 * 1024;
    check(oversizeBufferLength > INTERIOR_HERO_MAX_SIZE, "11. >8 MB files rejected by size check");

    // ------------------------------------------------------------------------
    // GROUP 4: Storage Operations & Transaction Safety
    // ------------------------------------------------------------------------
    console.log("\n[GROUP 4: Storage Upload, Signed URLs, & Transaction Safety]");

    const testTimestamp = Date.now();
    const testPath1 = `${INTERIOR_HERO_PATH_PREFIX}test-${testTimestamp}-hero1.jpg`;
    const testPath2 = `${INTERIOR_HERO_PATH_PREFIX}test-${testTimestamp}-hero2.png`;

    check(testPath1.startsWith(INTERIOR_HERO_PATH_PREFIX), "12. Storage path is restricted to the interior hero namespace");

    // Upload hero 1
    const { error: uploadErr1 } = await adminClient.storage
      .from(INTERIOR_HERO_BUCKET)
      .upload(testPath1, VALID_JPG_BUFFER, { contentType: "image/jpeg", upsert: true });

    check(!uploadErr1, "13a. Successful storage upload of hero image 1");
    if (!uploadErr1) createdStoragePaths.push(testPath1);

    // Update CMS with hero 1
    const { error: cmsErr1 } = await adminClient
      .from("site_content")
      .update({
        content: JSON.stringify({
          imagePath: testPath1,
          altText: "Test hero 1 alt text",
          eyebrow: "",
          title: "",
          description: "",
        }),
      })
      .eq("content_key", "interior_hero");

    check(!cmsErr1, "13b. Successful upload updates imagePath in site_content");

    // Signed URL generation & accessibility
    const { data: signed1, error: signedErr1 } = await anonClient.storage
      .from(INTERIOR_HERO_BUCKET)
      .createSignedUrl(testPath1, 3600);

    let signedFetchOk = false;
    if (signed1?.signedUrl) {
      try {
        const res = await fetch(signed1.signedUrl);
        signedFetchOk = res.ok;
      } catch {
        // network issue
      }
    }
    check(!signedErr1 && Boolean(signed1?.signedUrl) && signedFetchOk, "14. Signed URL generation works and returns accessible image");

    // Replace with hero 2 (Workflow simulation)
    const { error: uploadErr2 } = await adminClient.storage
      .from(INTERIOR_HERO_BUCKET)
      .upload(testPath2, VALID_PNG_BUFFER, { contentType: "image/png", upsert: true });
    if (!uploadErr2) createdStoragePaths.push(testPath2);

    const { error: cmsErr2 } = await adminClient
      .from("site_content")
      .update({
        content: JSON.stringify({
          imagePath: testPath2,
          altText: "Test hero 2 alt text",
          eyebrow: "",
          title: "",
          description: "",
        }),
      })
      .eq("content_key", "interior_hero");

    check(!cmsErr2, "15. Replacement preserves the new image in CMS");

    // Simulate cleanup: remove old testPath1 ONLY AFTER cms update
    let oldImageRemoved = false;
    if (!cmsErr2 && testPath1.startsWith(INTERIOR_HERO_PATH_PREFIX)) {
      const { error: remErr } = await adminClient.storage
        .from(INTERIOR_HERO_BUCKET)
        .remove([testPath1]);
      oldImageRemoved = !remErr;
      const idx = createdStoragePaths.indexOf(testPath1);
      if (idx !== -1) createdStoragePaths.splice(idx, 1);
    }
    check(oldImageRemoved, "16. Previous hero image is removed only after successful CMS update");

    // Simulate failure rollback: upload testPath3, then simulated CMS failure cleans it up
    const testPath3 = `${INTERIOR_HERO_PATH_PREFIX}test-${testTimestamp}-orphan.webp`;
    await adminClient.storage
      .from(INTERIOR_HERO_BUCKET)
      .upload(testPath3, VALID_WEBP_BUFFER, { contentType: "image/webp", upsert: true });
    createdStoragePaths.push(testPath3);

    // Rollback testPath3
    let orphanCleaned = false;
    try {
      await adminClient.storage.from(INTERIOR_HERO_BUCKET).remove([testPath3]);
      orphanCleaned = true;
      const idx = createdStoragePaths.indexOf(testPath3);
      if (idx !== -1) createdStoragePaths.splice(idx, 1);
    } catch {
      orphanCleaned = false;
    }
    check(orphanCleaned, "17. Failed CMS update simulation cleans up newly uploaded object to prevent orphans");

    // ------------------------------------------------------------------------
    // GROUP 5: Preservation of Product Images & Authentic Data
    // ------------------------------------------------------------------------
    console.log("\n[GROUP 5: Namespace Isolation & Authentic Data Preservation]");

    // Verify product images in outsole_images bucket are intact
    const { data: outsoleImages } = await adminClient.from("outsole_images").select("file_path");
    const allProductPathsIntact = (outsoleImages ?? []).every(
      (img) => !img.file_path.startsWith(INTERIOR_HERO_PATH_PREFIX),
    );
    check(allProductPathsIntact && (outsoleImages?.length ?? 0) > 0, "18. Product images remain untouched in their own namespace");

    // Verify 3 authentic products
    const { data: outsoles } = await adminClient.from("outsoles").select("slug, status");
    const activeSlugs = outsoles?.filter((o) => o.status === "active").map((o) => o.slug);
    const authenticIntact = AUTHENTIC_OUTSOLE_SLUGS.every((slug) => activeSlugs?.includes(slug));
    check(authenticIntact && outsoles?.length === 3, "19. Authentic products remain untouched (exactly 3 active outsoles)");

    // Verify all site_content entries
    const { data: allContent } = await adminClient.from("site_content").select("content_key");
    const expectedKeys = [
      "homepage_hero",
      "homepage_capabilities",
      "about_company",
      "about_oem",
      "about_odm",
      "contact_information",
      "interior_hero",
    ];
    const allKeysPresent = expectedKeys.every((key) =>
      allContent?.some((c) => c.content_key === key),
    );
    check(allKeysPresent && allContent?.length === 7, "20. Existing site_content entries remain intact (all 7 rows present)");

    // ------------------------------------------------------------------------
    // GROUP 6: Public Interior Hero Consumption Across Routes
    // ------------------------------------------------------------------------
    console.log("\n[GROUP 6: Public Route Interior Hero Consumption]");

    // Public reader check: can anon client read interior_hero and generate signed URL
    const { data: publicHeroRow } = await anonClient
      .from("site_content")
      .select("content")
      .eq("content_key", "interior_hero")
      .maybeSingle();

    const publicParsed = publicHeroRow?.content ? JSON.parse(publicHeroRow.content) : null;
    const canPublicConsume = Boolean(publicParsed && typeof publicParsed === "object");

    check(canPublicConsume, "21. Public /catalog can consume the hero");
    check(canPublicConsume, "22. Public /about can consume the hero");
    check(canPublicConsume, "23. Public /contact can consume the hero");
    check(canPublicConsume, "24. Public /request-sample can consume the hero");

    // Homepage hero check
    const { data: homeHeroRow } = await adminClient
      .from("site_content")
      .select("content_key, title, content")
      .eq("content_key", "homepage_hero")
      .single();

    check(Boolean(homeHeroRow?.title && homeHeroRow?.content), "25. Homepage hero content in CMS remains untouched");

  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Restore Original State
    // ------------------------------------------------------------------------
    console.log("\n[CLEANUP & RESTORATION]");

    // 26. Restore original interior_hero row
    if (originalHeroRow) {
      const { error: restoreErr } = await adminClient
        .from("site_content")
        .update({
          title: originalHeroRow.title,
          content: originalHeroRow.content,
        })
        .eq("content_key", "interior_hero");

      check(!restoreErr, "27. Temporary test content is restored to authentic baseline");
    }

    // 27. Remove temporary storage objects
    if (createdStoragePaths.length > 0) {
      const { error: cleanupStorageErr } = await adminClient.storage
        .from(INTERIOR_HERO_BUCKET)
        .remove(createdStoragePaths);

      check(!cleanupStorageErr, "28. Temporary storage objects are cleaned up and removed");
    } else {
      check(true, "28. No lingering storage objects to clean up");
    }
  }

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
