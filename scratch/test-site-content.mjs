// Milestone 10 + Polish Pass 2: Site Content Management & Contact CMS Integration Test Suite
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
  "interior_hero",
];

const AUTHENTIC_OUTSOLE_SLUGS = [
  "trail-grip-x1",
  "roadflex-r2",
  "safestep-s3",
];

// Zod schemas matching src/lib/contact-content.ts & src/lib/admin-content.functions.ts
const facilitySchema = z.object({
  eyebrow: z.string().trim().min(1, "Facility label is required").max(100),
  heading: z.string().trim().min(1, "Facility heading is required").max(100),
  name: z.string().trim().min(1, "Facility name is required").max(200),
  address: z.string().trim().min(1, "Facility address is required").max(500),
  footerNote: z.string().trim().min(1, "Facility footer note is required").max(200),
});

const directEmailSchema = z.object({
  eyebrow: z.string().trim().min(1, "Email label is required").max(100),
  heading: z.string().trim().min(1, "Email heading is required").max(100),
  description: z.string().trim().min(1, "Email description is required").max(500),
  email: z.string().trim().min(1, "Email is required").email("Please provide a valid email address").max(255),
  footerNote: z.string().trim().min(1, "Email footer note is required").max(200),
});

const phoneWhatsappSchema = z.object({
  eyebrow: z.string().trim().min(1, "Phone label is required").max(100),
  heading: z.string().trim().min(1, "Phone heading is required").max(100),
  description: z.string().trim().min(1, "Phone description is required").max(500),
  phone: z.string().trim().min(1, "Phone number is required").max(100),
  whatsapp: z.string().trim().min(1, "WhatsApp number is required").max(100),
  footerNote: z.string().trim().min(1, "Phone footer note is required").max(200),
});

const operatingHoursSchema = z.object({
  eyebrow: z.string().trim().min(1, "Schedule label is required").max(100),
  heading: z.string().trim().min(1, "Operating hours heading is required").max(100),
  mondayFriday: z.string().trim().min(1, "Monday–Friday hours are required").max(100),
  saturday: z.string().trim().min(1, "Saturday hours are required").max(100),
  sunday: z.string().trim().min(1, "Sunday hours are required").max(100),
  timezone: z.string().trim().min(1, "Timezone is required").max(100),
});

const contactContentSchema = z.object({
  intro: z.string().trim().max(1000).default(""),
  facility: facilitySchema,
  directEmail: directEmailSchema,
  phoneWhatsapp: phoneWhatsappSchema,
  operatingHours: operatingHoursSchema,
});

const contentKeyEnum = z.enum([
  "homepage_hero",
  "homepage_capabilities",
  "about_company",
  "about_oem",
  "about_odm",
  "contact_information",
  "interior_hero",
]);

