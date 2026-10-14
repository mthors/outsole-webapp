import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  type GalleryItem,
  type GalleryCategory,
  getLocalizedCaption,
  getLocalizedCategoryName,
  GALLERY_CATEGORIES,
  FALLBACK_PLACEHOLDERS,
} from "@/lib/gallery-types";
import { useI18n } from "@/lib/i18n";

interface GalleryLightboxProps {
  isOpen: boolean;
  items: GalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function GalleryLightbox({
  isOpen,
  items,
  currentIndex,
  onClose,
  onIndexChange,
}: GalleryLightboxProps) {
  const { dict, locale } = useI18n();

  const handlePrev = useCallback(() => {
    if (items.length === 0) return;
    onIndexChange((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, onIndexChange]);

  const handleNext = useCallback(() => {
    if (items.length === 0) return;
    onIndexChange((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || items.length === 0) return null;

  const currentItem = items[currentIndex] ?? items[0];
  if (!currentItem) return null;

  const categoryMeta = GALLERY_CATEGORIES[currentItem.category];
  const localizedCategory = getLocalizedCategoryName(currentItem.category, locale);
  const localizedCaption = getLocalizedCaption(currentItem, locale);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={localizedCaption || localizedCategory}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-charcoal/95 p-4 md:p-8 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="flex w-full max-w-6xl items-center justify-between text-sand"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-ochre">
            {categoryMeta ? `${categoryMeta.code} / ${localizedCategory}` : localizedCategory}
          </span>
          {currentItem.is_placeholder && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-sand/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-sand/80">
              <Info className="h-3 w-3" />
              Placeholder
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-sand/60">
            {currentIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.about.gallery.lightboxClose}
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-sand/20 text-sand transition hover:border-sand hover:bg-sand/10 focus:outline-none focus:ring-1 focus:ring-sand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative flex h-full max-h-[72vh] w-full max-w-6xl items-center justify-center my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentItem.image_url}
          alt={localizedCaption || localizedCategory}
          className="max-h-full max-w-full rounded-sm object-contain shadow-2xl transition duration-200"
          onError={(e) => {
            const fallback = FALLBACK_PLACEHOLDERS[currentItem.category];
            if (!e.currentTarget.src.endsWith(fallback)) {
              e.currentTarget.src = fallback;
            }
          }}
        />

        {/* Navigation arrows (if > 1 item) */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label={dict.about.gallery.lightboxPrev}
              className="absolute left-2 md:-left-12 flex h-11 w-11 items-center justify-center rounded-sm bg-charcoal/80 border border-sand/20 text-sand transition hover:bg-charcoal hover:border-sand focus:outline-none"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={dict.about.gallery.lightboxNext}
              className="absolute right-2 md:-right-12 flex h-11 w-11 items-center justify-center rounded-sm bg-charcoal/80 border border-sand/20 text-sand transition hover:bg-charcoal hover:border-sand focus:outline-none"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Caption & Details Bar */}
      <div
        className="w-full max-w-3xl text-center pb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {localizedCaption ? (
          <p className="text-sm md:text-base font-medium text-sand leading-relaxed">
            {localizedCaption}
          </p>
        ) : (
          <p className="text-sm text-sand/70 italic">
            {localizedCategory}
          </p>
        )}

        {currentItem.is_placeholder && (
          <p className="mt-2 text-xs text-sand/50">
            {dict.about.gallery.placeholderNotice}
          </p>
        )}
      </div>
    </div>
  );
}
