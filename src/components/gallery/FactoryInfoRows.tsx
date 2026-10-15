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
    return (
      <RenderRows
        items={blocks}
        className={className}
        placeholderBadge={dict.about.gallery.infoRows.placeholderBadge}
      />
    );
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
      const fallbackDefault = isRow1
        ? dict.about.gallery.infoRows.row1
        : dict.about.gallery.infoRows.row2;

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

    return (
      <RenderRows
        items={items}
        className={className}
        placeholderBadge={dict.about.gallery.infoRows.placeholderBadge}
      />
    );
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

  return (
    <RenderRows
      items={defaultBlocks}
      className={className}
      placeholderBadge={dict.about.gallery.infoRows.placeholderBadge}
    />
  );
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
      className={`my-8 md:my-12 flex flex-col gap-3 md:gap-4 ${className}`}
      data-testid="factory-info-rows"
    >
      {items.map((item, index) => {
        // Data-driven deterministic alternating layout:
        // Even index (row 1): image on left (~50%), text on right (~50%).
        // Odd index (row 2): text on left (~50%), image on right (~50%).
        const isImageLeft = index % 2 === 0;
        const testIdRow =
          item.id === "row_2" || item.id === "production-process" || index === 1 ? "2" : "1";

        const imageElement = (
          <div
            key="image-col"
            className={`relative w-full aspect-[16/10] sm:aspect-[16/9] md:aspect-auto h-full min-h-[220px] sm:min-h-[260px] md:min-h-[340px] lg:min-h-[380px] xl:min-h-[420px] overflow-hidden bg-charcoal/5 ${
              isImageLeft
                ? "border-b border-border/60 md:border-b-0 md:border-r"
                : "border-t border-border/60 md:border-t-0 md:border-l"
            }`}
          >
            <img
              src={item.imageSrc}
              alt={item.imageAlt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center transition duration-300"
              onError={(e) => {
                const isRow1 = item.id === "row_1" || item.id === "machinery-equipment";
                const fallback = isRow1
                  ? "/placeholders/machinery-equipment.svg"
                  : "/placeholders/production-process.svg";
                if (!e.currentTarget.src.endsWith(fallback)) {
                  e.currentTarget.src = fallback;
                }
              }}
            />
            {item.isPlaceholder && (
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-sm border border-sand/20 bg-charcoal/85 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-sand/90 backdrop-blur-xs">
                <Sparkles className="h-3 w-3 text-ochre" />
                <span>{placeholderBadge}</span>
              </div>
            )}
          </div>
        );

        const textElement = (
          <div
            key="text-col"
            className="flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 min-w-0"
          >
            <p className="data-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {item.tag}
            </p>
            <h3 className="mt-2.5 font-sans text-xl sm:text-2xl lg:text-[1.65rem] font-semibold uppercase tracking-tight text-foreground leading-[1.2]">
              {item.title}
            </h3>
            <p className="mt-3.5 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-xl">
              {item.description}
            </p>
          </div>
        );

        return (
          <article
            key={item.id}
            className="grid grid-cols-1 md:grid-cols-2 items-stretch border border-border/80 bg-background/35 rounded-none overflow-hidden"
            data-testid={`factory-info-row-${testIdRow}`}
          >
            {isImageLeft ? (
              <>
                {imageElement}
                {textElement}
              </>
            ) : (
              <>
                {textElement}
                {imageElement}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