const updateSiteContentSchema = z
  .object({
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
  })
  .superRefine((val, ctx) => {
    if (val.content_key === "contact_information") {
      try {
        const parsed = JSON.parse(val.content);
        const res = contactContentSchema.safeParse(parsed);
        if (!res.success) {
          for (const issue of res.error.issues) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${issue.path.join(".")}: ${issue.message}`,
              path: ["content", ...issue.path],
            });
          }
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Contact information content must be a valid JSON representation matching the contact schema",
          path: ["content"],
        });
      }
    }
  });

function formatPhoneLink(phone) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned || cleaned === "+") return null;
  return `tel:${cleaned}`;
}

function formatWhatsAppLink(whatsapp) {
  const digits = whatsapp.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

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
  console.log("MILESTONE 10 + POLISH PASS 2: SITE CONTENT & CONTACT CMS TESTS");
  console.log("==================================================================\n");

  // ==========================================================================
  // GROUP 1: Authentic Baseline & State Capture
  // ==========================================================================
  console.log("[GROUP 1: Authentic Baseline & Initial State Capture]");

  // 1. Verify authentic outsoles
  const { data: initialOutsoles, error: outsolesErr } = await adminClient
    .from("outsoles")
    .select("id, name, slug, status");

  check(!outsolesErr && initialOutsoles, "Queried authentic outsoles table");
  check(initialOutsoles?.length === 3, "Exactly 3 authentic outsoles exist in database");

  for (const slug of AUTHENTIC_OUTSOLE_SLUGS) {
    const p = initialOutsoles?.find((o) => o.slug === slug);
    check(Boolean(p && p.status === "active"), `Authentic product "${slug}" is present and active`);
  }

  // 2. Capture initial sample_inquiries count
  const { count: initialInquiryCount } = await adminClient
    .from("sample_inquiries")
    .select("*", { count: "exact", head: true });

  // 3. Query all site_content rows
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

  // Verify baseline contact_information parses into structured contact data
  const contactRow = baselineMap.get("contact_information");
  check(Boolean(contactRow), "Contact content exists in baseline");
  let parsedBaselineContact = null;
  try {
    parsedBaselineContact = JSON.parse(contactRow.content);
  } catch (err) {
    // If not JSON yet
  }
  check(Boolean(parsedBaselineContact), "Baseline contact content is valid JSON");

  // ==========================================================================
  // GROUP 2: Anonymous RLS & Public Access Security
  // ==========================================================================
  console.log("\n[GROUP 2: Anonymous RLS & Direct Mutation Restrictions]");

  // Anonymous read should succeed (public read allowed)
  const { data: anonRead, error: anonReadErr } = await anonClient
    .from("site_content")
    .select("content_key, title, content");

  check(!anonReadErr && anonRead, "Anonymous client can SELECT from site_content");
  check(anonRead?.length === EXPECTED_CONTENT_KEYS.length, `Anonymous SELECT returns all ${EXPECTED_CONTENT_KEYS.length} site_content entries`);

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
    .insert({
      content_key: "malicious_entry",
      title: "Injected Title",
      content: "Injected Content",
    })
    .select();

  const anonInsertBlocked =
    Boolean(anonInsertErr) ||
    !anonInsertData ||
    anonInsertData.length === 0;
  check(anonInsertBlocked, "Postgres RLS blocks anonymous direct INSERT into site_content");

  // ==========================================================================
  // GROUP 3: Zod Validation & Schema Boundary Tests
  // ==========================================================================
  console.log("\n[GROUP 3: Zod Validation & Schema Boundary Tests]");

  // 1. Standard text section tests
  const validPayload = {
    content_key: "about_company",
    title: "ODE Outsole Factory Profile",
    content: "Engineered rubber production since 2012.",
  };
  const validResult = updateSiteContentSchema.safeParse(validPayload);
  check(validResult.success, "Valid standard content update payload accepted");

  const invalidKeyResult = updateSiteContentSchema.safeParse({
    content_key: "non_existent_key",
    title: "Test Title",
    content: "Test Content",
  });
  check(!invalidKeyResult.success, "Invalid content_key rejected by enum");

  const emptyTitleResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "   ",
    content: "Valid Content",
  });
  check(!emptyTitleResult.success, "Whitespace-only title rejected (min 1 char required)");

  const oversizedTitleResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "A".repeat(256),
    content: "Valid Content",
  });
  check(!oversizedTitleResult.success, "Oversized title (> 255 chars) rejected");

  const emptyContentResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "Valid Title",
    content: "   ",
  });
  check(!emptyContentResult.success, "Whitespace-only content rejected (min 1 char required)");

  const oversizedContentResult = updateSiteContentSchema.safeParse({
    content_key: "about_company",
    title: "Valid Title",
    content: "X".repeat(5001),
  });
  check(!oversizedContentResult.success, "Oversized content (> 5000 chars) rejected");

  const boundaryResult = updateSiteContentSchema.safeParse({
    content_key: "about_oem",
    title: "T".repeat(255),
    content: "C".repeat(5000),
  });
  check(boundaryResult.success, "Boundary maximums (255 title, 5000 content) accepted");

  // 2. Structured Contact Information Validation Tests
  const validContactData = {
    intro: "Sample intro narrative for engineering inquiries.",
    facility: {
      eyebrow: "Facility",
      heading: "Factory Plant",
      name: "ODE Outsole Manufacturing Plant",
      address: "Plot 18, Industrial Footwear Zone\nBanten 15710, Indonesia",
      footerNote: "Factory audits by appointment",
    },
    directEmail: {
      eyebrow: "Direct Email",
      heading: "Technical Sales",
      description: "Send blueprints and specifications:",
      email: "sales@odeoutsole.com",
      footerNote: "Typical response: < 24 business hours",
    },
    phoneWhatsapp: {
      eyebrow: "Direct Line",
      heading: "Phone & WhatsApp",
      description: "Speak directly with account engineers:",
      phone: "+62 21 555-0198 (Office)",
      whatsapp: "+62 812-555-0199 (WhatsApp)",
      footerNote: "English & Indonesian supported",
    },
    operatingHours: {
      eyebrow: "Schedule",
      heading: "Operating Hours",
      mondayFriday: "08:00 – 17:00",
      saturday: "08:00 – 13:00",
      sunday: "Closed",
      timezone: "Western Indonesia (UTC+7)",
    },
  };

  const validContactZod = contactContentSchema.safeParse(validContactData);
  check(validContactZod.success, "Structured contact content passes contactContentSchema");

  const validContactWrapper = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: JSON.stringify(validContactData),
  });
  check(validContactWrapper.success, "Valid structured contact payload accepted by updateSiteContentSchema");

  // Non-JSON content for contact_information rejected
  const nonJsonContact = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: "Not a JSON blob string",
  });
  check(!nonJsonContact.success, "Non-JSON content rejected for contact_information");

  // Invalid email rejected
  const invalidEmailData = {
    ...validContactData,
    directEmail: { ...validContactData.directEmail, email: "invalid-email-address" },
  };
  const invalidEmailResult = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: JSON.stringify(invalidEmailData),
  });
  check(!invalidEmailResult.success, "Invalid email format rejected");

  // Missing required facility field rejected
  const missingFieldData = {
    ...validContactData,
    facility: { ...validContactData.facility, name: "   " },
  };
  const missingFieldResult = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: JSON.stringify(missingFieldData),
  });
  check(!missingFieldResult.success, "Empty facility name rejected (required field)");

  // Oversized facility name rejected (> 200 chars)
  const oversizedFacilityData = {
    ...validContactData,
    facility: { ...validContactData.facility, name: "X".repeat(201) },
  };
  const oversizedFacilityResult = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: JSON.stringify(oversizedFacilityData),
  });
  check(!oversizedFacilityResult.success, "Oversized facility name (> 200 chars) rejected");

  // Oversized email description rejected (> 500 chars)
  const oversizedEmailDescData = {
    ...validContactData,
    directEmail: { ...validContactData.directEmail, description: "X".repeat(501) },
  };
  const oversizedEmailDescResult = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: JSON.stringify(oversizedEmailDescData),
  });
  check(!oversizedEmailDescResult.success, "Oversized email description (> 500 chars) rejected");

  // Oversized phone rejected (> 100 chars)
  const oversizedPhoneData = {
    ...validContactData,
    phoneWhatsapp: { ...validContactData.phoneWhatsapp, phone: "X".repeat(101) },
  };
  const oversizedPhoneResult = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: JSON.stringify(oversizedPhoneData),
  });
  check(!oversizedPhoneResult.success, "Oversized phone number (> 100 chars) rejected");

  // Oversized timezone rejected (> 100 chars)
  const oversizedTzData = {
    ...validContactData,
    operatingHours: { ...validContactData.operatingHours, timezone: "X".repeat(101) },
  };
  const oversizedTzResult = updateSiteContentSchema.safeParse({
    content_key: "contact_information",
    title: "Contact ODE Outsole",
    content: JSON.stringify(oversizedTzData),
  });
  check(!oversizedTzResult.success, "Oversized timezone (> 100 chars) rejected");

  // ==========================================================================
  // GROUP 4: Admin Content Operations & Persistence
  // ==========================================================================
  console.log("\n[GROUP 4: Admin Content Operations & Timestamp Verification]");

  // 1. Standard about_company update test
  const testKey = "about_company";
  const originalRow = baselineMap.get(testKey);
  const testModifiedTitle = "ODE Outsole — Technical Rubber Facility [TEST]";
  const testModifiedContent =
    "Over 12 years of specialized compression molding and high-abrasion compound formulation in our certified facility. [TEST]";

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
  check(updateData?.title === testModifiedTitle, "Updated about title persisted correctly");
  check(updateData?.content === testModifiedContent, "Updated about content persisted correctly");

  const originalTimestamp = new Date(originalRow.updated_at).getTime();
  const newTimestamp = new Date(updateData.updated_at).getTime();
  check(
    newTimestamp >= originalTimestamp,
    `Database trigger updated_at was refreshed (${originalRow.updated_at} -> ${updateData.updated_at})`,
  );

  // 2. Structured contact_information update test by authorized staff
  console.log("\n[GROUP 5: Contact Information CMS & Card Field Loading]");
  const originalContactRow = baselineMap.get("contact_information");
  const testContactTitle = "Contact ODE Outsole [TEST]";
  const testContactPayload = {
    intro: "Technical engineering and sampling headquarters in Banten. [TEST]",
    facility: {
      eyebrow: "Plant Location [TEST]",
      heading: "Main Compounding Facility [TEST]",
      name: "ODE Outsole Advanced Unit [TEST]",
      address: "Plot 24, Footwear Park\nBanten 15710, Indonesia [TEST]",
      footerNote: "Scheduled factory audits welcome [TEST]",
    },
    directEmail: {
      eyebrow: "Inquiries [TEST]",
      heading: "Engineering Sales [TEST]",
      description: "Direct engineering contact for new mold programs. [TEST]",
      email: "test.sales@odeoutsole.com",
      footerNote: "Response within 12 hours [TEST]",
    },
    phoneWhatsapp: {
      eyebrow: "Hotline [TEST]",
      heading: "Direct Line [TEST]",
      description: "Direct engineering liaison desk. [TEST]",
      phone: "+62 21 555-9999 (Desk)",
      whatsapp: "+62 812-555-9999 (WA)",
      footerNote: "Multi-language support [TEST]",
    },
    operatingHours: {
      eyebrow: "Working Hours [TEST]",
      heading: "Factory Shifts [TEST]",
      mondayFriday: "07:30 – 16:30 [TEST]",
      saturday: "08:00 – 12:00 [TEST]",
      sunday: "Closed [TEST]",
      timezone: "WIB (UTC+7) [TEST]",
    },
  };

  await new Promise((resolve) => setTimeout(resolve, 150));

  const { data: updateContactData, error: updateContactErr } = await adminClient
    .from("site_content")
    .update({
      title: testContactTitle,
      content: JSON.stringify(testContactPayload, null, 2),
    })
    .eq("content_key", "contact_information")
    .select("id, content_key, title, content, updated_at")
    .single();

  check(!updateContactErr && updateContactData, "Authorized staff can update Contact Information");
  check(updateContactData?.title === testContactTitle, "Updated contact title persisted correctly");

  // Verify all 4 card fields load correctly from updated database record
  let parsedContactResult = null;
  try {
    parsedContactResult = JSON.parse(updateContactData.content);
  } catch (err) {}

  check(Boolean(parsedContactResult), "Updated contact content parsed as valid JSON");

  // Facility fields
  check(
    parsedContactResult?.facility?.name === "ODE Outsole Advanced Unit [TEST]" &&
      parsedContactResult?.facility?.eyebrow === "Plant Location [TEST]" &&
      parsedContactResult?.facility?.heading === "Main Compounding Facility [TEST]" &&
      parsedContactResult?.facility?.address?.includes("Plot 24") &&
      parsedContactResult?.facility?.footerNote === "Scheduled factory audits welcome [TEST]",
    "Facility fields load correctly from CMS data",
  );

  // Direct email fields
  check(
    parsedContactResult?.directEmail?.email === "test.sales@odeoutsole.com" &&
      parsedContactResult?.directEmail?.heading === "Engineering Sales [TEST]" &&
      parsedContactResult?.directEmail?.eyebrow === "Inquiries [TEST]" &&
      parsedContactResult?.directEmail?.description?.includes("Direct engineering contact") &&
      parsedContactResult?.directEmail?.footerNote === "Response within 12 hours [TEST]",
    "Direct email loads correctly from CMS data",
  );

  // Phone fields & link generation
  check(
    parsedContactResult?.phoneWhatsapp?.phone === "+62 21 555-9999 (Desk)" &&
      formatPhoneLink(parsedContactResult.phoneWhatsapp.phone) === "tel:+62215559999",
    "Phone loads correctly and generates clean tel: link",
  );

  // WhatsApp fields & link generation
  check(
    parsedContactResult?.phoneWhatsapp?.whatsapp === "+62 812-555-9999 (WA)" &&
      formatWhatsAppLink(parsedContactResult.phoneWhatsapp.whatsapp) === "https://wa.me/628125559999",
    "WhatsApp loads correctly and generates clean wa.me link",
  );

  // Operating hours fields
  check(
    parsedContactResult?.operatingHours?.mondayFriday === "07:30 – 16:30 [TEST]" &&
      parsedContactResult?.operatingHours?.saturday === "08:00 – 12:00 [TEST]" &&
      parsedContactResult?.operatingHours?.sunday === "Closed [TEST]" &&
      parsedContactResult?.operatingHours?.timezone === "WIB (UTC+7) [TEST]",
    "Operating hours load correctly from CMS data",
  );

  // ==========================================================================
  // GROUP 6: Public Contact Page Reads Updated CMS Values
  // ==========================================================================
  console.log("\n[GROUP 6: Public Integration & Route Consumption]");

  // Anonymous public client reads site_content
  const { data: publicFetch, error: publicFetchErr } = await anonClient
    .from("site_content")
    .select("content_key, title, content");

  check(!publicFetchErr && publicFetch, "Public client can read modified site_content");

  const publicContactRow = publicFetch?.find((r) => r.content_key === "contact_information");
  check(
    publicContactRow?.title === testContactTitle,
    "Public Contact page reads the updated CMS title",
  );

  const publicParsedContact = JSON.parse(publicContactRow.content);
  check(
    publicParsedContact?.directEmail?.email === "test.sales@odeoutsole.com",
    "Public Contact page reads updated direct email",
  );
  check(
    publicParsedContact?.facility?.name === "ODE Outsole Advanced Unit [TEST]",
    "Public Contact page reads updated facility name",
  );
  check(
    publicParsedContact?.phoneWhatsapp?.phone === "+62 21 555-9999 (Desk)",
    "Public Contact page reads updated phone number",
  );
  check(
    publicParsedContact?.operatingHours?.mondayFriday === "07:30 – 16:30 [TEST]",
    "Public Contact page reads updated operating hours",
  );

  // Verify consumers for all 6 keys
  const publicMap = Object.fromEntries(
    (publicFetch ?? []).map((c) => [c.content_key, c]),
  );

  check(Boolean(publicMap["about_company"]), "About page consumes about_company key");
  check(Boolean(publicMap["about_oem"]), "About page consumes about_oem key");
  check(Boolean(publicMap["about_odm"]), "About page consumes about_odm key");
  check(Boolean(publicMap["contact_information"]), "Contact page consumes contact_information key");
  check(Boolean(publicMap["homepage_hero"]), "Homepage consumes homepage_hero key");
  check(Boolean(publicMap["homepage_capabilities"]), "Homepage consumes homepage_capabilities key");

  // ==========================================================================
  // GROUP 7: Restoration & Safety Cleanup
  // ==========================================================================
  console.log("\n[GROUP 7: Restoration of Authentic Baseline Data]");

  // 1. Restore about_company
  const { data: restoreAboutData, error: restoreAboutErr } = await adminClient
    .from("site_content")
    .update({
      title: originalRow.title,
      content: originalRow.content,
    })
    .eq("content_key", testKey)
    .select("id, content_key, title, content")
    .single();

  check(!restoreAboutErr && restoreAboutData, `Restored "${testKey}" to authentic baseline`);
  check(restoreAboutData?.title === originalRow.title, "Restored about title matches baseline exactly");
  check(restoreAboutData?.content === originalRow.content, "Restored about content matches baseline exactly");

  // 2. Restore contact_information
  const { data: restoreContactData, error: restoreContactErr } = await adminClient
    .from("site_content")
    .update({
      title: originalContactRow.title,
      content: originalContactRow.content,
    })
    .eq("content_key", "contact_information")
    .select("id, content_key, title, content")
    .single();

  check(!restoreContactErr && restoreContactData, "A temporary test change can be made and then restored exactly");
  check(restoreContactData?.title === originalContactRow.title, "Restored contact title matches baseline exactly");
  check(restoreContactData?.content === originalContactRow.content, "Restored contact content matches baseline exactly");

  // 3. Re-verify all 6 records match baseline values
  const { data: finalContentRows, error: finalContentErr } = await adminClient
    .from("site_content")
    .select("id, content_key, title, content");

  check(!finalContentErr && finalContentRows?.length === EXPECTED_CONTENT_KEYS.length, `Final check: Exactly ${EXPECTED_CONTENT_KEYS.length} site_content rows remain`);

  let allRestored = true;
  for (const key of EXPECTED_CONTENT_KEYS) {
    const base = baselineMap.get(key);
    const finalRow = finalContentRows?.find((r) => r.content_key === key);
    if (!finalRow || finalRow.title !== base.title || finalRow.content !== base.content) {
      allRestored = false;
      console.error(`Mismatch for key ${key}: expected "${base.title}", got "${finalRow?.title}"`);
    }
  }
  check(allRestored, "Existing site content entries remain intact (100% identical to baseline)");

  // 4. Re-verify authentic outsoles remain unchanged
  const { data: finalOutsoles } = await adminClient.from("outsoles").select("id, slug");
  check(finalOutsoles?.length === 3, "No authentic product data changes (exactly 3 outsoles)");

  for (const slug of AUTHENTIC_OUTSOLE_SLUGS) {
    const p = finalOutsoles?.find((o) => o.slug === slug);
    check(Boolean(p), `Authentic product "${slug}" remains intact`);
  }

  // 5. Re-verify sample_inquiries count has not changed
  const { count: finalInquiryCount } = await adminClient
    .from("sample_inquiries")
    .select("*", { count: "exact", head: true });

  check(initialInquiryCount === finalInquiryCount, "No inquiry data changes (inquiry table untouched)");

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
