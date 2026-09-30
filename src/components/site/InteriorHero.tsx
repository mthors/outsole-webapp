import type { InteriorHeroContent } from "@/lib/interior-hero";

/**
 * InteriorHero — shared editorial-style hero used by /catalog, /about, /contact, /request-sample.
 *
 * - Desktop: ~45–55vh
 * - Mobile:  ~40vh
 * - Always renders with a dark overlay for text legibility.
 * - Falls back to a rich dark gradient background when no image is available.
 * - Per-page labels (eyebrow / title) are passed as props; CMS-level eyebrow/title are unused
 *   when the page provides its own, so they serve as defaults only.
 */

interface InteriorHeroProps {
  /** Parsed CMS configuration from interior_hero site_content entry */
  config: InteriorHeroContent;
  /** Pre-generated signed URL for the image, or null for dark fallback */
  imageUrl: string | null;
  /** Per-page override: small uppercase label above the headline */
  eyebrow: string;
  /** Per-page override: primary headline */
  title: string;
  /** Per-page override: optional short description beneath the headline */
  description?: string;
}

import { useI18n } from "@/lib/i18n";

export function InteriorHero({ config, imageUrl, eyebrow, title, description }: InteriorHeroProps) {
  const { isIndonesian } = useI18n();
  const altText = config.altText || (isIndonesian ? "Fasilitas manufaktur ODE Outsole" : "ODE Outsole manufacturing facility");
  const desc = description ?? config.description ?? "";

  return (
    <section
      id="interior-hero"
      aria-label={title}
      className="interior-hero"
    >
      {/* Background image — only when a signed URL is available */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt={altText}
          aria-hidden="true"
          className="interior-hero__img"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      )}

      {/* Dark gradient overlay — always present, stronger when no image */}
      <div
        className="interior-hero__overlay"
        style={
          imageUrl
            ? undefined
            : { background: "linear-gradient(135deg, hsl(220 15% 5%) 0%, hsl(220 12% 9%) 100%)" }
        }
      />

      {/* Content */}
      <div className="shell interior-hero__content">
        {/* Accent rule */}
        <span className="rule-accent" />

        {eyebrow && (
          <p className="interior-hero__eyebrow label-tech mt-5">
            {eyebrow}
          </p>
        )}

        <h1 className="interior-hero__title display-xl mt-4">{title}</h1>

        {desc && (
          <p className="interior-hero__desc mt-5">
            {desc}
          </p>
        )}
      </div>
    </section>
  );
}

export default InteriorHero;
