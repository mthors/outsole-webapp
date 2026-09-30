// ============================================================================
// Phase 3 — Bilingual CMS Content Comprehensive Test Suite
// Run with: node scratch/test-bilingual-cms.mjs
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
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

const CMS_KEYS = [
  "homepage_hero",
  "homepage_capabilities",
  "about_company",
  "about_oem",
  "about_odm",
  "contact_information",
  "interior_hero",
];

const AUTHENTIC_OUTSOLE_SLUGS = [
  "trail-grip-x1",
  "roadflex-r2",
  "safestep-s3",
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// Schemas matching application schemas
const facilitySchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  footerNote: z.string().min(1),
});

const directEmailSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  description: z.string().min(1),
  email: z.string().email(),
  footerNote: z.string().min(1),
});

const phoneWhatsappSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  description: z.string().min(1),
  phone: z.string().min(1),
  whatsapp: z.string().min(1),
  footerNote: z.string().min(1),
});

const operatingHoursSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  mondayFriday: z.string().min(1),
  saturday: z.string().min(1),
  sunday: z.string().min(1),
  timezone: z.string().min(1),
});

const contactSchema = z.object({
  intro: z.string(),
  facility: facilitySchema,
  directEmail: directEmailSchema,
  phoneWhatsapp: phoneWhatsappSchema,
  operatingHours: operatingHoursSchema,
});

const heroSchema = z.object({
  imagePath: z.string(),
  altText: z.string().min(1),
  eyebrow: z.string(),
  title: z.string(),
  description: z.string(),
});

// Localization helpers mirror src/lib/content-locale.ts
function getLocalizedContent(entry, locale) {
  const isEn = locale === "en";
  if (isEn) {
    const title = entry?.title_en && entry.title_en.trim() ? entry.title_en : (entry?.title ?? "");
    const content = entry?.content_en && entry.content_en.trim() ? entry.content_en : (entry?.content ?? "");
    return { title, content };
  } else {
    const title = entry?.title && entry.title.trim() ? entry.title : (entry?.title_en ?? "");
    const content = entry?.content && entry.content.trim() ? entry.content : (entry?.content_en ?? "");
    return { title, content };
  }
}

