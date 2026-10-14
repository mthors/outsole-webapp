import { useI18n } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

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
  /** Optional custom blocks for future CMS integration or testing */
  blocks?: FactoryInfoBlock[];
  className?: string;
}

export function FactoryInfoRows({ blocks, className = "" }: FactoryInfoRowsProps) {
  const { dict } = useI18n();

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

  const items = blocks && blocks.length > 0 ? blocks : defaultBlocks;

  return (
    <div
      className={`my-12 flex flex-col gap-10 md:my-16 md:gap-14 ${className}`}
      data-testid="factory-info-rows"
    >
      {items.map((item, idx) => (
        <article
          key={item.id}
          className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8 md:gap-10 lg:gap-14"
          data-testid={`factory-info-row-${idx + 1}`}
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
                  <span>{dict.about.gallery.infoRows.placeholderBadge}</span>
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
