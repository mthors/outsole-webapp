// Polish Phase 1: i18n Foundation & Language Switcher Integration Test Suite
// Run with: node scratch/test-i18n.mjs

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  console.log("POLISH PHASE 1: I18N FOUNDATION & LANGUAGE SWITCHER TEST SUITE");
  console.log("==================================================================\n");

  // ------------------------------------------------------------------------
  // GROUP 1: Foundation Types & Default Constants
  // ------------------------------------------------------------------------
  console.log("[GROUP 1: i18n Types & Default Constants]");

  const typesPath = resolve(process.cwd(), "src/lib/i18n/types.ts");
  check(existsSync(typesPath), "1. src/lib/i18n/types.ts exists");

  const typesContent = readFileSync(typesPath, "utf-8");
  check(typesContent.includes('DEFAULT_LOCALE: Locale = "id"'), '2. DEFAULT_LOCALE is "id" (Indonesian is default)');
  check(typesContent.includes('"id", "en"'), '3. SUPPORTED_LOCALES supports "id" and "en"');
  check(typesContent.includes('LOCALE_STORAGE_KEY = "ode_locale"'), "4. Storage key is ode_locale");
  check(typesContent.includes('LOCALE_COOKIE_KEY = "ode_locale"'), "5. Cookie key is ode_locale");

  // ------------------------------------------------------------------------
  // GROUP 2: Dictionaries & Sample Translation Keys
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 2: Dictionaries & Translation Keys]");

  const idPath = resolve(process.cwd(), "src/lib/i18n/translations/id.ts");
  const enPath = resolve(process.cwd(), "src/lib/i18n/translations/en.ts");
  check(existsSync(idPath), "6. Indonesian dictionary (id.ts) exists");
  check(existsSync(enPath), "7. English dictionary (en.ts) exists");

  const idContent = readFileSync(idPath, "utf-8");
  const enContent = readFileSync(enPath, "utf-8");

  // Verify Indonesian values
  check(idContent.includes('home: "Beranda"'), '8. ID has home = "Beranda"');
  check(idContent.includes('catalog: "Katalog"'), '9. ID has catalog = "Katalog"');
  check(idContent.includes('about: "Tentang Kami"'), '10. ID has about = "Tentang Kami"');
  check(idContent.includes('contact: "Hubungi Kami"'), '11. ID has contact = "Hubungi Kami"');
  check(idContent.includes('requestSample: "Ajukan Sampel"'), '12. ID has requestSample = "Ajukan Sampel"');
  check(idContent.includes('search: "Cari"'), '13. ID has search = "Cari"');
  check(idContent.includes('featured: "Unggulan"'), '14. ID has featured = "Unggulan"');
  check(idContent.includes('viewCatalog: "Lihat Katalog"'), '15. ID has viewCatalog = "Lihat Katalog"');

  // Verify English values
  check(enContent.includes('home: "Home"'), '16. EN has home = "Home"');
  check(enContent.includes('catalog: "Catalog"'), '17. EN has catalog = "Catalog"');
  check(enContent.includes('about: "About Us"'), '18. EN has about = "About Us"');
  check(enContent.includes('contact: "Contact"'), '19. EN has contact = "Contact"');
  check(enContent.includes('requestSample: "Request a Sample"'), '20. EN has requestSample = "Request a Sample"');
  check(enContent.includes('search: "Search"'), '21. EN has search = "Search"');
  check(enContent.includes('featured: "Featured"'), '22. EN has featured = "Featured"');
  check(enContent.includes('viewCatalog: "View Catalog"'), '23. EN has viewCatalog = "View Catalog"');

  // ------------------------------------------------------------------------
  // GROUP 3: Storage & Persistence Mechanics
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 3: Storage & Persistence Logic]");

  const storagePath = resolve(process.cwd(), "src/lib/i18n/storage.ts");
  check(existsSync(storagePath), "24. src/lib/i18n/storage.ts exists");

  const storageContent = readFileSync(storagePath, "utf-8");
  check(storageContent.includes("isSupportedLocale"), "25. Validates supported locales defensively");
  check(storageContent.includes("localStorage.getItem"), "26. Reads from localStorage in browser");
  check(storageContent.includes("document.cookie"), "27. Reads and writes to document.cookie");
  check(storageContent.includes("document.documentElement.lang"), "28. Updates document.documentElement.lang on change");
  check(storageContent.includes("DEFAULT_LOCALE"), "29. Gracefully falls back to DEFAULT_LOCALE when empty/invalid");

  // ------------------------------------------------------------------------
  // GROUP 4: React Context & Language Switcher Component
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 4: Context & Header Integration]");

  const contextPath = resolve(process.cwd(), "src/lib/i18n/context.tsx");
  check(existsSync(contextPath), "30. src/lib/i18n/context.tsx exists");

  const switcherPath = resolve(process.cwd(), "src/components/site/LanguageSwitcher.tsx");
  check(existsSync(switcherPath), "31. src/components/site/LanguageSwitcher.tsx exists");

  const switcherContent = readFileSync(switcherPath, "utf-8");
  check(switcherContent.includes('id="lang-btn-id"'), "32. Language switcher provides ID button with lang-btn-id id");
  check(switcherContent.includes('id="lang-btn-en"'), "33. Language switcher provides EN button with lang-btn-en id");
  check(switcherContent.includes('aria-pressed'), "34. Accessible aria-pressed attribute present on language buttons");
  check(switcherContent.includes('setLocale("id")') && switcherContent.includes('setLocale("en")'), "35. Allows switching between id and en without page reload");

  // Check header integration
  const headerContent = readFileSync(resolve(process.cwd(), "src/components/site/SiteHeader.tsx"), "utf-8");
  check(headerContent.includes("<LanguageSwitcher"), "36. SiteHeader renders LanguageSwitcher");
  check(headerContent.includes("dict.nav.home"), "37. SiteHeader uses translated home label");
  check(headerContent.includes("dict.nav.catalog"), "38. SiteHeader uses translated catalog label");
  check(headerContent.includes("dict.nav.about"), "39. SiteHeader uses translated about label");
  check(headerContent.includes("dict.nav.contact"), "40. SiteHeader uses translated contact label");
  check(headerContent.includes("dict.nav.requestSample"), "41. SiteHeader uses translated requestSample label");

  // Check root integration & html lang
  const rootContent = readFileSync(resolve(process.cwd(), "src/routes/__root.tsx"), "utf-8");
  check(rootContent.includes("<I18nProvider>"), "42. Root component wraps application with I18nProvider");
  check(rootContent.includes('<html lang="id">'), '43. RootShell sets default <html lang="id">');

  // ------------------------------------------------------------------------
  // GROUP 5: Public Backend Compatibility
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 5: Public Backend Compatibility]");

  if (supabaseUrl && anonKey) {
    const publicClient = createClient(supabaseUrl, anonKey);
    const { data: outsoles, error: outsolesErr } = await publicClient
      .from("outsoles")
      .select("id, name, slug, status")
      .eq("status", "active");

    check(!outsolesErr && outsoles?.length === 3, "44. Public catalog query returns all 3 active products");

    const { data: siteContent, error: contentErr } = await publicClient
      .from("site_content")
      .select("content_key, title");

    check(!contentErr && siteContent?.length === 7, "45. Public site_content query returns all 7 entries");
  } else {
    console.log("  (Supabase credentials missing, skipping live query)");
  }

  // ------------------------------------------------------------------------
  // GROUP 6: Clean Architecture & Security
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 6: Architecture Invariants & Safety]");

  // Verify no Lovable references in new/modified i18n files
  const i18nFiles = [
    "src/lib/i18n/types.ts",
    "src/lib/i18n/translations/id.ts",
    "src/lib/i18n/translations/en.ts",
    "src/lib/i18n/translations/index.ts",
    "src/lib/i18n/storage.ts",
    "src/lib/i18n/context.tsx",
    "src/lib/i18n/index.ts",
    "src/components/site/LanguageSwitcher.tsx",
  ];

  let hasLovable = false;
  for (const f of i18nFiles) {
    const code = readFileSync(resolve(process.cwd(), f), "utf-8");
    if (code.toLowerCase().includes("lovable")) {
      hasLovable = true;
      console.error(`Found Lovable in ${f}`);
    }
  }
  check(!hasLovable, "46. Zero Lovable references introduced in i18n implementation");

  // Verify homepage hero untouched
  const indexRouteContent = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf-8");
  check(indexRouteContent.includes("heroImg") && indexRouteContent.includes("hero-outsole.jpg"), "47. Approved homepage hero in src/routes/index.tsx remains untouched");

  // Verify admin functionality untouched
  const adminContentRoute = readFileSync(resolve(process.cwd(), "src/routes/admin/_layout/content/index.tsx"), "utf-8");
  check(adminContentRoute.includes("InteriorHeroContentCard"), "48. Admin interior hero management remains intact");

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