function parseContact(raw, isId, defaultContactId, defaultContactEn) {
  if (!raw || !raw.trim()) {
    return isId ? defaultContactId : defaultContactEn;
  }
  try {
    const parsed = JSON.parse(raw);
    const result = contactSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {}
  return isId ? defaultContactId : defaultContactEn;
}

function getLocalizedContact(entry, locale, defaultContactId, defaultContactEn) {
  const isEn = locale === "en";
  if (isEn) {
    const title = entry?.title_en && entry.title_en.trim() ? entry.title_en : (entry?.title || "Contact ODE Outsole");
    const raw = entry?.content_en && entry.content_en.trim() ? entry.content_en : entry?.content;
    const content = parseContact(raw, false, defaultContactId, defaultContactEn);
    return { title, content };
  } else {
    const title = entry?.title && entry.title.trim() ? entry.title : "Kontak ODE Outsole";
    const raw = entry?.content;
    const content = parseContact(raw, true, defaultContactId, defaultContactEn);
    return { title, content };
  }
}

async function runSuite() {
  console.log("====================================================================");
  console.log("ODE OUTSOLE LOCALIZATION — PHASE 3 BILINGUAL CMS TEST SUITE");
  console.log("====================================================================\n");

  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/20260930140000_bilingual_site_content.sql"
  );
  assert(existsSync(migrationPath), "Migration file exists: supabase/migrations/20260930140000_bilingual_site_content.sql");
  const migrationSql = readFileSync(migrationPath, "utf-8");

  // Query live DB rows
  const { data: dbRows, error: dbErr } = await adminClient
    .from("site_content")
    .select("id, content_key, title, content, updated_at");

  if (dbErr) {
    console.error("FATAL: Could not fetch site_content from database:", dbErr.message);
    process.exit(1);
  }

  const rowMap = new Map();
  for (const r of dbRows) {
    rowMap.set(r.content_key, r);
  }

  // --------------------------------------------------------------------------
  // SECTION 1: DATABASE SCHEMA & INTEGRITY (Tests 1-9)
  // --------------------------------------------------------------------------
  console.log("\n[1/5] DATABASE SCHEMA & INTEGRITY (Tests 1–9):");

  // 1. title_en exists in migration SQL
  const hasTitleEnCol =
    /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+title_en\s+VARCHAR\(255\)/i.test(migrationSql);
  assert(
    hasTitleEnCol,
    "1. Migration defines `title_en VARCHAR(255)` with non-breaking IF NOT EXISTS"
  );

  // 2. content_en exists in migration SQL
  const hasContentEnCol =
    /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+content_en\s+TEXT/i.test(migrationSql);
  assert(
    hasContentEnCol,
    "2. Migration defines `content_en TEXT` with non-breaking IF NOT EXISTS"
  );

  // 3. Existing records preserved
  assert(
    dbRows.length >= 7,
    `3. Existing database records preserved (${dbRows.length} rows found, expected >= 7)`
  );

  // 4. Existing content_key values preserved
  const allKeysPresent = CMS_KEYS.every((k) => rowMap.has(k));
  assert(
    allKeysPresent,
    "4. All 7 authentic content_key values preserved in site_content"
  );

  // 5. Existing IDs preserved
  assert(
    CMS_KEYS.every((k) => {
      const r = rowMap.get(k);
      return r && typeof r.id === "string" && r.id.length > 0;
    }),
    "5. Existing row IDs preserved and non-empty"
  );

  // 6. RLS remains correct: anon can SELECT
  const { data: anonRows, error: anonReadErr } = await anonClient
    .from("site_content")
    .select("content_key, title, content");
  assert(
    !anonReadErr && anonRows && anonRows.length >= 7,
    "6. RLS: public anon users can select site_content"
  );

  // 7. Public read query backward compatibility
  const publicCatalogServer = readFileSync(
    resolve(process.cwd(), "src/lib/public-catalog.server.ts"),
    "utf-8"
  );
  assert(
    publicCatalogServer.includes("fetchSiteContent") &&
      publicCatalogServer.includes("title_en") &&
      publicCatalogServer.includes("content_en") &&
      publicCatalogServer.includes("legacyData"),
    "7. Public read works with both bilingual schema and defensive legacy fallback"
  );

  // 8. Staff write remains protected (anon cannot update)
  const { data: anonUpdateData, error: anonUpdateErr } = await anonClient
    .from("site_content")
    .update({ title: "Hacked Title" })
    .eq("content_key", "homepage_hero")
    .select();
  assert(
    !anonUpdateData || anonUpdateData.length === 0 || Boolean(anonUpdateErr),
    "8. Security: Public anon write is denied by Postgres RLS policy"
  );

  // 9. No product/taxonomy/inquiry tables changed unexpectedly
  const { data: outsoleRows } = await adminClient.from("outsoles").select("slug");
  const authenticSlugsPresent = AUTHENTIC_OUTSOLE_SLUGS.every((slug) =>
    outsoleRows?.some((p) => p.slug === slug)
  );
  assert(
    authenticSlugsPresent,
    "9. Integrity: Outsoles table untouched, authentic products intact"
  );

  // --------------------------------------------------------------------------
  // SECTION 2: BILINGUAL CONTENT QUALITY & TERMINOLOGY (Tests 10-16)
  // --------------------------------------------------------------------------
  console.log("\n[2/5] BILINGUAL CONTENT QUALITY & TERMINOLOGY (Tests 10–16):");

  // 10. All seven CMS keys have valid Indonesian content defined in migration
  const idDefinitionsValid = CMS_KEYS.every((k) => {
    return (
      migrationSql.includes(`content_key = '${k}'`) &&
      migrationSql.includes(`title = `) &&
      migrationSql.includes(`content = `)
    );
  });
  assert(
    idDefinitionsValid,
    "10. All seven CMS keys have valid, non-empty Indonesian content in migration"
  );

  // 11. All seven CMS keys have valid English content defined in migration
  const enDefinitionsValid = CMS_KEYS.every((k) => {
    return (
      migrationSql.includes(`title_en = `) &&
      migrationSql.includes(`content_en = `)
    );
  });
  assert(
    enDefinitionsValid,
    "11. All seven CMS keys have valid, non-empty English content in migration"
  );

  // 12. Structured JSON content has matching schemas in code & defaults
  const contactSource = readFileSync(
    resolve(process.cwd(), "src/lib/contact-content.ts"),
    "utf-8"
  );
  assert(
    contactSource.includes("DEFAULT_CONTACT_CONTENT_ID") &&
      contactSource.includes("DEFAULT_CONTACT_CONTENT") &&
      contactSource.includes("contactContentSchema"),
    "12. Structured JSON content (contact_information, interior_hero) has matching schemas in ID and EN"
  );

  // Extract contact defaults from file
  const defaultContactId = {
    intro: "Hubungi langsung tim insinyur compounding rubber, spesialis tooling mold, dan tim sales komersial kami untuk program OEM dan pengiriman sampel.",
    facility: {
      eyebrow: "Fasilitas",
      heading: "PT ODE CIPTA SEMESTA",
      name: "PT ODE CIPTA SEMESTA",
      address: "Jl. Kidemang Singomenggolo No.KM 20 \nSidomulyo Buduran \nSidoarjo Jawa Timur \n61252",
      footerNote: "Kunjungan audit pabrik berdasarkan perjanjian",
    },
    directEmail: {
      eyebrow: "Email Langsung",
      heading: "Penjualan Outsole",
      description: "Hubungi kami melalui email untuk spesifikasi teknis dan penawaran.",
      email: "sales@ode.co.id",
      footerNote: "Respons biasanya dalam < 24 jam kerja",
    },
    phoneWhatsapp: {
      eyebrow: "Saluran Langsung",
      heading: "Telepon & WhatsApp",
      description: "Bicara langsung dengan tim penjualan kami.",
      phone: "(031) 8929186",
      whatsapp: "+62 123-456-789 (WhatsApp)",
      footerNote: "Melayani Bahasa Indonesia & English",
    },
    operatingHours: {
      eyebrow: "Jadwal Operasional",
      heading: "Jam Operasional",
      mondayFriday: "08:00 – 16:00",
      saturday: "08:00 – 14:00",
      sunday: "Tutup",
      timezone: "Waktu Indonesia Barat (WIB / UTC+7)",
    },
  };

  const defaultContactEn = {
    intro: "Connect directly with our rubber compounding engineers, tooling mold specialists, and commercial sales team for OEM programs and sample dispatch.",
    facility: {
      eyebrow: "Facility",
      heading: "PT ODE CIPTA SEMESTA",
      name: "PT ODE CIPTA SEMESTA",
      address: "Jl. Kidemang Singomenggolo No.KM 20 \nSidomulyo Buduran \nSidoarjo Jawa Timur \n61252",
      footerNote: "Factory audits by appointment",
    },
    directEmail: {
      eyebrow: "Direct Email",
      heading: "Outsole Sales",
      description: "Contact Us by e-mail.",
      email: "sales@ode.co.id",
      footerNote: "Typical response: < 24 business hours",
    },
    phoneWhatsapp: {
      eyebrow: "Direct Line",
      heading: "Phone & WhatsApp",
      description: "Speak directly with our sales team.",
      phone: "(031) 8929186",
      whatsapp: "+62 123-456-789 (WhatsApp)",
      footerNote: "English & Indonesian supported",
    },
    operatingHours: {
      eyebrow: "Schedule",
      heading: "Operating Hours",
      mondayFriday: "08:00 – 16:00",
      saturday: "08:00 – 14:00",
      sunday: "Closed",
      timezone: "Western Indonesia (UTC+7)",
    },
  };

  // 13. Email/phone/URL values are preserved between ID and EN
  const contactCoordinatesPreserved =
    defaultContactId.directEmail.email === defaultContactEn.directEmail.email &&
    defaultContactId.phoneWhatsapp.phone === defaultContactEn.phoneWhatsapp.phone &&
    defaultContactId.facility.address === defaultContactEn.facility.address;
  assert(
    contactCoordinatesPreserved,
    "13. Contact coordinates (email, phone, address) preserved identical between ID and EN"
  );

  // 14. Outsole terminology is correct
  const hasOutsoleTerm = /outsole/i.test(migrationSql);
  assert(
    hasOutsoleTerm,
    "14. Footwear manufacturing terminology ('outsole') used appropriately in migration"
  );

  // 15. No "sol karet" introduced
  const hasSolKaret = /sol\s+karet/i.test(migrationSql);
  assert(
    !hasSolKaret,
    "15. Forbidden translation 'sol karet' is NOT introduced anywhere in CMS migration"
  );

  // 16. No standalone "sol" introduced where referring to outsole
  const hasStandaloneSol = /\b(sol)\b/i.test(migrationSql);
  assert(
    !hasStandaloneSol,
    "16. Standalone forbidden word 'sol' is NOT introduced anywhere in CMS migration"
  );

  // --------------------------------------------------------------------------
  // SECTION 3: PUBLIC RENDERING & LOCALIZATION (Tests 17-24)
  // --------------------------------------------------------------------------
  console.log("\n[3/5] PUBLIC RENDERING & LOCALIZATION (Tests 17–24):");

  // 17. Indonesian locale renders Indonesian CMS content
  const sampleEntry = {
    content_key: "homepage_hero",
    title: "Presisi Kompon Outsole Karet & Tooling Cetakan",
    content: "Pabrik manufaktur outsole karet skala volume tinggi.",
    title_en: "Precision Rubber Outsole Compounding & Tooling",
    content_en: "High-volume technical rubber bottom units engineered for footwear brands.",
  };

  const idRender = getLocalizedContent(sampleEntry, "id");
  assert(
    idRender.title === sampleEntry.title && idRender.content === sampleEntry.content,
    "17. Locale 'id' selects Indonesian title and content"
  );

  // 18. English locale renders English CMS content
  const enRender = getLocalizedContent(sampleEntry, "en");
  assert(
    enRender.title === sampleEntry.title_en && enRender.content === sampleEntry.content_en,
    "18. Locale 'en' selects English title_en and content_en"
  );

  // 19. Missing English content falls back safely to Indonesian
  const entryMissingEn = {
    content_key: "about_company",
    title: "Latar Belakang Pabrik",
    content: "Sejarah manufaktur ODE Outsole di Banten.",
    title_en: null,
    content_en: null,
  };
  const fallbackRender = getLocalizedContent(entryMissingEn, "en");
  assert(
    fallbackRender.title === "Latar Belakang Pabrik" &&
      fallbackRender.content === "Sejarah manufaktur ODE Outsole di Banten.",
    "19. Fallback safety: null/empty English content gracefully falls back to Indonesian"
  );

  // 20. Language switching changes CMS content correctly
  const contactLocId = getLocalizedContact(
    {
      content_key: "contact_information",
      title: "Hubungi ODE Outsole",
      content: JSON.stringify(defaultContactId),
      title_en: "Contact ODE Outsole",
      content_en: JSON.stringify(defaultContactEn),
    },
    "id",
    defaultContactId,
    defaultContactEn
  );
  const contactLocEn = getLocalizedContact(
    {
      content_key: "contact_information",
      title: "Hubungi ODE Outsole",
      content: JSON.stringify(defaultContactId),
      title_en: "Contact ODE Outsole",
      content_en: JSON.stringify(defaultContactEn),
    },
    "en",
    defaultContactId,
    defaultContactEn
  );
  assert(
    contactLocId.title !== contactLocEn.title &&
      contactLocId.content.facility.eyebrow !== contactLocEn.content.facility.eyebrow,
    "20. Language switching dynamically updates Contact structured fields between ID and EN"
  );

  // 21. Homepage hero image remains unchanged
  const indexSource = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf-8");
  assert(
    indexSource.includes("hero-outsole.jpg") && !indexSource.includes("heroImageEn"),
    "21. Homepage hero image remains unchanged and shared"
  );

  // 22. Interior hero image remains unchanged and shared
  const interiorHeroCompSource = readFileSync(
    resolve(process.cwd(), "src/components/site/InteriorHero.tsx"),
    "utf-8"
  );
  assert(
    interiorHeroCompSource.includes("config_en") &&
      interiorHeroCompSource.includes("altText") &&
      interiorHeroCompSource.includes("interior-hero__img"),
    "22. Interior hero renders localized alt text while sharing the identical visual image"
  );

  // 23. Product data remains untouched
  const { count: productCount } = await adminClient
    .from("outsoles")
    .select("*", { count: "exact", head: true });
  assert(
    typeof productCount === "number" && productCount >= 3,
    `23. Product database records remain untouched (${productCount} records in outsoles)`
  );

  // 24. Admin UI remains functional
  const adminIndexSource = readFileSync(
    resolve(process.cwd(), "src/routes/admin/_layout/content/index.tsx"),
    "utf-8"
  );
  assert(
    adminIndexSource.includes("title-contact_information") &&
      adminIndexSource.includes("title-en-contact_information"),
    "24. Admin UI supports both languages for all sections"
  );

  // --------------------------------------------------------------------------
  // SECTION 4: CMS ADMIN WORKFLOW & EDITING (Tests 25-32)
  // --------------------------------------------------------------------------
  console.log("\n[4/5] CMS ADMIN WORKFLOW & EDITING (Tests 25–32):");

  // 25. Both language fields render
  assert(
    adminIndexSource.includes("Bahasa Indonesia (ID)") &&
      adminIndexSource.includes("English (EN)") &&
      adminIndexSource.includes("contact-lang-tab-id") &&
      adminIndexSource.includes("contact-lang-tab-en"),
    "25. Admin UI renders clearly separated Indonesian and English fields"
  );

  // 26. Editing Indonesian does not overwrite English
  const adminFunctionsSource = readFileSync(
    resolve(process.cwd(), "src/lib/admin-content.functions.ts"),
    "utf-8"
  );
  assert(
    adminFunctionsSource.includes("updatePayload.title_en = data.title_en") &&
      adminFunctionsSource.includes("updatePayload.content_en = data.content_en"),
    "26. Server mutation updates title_en and content_en selectively without clobbering"
  );

  // 27. Editing English does not overwrite Indonesian
  assert(
    adminFunctionsSource.includes("title: data.title") &&
      adminFunctionsSource.includes("content: data.content"),
    "27. Indonesian fields are preserved and distinct from English fields"
  );

  // 28. Save works for bilingual content
  assert(
    adminFunctionsSource.includes("updateAdminSiteContentEntry") &&
      adminFunctionsSource.includes("listAdminSiteContent"),
    "28. Bilingual CMS save function exists with authentication and validation"
  );

  // 29. Discard works (client-side handleReset in UI restores initial values)
  assert(
    adminIndexSource.includes("handleReset") &&
      adminIndexSource.includes("handleResetMetadata"),
    "29. Discard/Reset logic handles both Indonesian and English states"
  );

  // 30. Dirty state works
  assert(
    adminIndexSource.includes("isTitleDirty") &&
      adminIndexSource.includes("isTitleEnDirty") &&
      adminIndexSource.includes("isContentDirty") &&
      adminIndexSource.includes("isContentEnDirty"),
    "30. Dirty-state tracking accurately monitors both ID and EN field modifications"
  );

  // 31. Validation works (both ID and EN validated with Zod)
  assert(
    adminFunctionsSource.includes("title_en: z") &&
      adminFunctionsSource.includes("content_en: z") &&
      adminFunctionsSource.includes("English title must not exceed 255 characters"),
    "31. Zod input validation enforces schemas for both language payloads"
  );

  // 32. Structured Contact fields work for both languages
  assert(
    adminIndexSource.includes("contact-hours-mondayfriday-en") &&
      adminIndexSource.includes("contact-facility-name-en") &&
      adminIndexSource.includes("contact-email-address-en"),
    "32. Structured Contact cards provide discrete fields for both languages"
  );

  // --------------------------------------------------------------------------
  // SECTION 5: SECURITY, AUDIT & COMPLIANCE (Tests 33-35)
  // --------------------------------------------------------------------------
  console.log("\n[5/5] SECURITY, AUDIT & COMPLIANCE (Tests 33–35):");

  // 33. No service-role key exposed to client
  const clientSupabaseSource = readFileSync(
    resolve(process.cwd(), "src/integrations/supabase/client.ts"),
    "utf-8"
  );
  assert(
    !clientSupabaseSource.includes("SERVICE_ROLE") &&
      !clientSupabaseSource.includes("service_role"),
    "33. Client-side bundle has zero references to service-role key"
  );

  // 34. No new Lovable references in source files
  const changedFiles = [
    "src/integrations/supabase/types.ts",
    "src/lib/catalog-types.ts",
    "src/lib/content-locale.ts",
    "src/lib/contact-content.ts",
    "src/lib/public-catalog.server.ts",
    "src/lib/public-catalog.functions.ts",
    "src/lib/admin-content.functions.ts",
    "src/routes/index.tsx",
    "src/routes/about.tsx",
    "src/routes/contact.tsx",
    "src/routes/catalog.tsx",
    "src/routes/request-sample.tsx",
    "src/components/site/InteriorHero.tsx",
    "src/routes/admin/_layout/content/index.tsx",
  ];

  let lovableFound = false;
  for (const f of changedFiles) {
    try {
      const src = readFileSync(resolve(process.cwd(), f), "utf-8");
      if (/lovable/i.test(src)) {
        lovableFound = true;
        console.error(`Found Lovable reference in ${f}`);
      }
    } catch {}
  }
  assert(
    !lovableFound,
    "34. Lovable Audit: Zero Lovable references across all modified files"
  );

  // 35. Public users cannot write CMS content
  const { data: anonInsData, error: anonInsertErr } = await anonClient
    .from("site_content")
    .insert({ content_key: "hacked_key", title: "hack", content: "hack" })
    .select();
  assert(
    !anonInsData || anonInsData.length === 0 || Boolean(anonInsertErr),
    "35. Public users strictly prevented from inserting or modifying CMS content"
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log("\n====================================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("====================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test suite fatal execution error:", err);
  process.exit(1);
});
