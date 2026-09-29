import { z } from "zod";

// ============================================================================
// Schema & Types for CMS-managed Interior Hero
// ============================================================================

export const interiorHeroSchema = z.object({
  /** Storage path inside the outsole-images bucket, e.g. "interior/hero.jpg". Empty = dark fallback. */
  imagePath: z
    .string()
    .trim()
    .max(500, "Image path must not exceed 500 characters")
    .default(""),
  altText: z
    .string()
    .trim()
    .max(300, "Alt text must not exceed 300 characters")
    .default("ODE Outsole manufacturing facility"),
  /** Small uppercase label rendered above the headline */
  eyebrow: z
    .string()
    .trim()
    .max(100, "Eyebrow must not exceed 100 characters")
    .default(""),
  /** Primary headline — each route overrides this from its own page heading */
  title: z
    .string()
    .trim()
    .max(200, "Title must not exceed 200 characters")
    .default(""),
  /** Optional sub-description rendered beneath the headline */
  description: z
    .string()
    .trim()
    .max(500, "Description must not exceed 500 characters")
    .default(""),
});

export type InteriorHeroContent = z.infer<typeof interiorHeroSchema>;
export type InteriorHeroConfig = InteriorHeroContent;

// ============================================================================
// Authentic Defaults (dark fallback, no image)
// ============================================================================

export const DEFAULT_INTERIOR_HERO: InteriorHeroContent = {
  imagePath: "",
  altText: "ODE Outsole manufacturing facility",
  eyebrow: "",
  title: "",
  description: "",
};

// ============================================================================
// Parser — resilient, graceful fallback
// ============================================================================

export function parseInteriorHero(raw: string | null | undefined): InteriorHeroContent {
  if (!raw || !raw.trim()) {
    return DEFAULT_INTERIOR_HERO;
  }
  try {
    const parsed = JSON.parse(raw);
    const result = interiorHeroSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // Non-JSON content
  }
  return DEFAULT_INTERIOR_HERO;
}

// ============================================================================
// Server-side: generate a signed URL for the interior hero image
// Uses the public (anon-key) Supabase client — same pattern as outsole images.
// ============================================================================

const BUCKET = "outsole-images";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

export async function fetchInteriorHeroSignedUrl(imagePath: string): Promise<string | null> {
  if (!imagePath) return null;
  const { publicClient } = await import("./public-catalog.server");
  const client = publicClient();
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(imagePath, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
