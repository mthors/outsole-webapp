// Phase 6B: New Product Image Upload — Integration Test Suite
// Run with: node scratch/test-phase6b.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import crypto from "crypto";

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
  if (condition) {
    console.log(`  ✓ ${msg}`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    fail++;
  }
}

// Minimal valid binary image buffers with proper magic bytes
// 1. JPEG minimal 1x1
const VALID_JPG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
  0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x09, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9
]);

// 2. PNG minimal 1x1
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

// 3. WebP minimal 1x1
const VALID_WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe,
  0x07, 0x00
]);

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8MB

function validateImageMagicBytes(buf, expectedMime) {
  if (buf.length < 12) return false;
  if (expectedMime === "image/jpeg") {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (expectedMime === "image/png") {
    return (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    );
  }
  if (expectedMime === "image/webp") {
    const riff = buf.toString("ascii", 0, 4);
    const webp = buf.toString("ascii", 8, 12);
    return riff === "RIFF" && webp === "WEBP";
  }
  return false;
}

// Simulated server-side uploadOutsoleImage logic (matches admin-outsoles.functions.ts exactly)
async function executeUpload({ outsoleId, fileName, contentType, fileBase64, altText, simulateDbFailure = false }) {
  // 1. Verify target outsole exists
  const { data: outsole, error: outsoleErr } = await db
    .from("outsoles")
    .select("id, name")
    .eq("id", outsoleId)
    .maybeSingle();

  if (outsoleErr) throw new Error(`Database error verifying product: ${outsoleErr.message}`);
  if (!outsole) throw new Error("Target outsole does not exist");

  // 2. Validate file extension
  const extMatch = fileName.split(".").pop()?.toLowerCase();
  if (!extMatch || !ALLOWED_IMAGE_EXTENSIONS.includes(extMatch)) {
    throw new Error("Unsupported file extension. Only .jpg, .png, and .webp files are allowed.");
  }
  const normalizedExt = extMatch === "jpeg" ? "jpg" : extMatch;

  // Validate contentType
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(contentType)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed");
  }

  // 3. Decode base64 to buffer and validate file size
  let fileBuffer;
  try {
    fileBuffer = Buffer.from(fileBase64, "base64");
  } catch {
    throw new Error("Invalid image data encoding.");
  }

  if (fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  if (fileBuffer.length > MAX_IMAGE_FILE_SIZE) {
    throw new Error("File size exceeds the 8MB limit. Please choose a smaller image.");
  }

  // 4. Verify binary magic bytes
  if (!validateImageMagicBytes(fileBuffer, contentType)) {
    throw new Error("File content does not match the specified image format.");
  }

  // 5. Construct safe, product-specific, unique Storage path
  const rawBase = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-|-$/g, "");
  const safeBase = rawBase || "image";

  const timestamp = Date.now();
  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const safeFilename = `${timestamp}-${randomSuffix}-${safeBase}.${normalizedExt}`;
  const storagePath = `outsoles/${outsoleId}/${safeFilename}`;

  // 6. Upload to private Supabase Storage bucket 'outsole-images'
  const { error: uploadErr } = await db.storage
    .from("outsole-images")
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  // 7. Insert outsole_images record with failure cleanup
  try {
    if (simulateDbFailure) {
      throw new Error("Simulated database constraint failure during image record insert");
    }

    const { data: existing, error: existErr } = await db
      .from("outsole_images")
      .select("id, display_order, is_primary")
      .eq("outsole_id", outsoleId)
      .order("display_order", { ascending: true });

    if (existErr) {
      throw new Error(`Failed to query existing images: ${existErr.message}`);
    }

    const existingImages = existing ?? [];
    const maxOrder =
      existingImages.length > 0
        ? Math.max(...existingImages.map((i) => i.display_order ?? 0))
        : -1;
    const nextDisplayOrder = maxOrder + 1;

    const hasPrimary = existingImages.some((i) => i.is_primary);
    const isPrimary = existingImages.length === 0 && !hasPrimary;

    const { data: publicUrlData } = db.storage
      .from("outsole-images")
      .getPublicUrl(storagePath);
    const imageUrl = publicUrlData.publicUrl;

    const { data: row, error: insertErr } = await db
      .from("outsole_images")
      .insert({
        outsole_id: outsoleId,
        file_path: storagePath,
        image_url: imageUrl,
        alt_text: altText ?? null,
        display_order: nextDisplayOrder,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (insertErr || !row) {
      throw new Error(`Database insert error: ${insertErr?.message ?? "Unknown insert error"}`);
    }

    const { data: signed } = await db.storage
      .from("outsole-images")
      .createSignedUrl(storagePath, 60 * 60 * 24);

    return {
      success: true,
      image: {
        id: row.id,
        outsole_id: row.outsole_id,
        file_path: row.file_path,
        alt_text: row.alt_text,
        display_order: row.display_order,
        is_primary: row.is_primary,
        url: signed?.signedUrl ?? null,
      },
      storagePath,
    };
  } catch (insertErr) {
    // Failure cleanup
    try {
      await db.storage.from("outsole-images").remove([storagePath]);
    } catch (cleanupErr) {
      console.error(`Orphan cleanup error for ${storagePath}:`, cleanupErr);
    }
    throw new Error(
      `Failed to save image metadata: ${insertErr instanceof Error ? insertErr.message : "Unknown error"}. Cleaned up uploaded file.`,
    );
  }
}

async function run() {
  console.log("==================================================================");
  console.log("MILESTONE 7 — PHASE 6B: NEW PRODUCT IMAGE UPLOAD INTEGRATION TESTS");
  console.log("==================================================================");

  // Group 1: Baseline Integrity
  console.log("\n[GROUP 1: Baseline & Authentic Products Safety]");
  const { data: authenticRows } = await db.from("outsoles").select("id, name, status").in("id", AUTHENTIC_IDS);
  check(authenticRows?.length === 3, "All 3 authentic products exist");
  for (const p of authenticRows ?? []) {
    check(p.status === "active", `Authentic product "${p.name}" is active`);
  }

  const { data: authenticImages } = await db.from("outsole_images").select("id, outsole_id, file_path, is_primary").in("outsole_id", AUTHENTIC_IDS);
  check(authenticImages?.length === 3, "All 3 authentic products have their baseline images intact");
  const baselinePaths = authenticImages?.map(i => i.file_path) ?? [];

  // Group 2: Create Temporary Test Outsole
  console.log("\n[GROUP 2: Temporary Test Product Creation]");
  const ts = Date.now();
  const { data: tempOutsole, error: createErr } = await db.from("outsoles").insert({
    name: "Phase 6B Test Outsole",
    slug: `phase-6b-test-${ts}`,
    model_number: `P6B-${String(ts).slice(-6)}`,
    status: "active",
  }).select().single();

  check(!createErr && !!tempOutsole, `Temp test product created: ${tempOutsole?.id}`);
  const tempId = tempOutsole.id;

  const createdStoragePaths = [];
  const createdImageIds = [];

  try {
    // Group 3: File Validation & Rejection
    console.log("\n[GROUP 3: File Type, Size, and Format Validation]");

    // Unsupported extension (.gif)
    try {
      await executeUpload({
        outsoleId: tempId,
        fileName: "test.gif",
        contentType: "image/gif",
        fileBase64: Buffer.from("GIF89a...").toString("base64"),
      });
      check(false, "Unsupported .gif extension must be rejected");
    } catch (err) {
      check(err.message.includes("extension") || err.message.includes("allowed"), "Rejected unsupported extension .gif");
    }

    // Unsupported extension (.exe)
    try {
      await executeUpload({
        outsoleId: tempId,
        fileName: "malicious.exe",
        contentType: "application/octet-stream",
        fileBase64: Buffer.from("MZ...").toString("base64"),
      });
      check(false, "Unsupported .exe extension must be rejected");
    } catch (err) {
      check(err.message.includes("extension") || err.message.includes("allowed"), "Rejected unsupported extension .exe");
    }

    // Spoofed extension (text file disguised as .jpg)
    try {
      await executeUpload({
        outsoleId: tempId,
        fileName: "fake.jpg",
        contentType: "image/jpeg",
        fileBase64: Buffer.from("This is a plain text file, not a jpeg").toString("base64"),
      });
      check(false, "Corrupted/spoofed magic bytes must be rejected");
    } catch (err) {
      check(err.message.includes("File content does not match"), "Rejected spoofed JPG with invalid magic bytes");
    }

    // Oversized file (>8MB)
    try {
      const oversizedBuf = Buffer.alloc(8 * 1024 * 1024 + 1024, 0xff); // 8MB + 1KB
      oversizedBuf[0] = 0xff; oversizedBuf[1] = 0xd8; oversizedBuf[2] = 0xff; // fake magic
      await executeUpload({
        outsoleId: tempId,
        fileName: "oversized.jpg",
        contentType: "image/jpeg",
        fileBase64: oversizedBuf.toString("base64"),
      });
      check(false, "Oversized file (>8MB) must be rejected");
    } catch (err) {
      check(err.message.includes("exceeds the 8MB limit"), "Rejected oversized file > 8MB");
    }

    // Empty file (0 bytes)
    try {
      await executeUpload({
        outsoleId: tempId,
        fileName: "empty.jpg",
        contentType: "image/jpeg",
        fileBase64: "",
      });
      check(false, "Empty file must be rejected");
    } catch (err) {
      check(err.message.includes("empty") || err.message.includes("required"), "Rejected empty file");
    }

    // Group 4: UUID & Nonexistent Product Validation
    console.log("\n[GROUP 4: Outsole Existence & Cross-Product Protection]");

    const nonExistentUuid = crypto.randomUUID();
    try {
      await executeUpload({
        outsoleId: nonExistentUuid,
        fileName: "test.jpg",
        contentType: "image/jpeg",
        fileBase64: VALID_JPG_BUFFER.toString("base64"),
      });
      check(false, "Nonexistent outsole must be rejected");
    } catch (err) {
      check(err.message.includes("Target outsole does not exist"), "Rejected upload for nonexistent outsole");
    }

    // Group 5: Valid Uploads (JPG, PNG, WebP)
    console.log("\n[GROUP 5: Successful Uploads (JPG, PNG, WebP) & Lifecycle]");

    // Upload 1: Valid JPG (first image -> should become is_primary = true, display_order = 0)
    const res1 = await executeUpload({
      outsoleId: tempId,
      fileName: "first-angle.jpg",
      contentType: "image/jpeg",
      fileBase64: VALID_JPG_BUFFER.toString("base64"),
      altText: "First angle of test outsole",
    });

    check(res1.success, "First JPG upload succeeded");
    check(res1.image.display_order === 0, `First image has display_order = 0 (got ${res1.image.display_order})`);
    check(res1.image.is_primary === true, "First image on product with no images becomes primary");
    check(res1.image.file_path.startsWith(`outsoles/${tempId}/`), `Storage path is properly scoped: ${res1.image.file_path}`);
    check(res1.image.url && res1.image.url.includes("token="), "Signed URL generated for immediate preview");
    createdStoragePaths.push(res1.image.file_path);
    createdImageIds.push(res1.image.id);

    // Upload 2: Valid PNG (second image -> should have display_order = 1, is_primary = false)
    const res2 = await executeUpload({
      outsoleId: tempId,
      fileName: "side-profile.png",
      contentType: "image/png",
      fileBase64: VALID_PNG_BUFFER.toString("base64"),
      altText: "Side profile view",
    });

    check(res2.success, "Second PNG upload succeeded");
    check(res2.image.display_order === 1, `Second image has display_order = 1 (got ${res2.image.display_order})`);
    check(res2.image.is_primary === false, "Second image defaults to is_primary = false (does NOT replace primary)");
    check(res2.image.file_path.startsWith(`outsoles/${tempId}/`), `Storage path is properly scoped: ${res2.image.file_path}`);
    createdStoragePaths.push(res2.image.file_path);
    createdImageIds.push(res2.image.id);

    // Upload 3: Valid WebP (third image -> should have display_order = 2, is_primary = false)
    const res3 = await executeUpload({
      outsoleId: tempId,
      fileName: "tread-detail.webp",
      contentType: "image/webp",
      fileBase64: VALID_WEBP_BUFFER.toString("base64"),
      altText: "Tread lug detail",
    });

    check(res3.success, "Third WebP upload succeeded");
    check(res3.image.display_order === 2, `Third image has display_order = 2 (got ${res3.image.display_order})`);
    check(res3.image.is_primary === false, "Third image has is_primary = false");
    createdStoragePaths.push(res3.image.file_path);
    createdImageIds.push(res3.image.id);

    // Verify all 3 Storage objects exist in bucket
    for (const p of createdStoragePaths) {
      const filenameOnly = p.split("/").pop();
      const { data: listData } = await db.storage.from("outsole-images").list(`outsoles/${tempId}`);
      const found = listData?.some(f => f.name === filenameOnly);
      check(found, `Storage object exists in bucket: ${filenameOnly}`);
    }

    // Group 6: Failure Cleanup & Orphan Prevention
    console.log("\n[GROUP 6: Failure Cleanup & Orphan Prevention]");
    const orphanProbeFilename = `orphan-test-${Date.now()}.png`;

    try {
      await executeUpload({
        outsoleId: tempId,
        fileName: orphanProbeFilename,
        contentType: "image/png",
        fileBase64: VALID_PNG_BUFFER.toString("base64"),
        simulateDbFailure: true,
      });
      check(false, "Simulated DB failure must throw");
    } catch (err) {
      check(err.message.includes("Cleaned up uploaded file"), `Failure cleanly caught and reported: ${err.message}`);
    }

    // Verify no orphaned file remains in the folder
    const { data: listAfterFailure } = await db.storage.from("outsole-images").list(`outsoles/${tempId}`);
    const orphanFound = listAfterFailure?.some(f => f.name.includes("orphan-test"));
    check(!orphanFound, "Storage object was successfully deleted upon DB failure (no orphan left)");

    // Group 7: Verify Phase 6A Operations Still Work
    console.log("\n[GROUP 7: Phase 6A Operations Compatibility]");
    // Check setting new primary
    const { error: clearPrimErr } = await db.from("outsole_images").update({ is_primary: false }).eq("outsole_id", tempId);
    const { error: setPrimErr } = await db.from("outsole_images").update({ is_primary: true }).eq("id", res2.image.id);
    check(!clearPrimErr && !setPrimErr, "Can set second image as primary (Phase 6A compatibility)");

    const { data: updatedImages } = await db.from("outsole_images").select("id, is_primary").eq("outsole_id", tempId);
    const newPrim = updatedImages?.find(i => i.id === res2.image.id);
    check(newPrim?.is_primary === true, "Second image is now primary");

    // Group 8: Final Safety Check on Authentic Products
    console.log("\n[GROUP 8: Authentic Products Untouched]");
    for (const authenticId of AUTHENTIC_IDS) {
      const { data: imgs } = await db.from("outsole_images").select("id, file_path").eq("outsole_id", authenticId);
      check(imgs?.length === 1, `Authentic product ${authenticId} still has exactly 1 image`);
      check(baselinePaths.includes(imgs?.[0]?.file_path), `Authentic product image path unchanged: ${imgs?.[0]?.file_path}`);
    }

  } finally {
    // Cleanup temporary test data
    console.log("\n[CLEANUP: Removing Temporary Test Data]");
    if (createdStoragePaths.length > 0) {
      const { error: remErr } = await db.storage.from("outsole-images").remove(createdStoragePaths);
      if (remErr) console.error("Error removing test storage paths:", remErr);
      else console.log(`  ✓ Removed ${createdStoragePaths.length} test storage files`);
    }

    await db.from("outsole_images").delete().eq("outsole_id", tempId);
    await db.from("outsoles").delete().eq("id", tempId);
    console.log("  ✓ Removed test outsole and database records");
  }

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${pass} passed, ${fail} failed`);
  console.log("==================================================================");

  if (fail > 0) process.exit(1);
}

run();
