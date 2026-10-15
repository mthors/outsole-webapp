import { useI18n } from "@/lib/i18n";
import { Sparkles } from "lucide-react";
import type { FactoryInfoRowItem } from "@/lib/factory-info-types";

export interface FactoryInfoBlock {
  id: string;
  imageSrc: string;
  imageAlt: string;
  tag: string;
  title: string;
  description: string;
  isPlaceholder?: boolean;
}

interface FactoryInfoRowsProps {
  /** CMS-managed rows from database */
  rows?: FactoryInfoRowItem[] | undefined;
  /** Optional custom blocks for future CMS integration or testing */
  blocks?: FactoryInfoBlock[] | undefined;
  className?: string | undefined;
}

export function FactoryInfoRows({ rows, blocks, className = "" }: FactoryInfoRowsProps) {
  const { dict, locale } = useI18n();

  // 1. If explicit blocks passed (e.g. tests or custom overrides)
  if (blocks && blocks.length > 0) {
    return <RenderRows items={blocks} className={className} placeholderBadge={dict.about.gallery.infoRows.placeholderBadge} />;
  }

  // 2. If CMS rows passed (defined array)
  if (rows !== undefined) {
    const publishedRows = rows.filter((r) => r.is_published !== false);
    if (publishedRows.length === 0) {
      // Both CMS rows are unpublished: render no rows
      return null;
    }

    const items: FactoryInfoBlock[] = publishedRows.map((r) => {
      const isEnglish = locale === "en";
      const isRow1 = r.id === "row_1";
      const fallbackDefault = isRow1 ? dict.about.gallery.infoRows.row1 : dict.about.gallery.infoRows.row2;

      const title = isEnglish
        ? r.title_en?.trim() || r.title_id?.trim() || fallbackDefault.title
        : r.title_id?.trim() || r.title_en?.trim() || fallbackDefault.title;

      const description = isEnglish
        ? r.description_en?.trim() || r.description_id?.trim() || fallbackDefault.desc
        : r.description_id?.trim() || r.description_en?.trim() || fallbackDefault.desc;

      const imageAlt = isEnglish
        ? r.alt_text_en?.trim() || r.alt_text_id?.trim() || fallbackDefault.imageAlt
        : r.alt_text_id?.trim() || r.alt_text_en?.trim() || fallbackDefault.imageAlt;

      const tag = fallbackDefault.tag;

      const imageSrc =
        r.image_url ||
        r.image_path ||
        (isRow1 ? "/placeholders/machinery-equipment.svg" : "/placeholders/production-process.svg");

      const isPlaceholder =
        r.is_placeholder ??
        (typeof r.image_path === "string" ? r.image_path.startsWith("/placeholders/") : false);

      return {
        id: r.id,
        imageSrc,
        imageAlt,
        tag,
        title,
        description,
        isPlaceholder,
      };
    });

    return <RenderRows items={items} className={className} placeholderBadge={dict.about.gallery.infoRows.placeholderBadge} />;
  }

  // 3. Authentic Default Fallback (when rows prop was omitted / undefined)
  const defaultBlocks: FactoryInfoBlock[] = [
    {
      id: "machinery-equipment",
      imageSrc: "/placeholders/machinery-equipment.svg",
      imageAlt: dict.about.gallery.infoRows.row1.imageAlt,
      tag: dict.about.gallery.infoRows.row1.tag,
      title: dict.about.gallery.infoRows.row1.title,
      description: dict.about.gallery.infoRows.row1.desc,
      isPlaceholder: true,
    },
    {
      id: "production-process",
      imageSrc: "/placeholders/production-process.svg",
      imageAlt: dict.about.gallery.infoRows.row2.imageAlt,
      tag: dict.about.gallery.infoRows.row2.tag,
      title: dict.about.gallery.infoRows.row2.title,
      description: dict.about.gallery.infoRows.row2.desc,
      isPlaceholder: true,
    },
  ];

  return <RenderRows items={defaultBlocks} className={className} placeholderBadge={dict.about.gallery.infoRows.placeholderBadge} />;
}

function RenderRows({
  items,
  className,
  placeholderBadge,
}: {
  items: FactoryInfoBlock[];
  className: string;
  placeholderBadge: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={`my-12 flex flex-col gap-10 md:my-16 md:gap-14 ${className}`}
      data-testid="factory-info-rows"
    >
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8 md:gap-10 lg:gap-14"
          data-testid={`factory-info-row-${item.id === "row_2" || item.id === "production-process" ? "2" : "1"}`}
        >
          {/* Image Column (Left) */}
          <div className="w-full shrink-0 sm:w-[44%] md:w-[42%] lg:w-[40%]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-border bg-[#1F201C]/5">
              <img
                src={item.imageSrc}
                alt={item.imageAlt}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              {item.isPlaceholder && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-sm border border-sand/20 bg-charcoal/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sand/90 backdrop-blur-xs">
                  <Sparkles className="h-3 w-3 text-ochre" />
                  <span>{placeholderBadge}</span>
                </div>
              )}
            </div>
          </div>

          {/* Text Column (Right) */}
          <div className="flex-1 min-w-0">
            <p className="data-mono text-xs text-primary uppercase tracking-[0.14em]">
              {item.tag}
            </p>
            <h3 className="mt-2 text-lg sm:text-xl md:text-2xl font-semibold uppercase tracking-tight text-foreground">
              {item.title}
            </h3>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
