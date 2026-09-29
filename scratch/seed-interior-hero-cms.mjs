/**
 * seed-interior-hero-cms.mjs
 *
 * Seeds the interior_hero entry into site_content.
 * Safe to run multiple times (upserts on content_key).
 * Uses the service-role key (never exposed to the client).
 */

import { createClient } from "@supabase/supabase-js";


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const INTERIOR_HERO_DEFAULT = {
  imagePath: "",
  altText: "ODE Outsole manufacturing facility",
  eyebrow: "",
  title: "",
  description: "",
};

async function main() {
  console.log("Seeding interior_hero CMS entry...");

  const { data: existing } = await supabase
    .from("site_content")
    .select("id, content_key, title, content")
    .eq("content_key", "interior_hero")
    .maybeSingle();

  if (existing) {
    console.log("✓ interior_hero row already exists — skipping insert.");
    console.log("  Current content:", existing.content?.slice(0, 120) ?? "(empty)");
    return;
  }

  const { error } = await supabase.from("site_content").insert({
    content_key: "interior_hero",
    title: "Interior Pages Hero Background",
    content: JSON.stringify(INTERIOR_HERO_DEFAULT),
  });

  if (error) {
    console.error("✗ Failed to insert interior_hero:", error.message);
    process.exit(1);
  }

  console.log("✓ interior_hero row seeded successfully.");
  console.log("  Default content:", JSON.stringify(INTERIOR_HERO_DEFAULT, null, 2));
  console.log("");
  console.log("NOTE: imagePath is empty — the dark gradient fallback will be used until");
  console.log("  an image is uploaded to the outsole-images bucket and the path is set");
  console.log("  via Admin > Site Content > Shared > Interior Pages Hero Background.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
