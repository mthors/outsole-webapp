// Polish Phase 2: Full Public UI Translation Test Suite
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
  console.log("ODE OUTSOLE LOCALIZATION: PHASE 2 PUBLIC UI TRANSLATION TEST SUITE");
  console.log("==================================================================\n");

  // ------------------------------------------------------------------------
  // GROUP 1: Foundation Types & Default Constants
  // ------------------------------------------------------------------------
  console.log("[GROUP 1: i18n Foundation & Defaults]");

  const typesPath = resolve(process.cwd(), "src/lib/i18n/types.ts");
  check(existsSync(typesPath), "1. src/lib/i18n/types.ts exists");

  const typesContent = readFileSync(typesPath, "utf-8");
  check(typesContent.includes('DEFAULT_LOCALE: Locale = "id"'), '2. DEFAULT_LOCALE is "id" (Indonesian is default)');
  check(typesContent.includes('"id", "en"'), '3. SUPPORTED_LOCALES supports "id" and "en"');
  check(typesContent.includes('LOCALE_STORAGE_KEY = "ode_locale"'), "4. Storage key is ode_locale");
  check(typesContent.includes('LOCALE_COOKIE_KEY = "ode_locale"'), "5. Cookie key is ode_locale");

  // ------------------------------------------------------------------------
  // GROUP 2: Dictionaries Structural Identity & Coverage
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 2: Dictionaries Coverage & Identity]");

  const idPath = resolve(process.cwd(), "src/lib/i18n/translations/id.ts");
  const enPath = resolve(process.cwd(), "src/lib/i18n/translations/en.ts");
  check(existsSync(idPath), "6. Indonesian dictionary (id.ts) exists");
  check(existsSync(enPath), "7. English dictionary (en.ts) exists");

  const idContent = readFileSync(idPath, "utf-8");
  const enContent = readFileSync(enPath, "utf-8");

  // Check required namespaces exist in both
  const namespaces = ["nav", "common", "home", "catalog", "product", "sample", "about", "contact", "footer", "errors"];
  for (const ns of namespaces) {
    check(idContent.includes(`${ns}:`) && enContent.includes(`${ns}:`), `8. Both dictionaries contain namespace "${ns}"`);
  }

  // Indonesian copy sanity checks
  check(idContent.includes('exploreCta: "Jelajahi Koleksi"'), '9. ID home hero CTA is natural Indonesian ("Jelajahi Koleksi")');
  check(idContent.includes('sampleCta: "Ajukan Sampel"'), '10. ID home sample CTA is natural Indonesian ("Ajukan Sampel")');
  check(idContent.includes('searchPlaceholder: "Cari berdasarkan nama, nomor model, atau deskripsi"'), '11. ID catalog search placeholder is natural Indonesian');
  check(idContent.includes('clearFilters: "Hapus filter"'), '12. ID clear filters is natural Indonesian');
  check(idContent.includes('samplingAvailable: "Tersedia"'), '13. ID sampling available is natural Indonesian');
  check(idContent.includes('samplingOnRequest: "Sesuai permintaan"'), '14. ID sampling on request is natural Indonesian ("Sesuai permintaan")');
  check(idContent.includes('shoreHardness: "Kekerasan Shore"'), '15. ID shore hardness label is natural Indonesian');
  check(idContent.includes('dinAbrasion: "Ketahanan Abrasi DIN"'), '16. ID din abrasion label is natural Indonesian ("Ketahanan Abrasi DIN")');
  check(idContent.includes('selectedOutsole: "Outsole yang dipilih"'), '18. ID selected outsole box label retains "outsole" ("Outsole yang dipilih")');
  check(!idContent.includes("sol karet"), '18b. Zero occurrences of "sol karet" in Indonesian dictionary');
  check(!/\bsol\b/i.test(idContent), '18c. Zero occurrences of standalone "sol" in Indonesian dictionary');
  check(idContent.includes('title: "Katalog Outsole"'), '18d. ID catalog title is "Katalog Outsole"');
  check(idContent.includes('countSingle: "outsole"'), '18e. ID result count preserves "outsole"');
  check(idContent.includes('submittingBtn: "Mengirim…"'), '19. ID submitting button label is natural Indonesian');
  check(idContent.includes('highlights:'), '20. ID about highlights section is populated');
  check(idContent.includes('monFri: "Senin – Jumat:"'), '21. ID contact operating hours monFri is natural Indonesian');

  // English copy sanity checks
  check(enContent.includes('exploreCta: "Explore Collection"'), '22. EN home hero CTA is "Explore Collection"');
  check(enContent.includes('sampleCta: "Request a Sample"'), '23. EN home sample CTA is "Request a Sample"');
  check(enContent.includes('searchPlaceholder: "Search by name, model number or description"'), '24. EN catalog search placeholder is correct');
  check(enContent.includes('clearFilters: "Clear filters"'), '25. EN clear filters is "Clear filters"');
  check(enContent.includes('samplingAvailable: "Sampling Available"'), '26. EN sampling available is "Sampling Available"');
  check(enContent.includes('shoreHardness: "Shore hardness"'), '27. EN shore hardness is "Shore hardness"');
  check(enContent.includes('monFri: "Monday – Friday:"'), '28. EN contact operating hours monFri is "Monday – Friday:"');

  // ------------------------------------------------------------------------
  // GROUP 3: Header, Switcher, and Footer Wiring
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 3: Header, Switcher, and Footer UI]");

  const headerContent = readFileSync(resolve(process.cwd(), "src/components/site/SiteHeader.tsx"), "utf-8");
  check(headerContent.includes("<LanguageSwitcher"), "29. SiteHeader renders LanguageSwitcher");
  check(headerContent.includes("dict.nav.home"), "30. SiteHeader uses dict.nav.home");
  check(headerContent.includes("dict.nav.catalog"), "31. SiteHeader uses dict.nav.catalog");
  check(headerContent.includes("dict.nav.about"), "32. SiteHeader uses dict.nav.about");
  check(headerContent.includes("dict.nav.contact"), "33. SiteHeader uses dict.nav.contact");
  check(headerContent.includes("dict.nav.requestSample"), "34. SiteHeader uses dict.nav.requestSample");
  check(headerContent.includes("dict.nav.closeMenu") && headerContent.includes("dict.nav.openMenu"), "35. SiteHeader mobile menu aria-label is translated");

  const footerContent = readFileSync(resolve(process.cwd(), "src/components/site/SiteFooter.tsx"), "utf-8");
  check(footerContent.includes("dict.footer.explore"), "36. SiteFooter uses dict.footer.explore");
  check(footerContent.includes("dict.footer.sampling"), "37. SiteFooter uses dict.footer.sampling");
  check(footerContent.includes("dict.footer.credits"), "38. SiteFooter uses dict.footer.credits");
  check(footerContent.includes("dict.nav.catalog"), "39. SiteFooter links use dict.nav.catalog");

  // ------------------------------------------------------------------------
  // GROUP 4: Homepage UI Wiring
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 4: Homepage UI Translation]");

  const indexRoute = readFileSync(resolve(process.cwd(), "src/routes/index.tsx"), "utf-8");
  check(indexRoute.includes("useI18n()"), "40. Homepage imports and calls useI18n()");
  check(indexRoute.includes("dict.home.hero.eyebrow"), "41. Homepage hero eyebrow uses dict");
  check(indexRoute.includes("dict.home.hero.defaultTitle"), "42. Homepage hero fallback title uses dict");
  check(indexRoute.includes("dict.home.hero.defaultContent"), "43. Homepage hero fallback content uses dict");
  check(indexRoute.includes("dict.home.hero.exploreCta"), "44. Homepage hero explore CTA uses dict");
  check(indexRoute.includes("dict.home.hero.sampleCta"), "45. Homepage hero sample CTA uses dict");
  check(indexRoute.includes("dict.home.featured.eyebrow"), "46. Homepage featured section eyebrow uses dict");
  check(indexRoute.includes("dict.home.featured.viewAll"), "47. Homepage featured view all link uses dict");
  check(indexRoute.includes("dict.home.tech.compounds"), "48. Homepage compounds label uses dict");
  check(indexRoute.includes("dict.home.capability.items"), "49. Homepage capability cards use dict");
  check(indexRoute.includes("dict.home.cta.title"), "50. Homepage bottom CTA title uses dict");
  check(indexRoute.includes("dict.catalog.cardHardness"), "51. OutsoleCard hardness label uses dict");
  check(indexRoute.includes("dict.common.viewDetails"), "52. OutsoleCard view details button uses dict");

  // ------------------------------------------------------------------------
  // GROUP 5: Catalog UI Wiring
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 5: Catalog UI Translation]");

  const catalogRoute = readFileSync(resolve(process.cwd(), "src/routes/catalog.tsx"), "utf-8");
  check(catalogRoute.includes("useI18n()"), "53. Catalog route imports and calls useI18n()");
  check(catalogRoute.includes("dict.catalog.eyebrow"), "54. Catalog InteriorHero eyebrow uses dict");
  check(catalogRoute.includes("dict.catalog.title"), "55. Catalog InteriorHero title uses dict");
  check(catalogRoute.includes("dict.catalog.description"), "56. Catalog InteriorHero description uses dict");
  check(catalogRoute.includes("dict.catalog.searchPlaceholder"), "57. Catalog search input placeholder uses dict");
  check(catalogRoute.includes("dict.catalog.searchAria"), "58. Catalog search sr-only label uses dict");
  check(catalogRoute.includes("dict.catalog.filtersBtn"), "59. Catalog mobile filter toggle button uses dict");
  check(catalogRoute.includes("dict.catalog.filterCategory"), "60. Catalog category filter label uses dict");
  check(catalogRoute.includes("dict.catalog.filterMaterial"), "61. Catalog material filter label uses dict");
  check(catalogRoute.includes("dict.catalog.filterTraction"), "62. Catalog traction filter label uses dict");
  check(catalogRoute.includes("dict.catalog.filterHardness"), "63. Catalog hardness filter label uses dict");
  check(catalogRoute.includes("dict.catalog.filterSampling"), "64. Catalog sampling toggle uses dict");
  check(catalogRoute.includes("dict.catalog.filterFeatured"), "65. Catalog featured toggle uses dict");
  check(catalogRoute.includes("dict.catalog.clearFilters"), "66. Catalog clear filters button uses dict");
  check(catalogRoute.includes("dict.catalog.countSingle") && catalogRoute.includes("dict.catalog.countPlural"), "67. Catalog result count labels use dict");
  check(catalogRoute.includes("dict.catalog.noResults"), "68. Catalog empty results state uses dict");
  check(catalogRoute.includes("dict.catalog.cardSampling"), "69. CatalogCard sampling label uses dict");
  check(catalogRoute.includes("dict.catalog.samplingAvailable") && catalogRoute.includes("dict.catalog.samplingOnRequest"), "70. CatalogCard sampling status uses dict");

  // ------------------------------------------------------------------------
  // GROUP 6: Product Detail UI Wiring
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 6: Product Detail UI Translation]");

  const productRoute = readFileSync(resolve(process.cwd(), "src/routes/outsoles.$slug.tsx"), "utf-8");
  check(productRoute.includes("useI18n()"), "71. Product detail route imports and calls useI18n()");
  check(productRoute.includes("dict.product.breadcrumbCatalog"), "72. Product breadcrumb uses dict");
  check(productRoute.includes("dict.product.shoreHardness"), "73. Product spec shore hardness label uses dict");
  check(productRoute.includes("dict.product.dinAbrasion"), "74. Product spec din abrasion label uses dict");
  check(productRoute.includes("dict.product.weight"), "75. Product spec weight label uses dict");
  check(productRoute.includes("dict.product.sampling"), "76. Product spec sampling label uses dict");
  check(productRoute.includes("dict.product.category"), "77. Product category tags label uses dict");
  check(productRoute.includes("dict.product.specifications"), "78. Product specifications heading uses dict");
  check(productRoute.includes("dict.product.requestSampleCta"), "79. Product request sample button uses dict");
  check(productRoute.includes("dict.product.backToCatalog"), "80. Product back to catalog button uses dict");
  check(productRoute.includes("dict.product.notFoundTitle"), "81. Product not found state uses dict");

  // ------------------------------------------------------------------------
  // GROUP 7: Request Sample UI Wiring
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 7: Request Sample UI Translation]");

  const sampleRoute = readFileSync(resolve(process.cwd(), "src/routes/request-sample.tsx"), "utf-8");
  check(sampleRoute.includes("useI18n()"), "82. Request sample route imports and calls useI18n()");
  check(sampleRoute.includes("dict.sample.eyebrow"), "83. Request sample InteriorHero eyebrow uses dict");
  check(sampleRoute.includes("dict.sample.title"), "84. Request sample InteriorHero title uses dict");
  check(sampleRoute.includes("dict.sample.selectedOutsole"), "85. Selected outsole context card label uses dict");
  check(sampleRoute.includes("dict.sample.form.nameLabel"), "86. Form name label uses dict");
  check(sampleRoute.includes("dict.sample.form.companyLabel"), "87. Form company label uses dict");
  check(sampleRoute.includes("dict.sample.form.emailLabel"), "88. Form email label uses dict");
  check(sampleRoute.includes("dict.sample.form.phoneLabel"), "89. Form phone label uses dict");
  check(sampleRoute.includes("dict.sample.form.messageLabel"), "90. Form message label uses dict");
  check(sampleRoute.includes("dict.sample.form.submitBtn"), "91. Form submit button uses dict");
  check(sampleRoute.includes("dict.sample.form.submittingBtn"), "92. Form submitting spinner label uses dict");
  check(sampleRoute.includes("dict.sample.validation.nameRequired"), "93. Client-side zod validation messages use dict");
  check(sampleRoute.includes("dict.sample.success.statusTag"), "94. Success state status tag uses dict");
  check(sampleRoute.includes("dict.sample.sidebar.nextHeading"), "95. Sidebar what happens next heading uses dict");

  // ------------------------------------------------------------------------
  // GROUP 8: About & Contact UI Wiring
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 8: About & Contact UI Translation]");

  const aboutRoute = readFileSync(resolve(process.cwd(), "src/routes/about.tsx"), "utf-8");
  check(aboutRoute.includes("useI18n()"), "96. About route imports and calls useI18n()");
  check(aboutRoute.includes("dict.about.eyebrow"), "97. About InteriorHero eyebrow uses dict");
  check(aboutRoute.includes("dict.about.highlights.tag1"), "98. About quick highlights cards use dict");
  check(aboutRoute.includes("dict.about.oem.eyebrow"), "99. About OEM section eyebrow uses dict");
  check(aboutRoute.includes("dict.about.oem.requestTrial"), "100. About OEM request trial button uses dict");
  check(aboutRoute.includes("dict.about.odm.browseTooling"), "101. About ODM browse tooling button uses dict");
  check(aboutRoute.includes("dict.about.cta.title"), "102. About bottom CTA section uses dict");

  const contactRoute = readFileSync(resolve(process.cwd(), "src/routes/contact.tsx"), "utf-8");
  check(contactRoute.includes("useI18n()"), "103. Contact route imports and calls useI18n()");
  check(contactRoute.includes("dict.contact.eyebrow"), "104. Contact InteriorHero eyebrow uses dict");
  check(contactRoute.includes("dict.contact.cardHours.monFri"), "105. Contact business hours monFri label uses dict");
  check(contactRoute.includes("dict.contact.cardHours.sat"), "106. Contact business hours sat label uses dict");
  check(contactRoute.includes("dict.contact.cardHours.sun"), "107. Contact business hours sun label uses dict");
  check(contactRoute.includes("dict.contact.ctaCard.title"), "108. Contact fast-track sample CTA card uses dict");

  // ------------------------------------------------------------------------
  // GROUP 9: Backend Integrity & Architecture Invariants
  // ------------------------------------------------------------------------
  console.log("\n[GROUP 9: Backend Integrity & Data Invariants]");

  if (supabaseUrl && anonKey) {
    const publicClient = createClient(supabaseUrl, anonKey);
    const { data: outsoles, error: outsolesErr } = await publicClient
      .from("outsoles")
      .select("id, name, model_number, status")
      .eq("status", "active");

    check(!outsolesErr && outsoles?.length === 3, "109. Public catalog query returns all 3 active products");
    // Verify product names and models are untouched
    check(outsoles?.some((o) => o.name === "Trail Grip X1"), '110. Product names remain intact (e.g. "Trail Grip X1")');
    check(outsoles?.some((o) => o.model_number === "OUT-TRAIL-001"), '111. Product model numbers remain intact (e.g. "OUT-TRAIL-001")');

    const { data: siteContent, error: contentErr } = await publicClient
      .from("site_content")
      .select("content_key, title");

    check(!contentErr && siteContent?.length === 7, "112. Site content database records remain intact (7 entries)");
  } else {
    console.log("  (Supabase credentials missing, skipping live query)");
  }

  // Admin route check
  const adminContentRoute = readFileSync(resolve(process.cwd(), "src/routes/admin/_layout/content/index.tsx"), "utf-8");
  check(adminContentRoute.includes("InteriorHeroContentCard"), "113. Admin UI is untouched and preserves image management");

  // Lovable audit check
  const allTouchedFiles = [
    "src/lib/i18n/types.ts",
    "src/lib/i18n/translations/id.ts",
    "src/lib/i18n/translations/en.ts",
    "src/lib/i18n/storage.ts",
    "src/lib/i18n/context.tsx",
    "src/components/site/LanguageSwitcher.tsx",
    "src/components/site/SiteHeader.tsx",
    "src/components/site/SiteFooter.tsx",
    "src/components/site/InteriorHero.tsx",
    "src/routes/__root.tsx",
    "src/routes/index.tsx",
    "src/routes/catalog.tsx",
    "src/routes/outsoles.$slug.tsx",
    "src/routes/request-sample.tsx",
    "src/routes/about.tsx",
    "src/routes/contact.tsx",
  ];

  let hasLovable = false;
  for (const f of allTouchedFiles) {
    const code = readFileSync(resolve(process.cwd(), f), "utf-8");
    if (code.toLowerCase().includes("lovable")) {
      hasLovable = true;
      console.error(`Found Lovable in ${f}`);
    }
  }
  check(!hasLovable, "114. Zero Lovable references across all touched files");

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
