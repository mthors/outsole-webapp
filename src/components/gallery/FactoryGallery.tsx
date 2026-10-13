import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Sparkles,
  Info,
} from "lucide-react";
import type { GalleryItem } from "@/lib/gallery-types";
import {
  GALLERY_CATEGORIES,
  FALLBACK_PLACEHOLDERS,
  getLocalizedCaption,
  getLocalizedCategoryName,
} from "@/lib/gallery-types";
import { GalleryLightbox } from "./GalleryLightbox";
import { useI18n } from "@/lib/i18n";

interface FactoryGalleryProps {
  items: GalleryItem[];
}

const SLIDE_DURATION_MS = 5000;

export function FactoryGallery({ items }: FactoryGalleryProps) {
  const { dict, locale } = useI18n();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const thumbStripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Boundary safety if items change
  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, items.length]);

  // Reduced motion media query listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    function onChange(e: MediaQueryListEvent) {
      setPrefersReducedMotion(e.matches);
    }

    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // Document visibility listener
  useEffect(() => {
    if (typeof document === "undefined") return;

    function handleVisibility() {
      setIsDocumentVisible(document.visibilityState === "visible");
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Slide navigation callbacks
  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  // Automatic slideshow timer
  useEffect(() => {
    if (items.length <= 1) return;
    if (!isPlaying) return;
    if (isHovered) return;
    if (!isDocumentVisible) return;
    if (prefersReducedMotion) return;
    if (lightboxIndex !== null) return;

    const timer = setInterval(() => {
      handleNext();
    }, SLIDE_DURATION_MS);

    return () => clearInterval(timer);
  }, [
    items.length,
    isPlaying,
    isHovered,
    isDocumentVisible,
    prefersReducedMotion,
    lightboxIndex,
    handleNext,
  ]);

  // Center active thumbnail horizontally within container ONLY (never scroll page/document)
  useEffect(() => {
    const container = thumbStripRef.current;
    const thumb = activeThumbRef.current;
    if (!container || !thumb) return;
    if (container.scrollWidth <= container.clientWidth) return;

    const containerRect = container.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const deltaX =
      thumbRect.left + thumbRect.width / 2 - (containerRect.left + containerRect.width / 2);

    if (Math.abs(deltaX) > 4) {
      container.scrollBy({
        left: deltaX,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }, [currentIndex, prefersReducedMotion]);

  // Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in form controls
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }

      // If lightbox is open, lightbox handles keys
      if (lightboxIndex !== null) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === " " && target === document.body) {
        // Spacebar toggles playback if body is active target
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, lightboxIndex]);

  // Touch swipe handling for mobile
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const diff = touchEndX - touchStartXRef.current;

    if (diff > 45) {
      handlePrev();
    } else if (diff < -45) {
      handleNext();
    }
    touchStartXRef.current = null;
  }

  const currentItem = items[currentIndex];
  const categoryMeta = currentItem ? GALLERY_CATEGORIES[currentItem.category] : null;
  const currentCaption = currentItem ? getLocalizedCaption(currentItem, locale) : "";
  const currentCatName = currentItem ? getLocalizedCategoryName(currentItem.category, locale) : "";

  const formattedCurrent = String(currentIndex + 1).padStart(2, "0");
  const formattedTotal = String(items.length).padStart(2, "0");

  return (
    <section id="factory-gallery" className="border-b border-border bg-surface py-16 md:py-24">
      <div className="shell">
        {/* Editorial Section Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="label-tech">
              <span className="text-primary">01</span> / {dict.about.gallery.eyebrow}
            </p>
            <h2 className="display-lg mt-4 text-foreground">
              {dict.about.gallery.title}
            </h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              {dict.about.gallery.intro}
            </p>
          </div>

          {/* Quick Notice if placeholders are present */}
          {items.some((i) => i.is_placeholder) && (
            <div className="max-w-sm rounded-sm border border-border bg-background p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-mono uppercase text-ochre">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Dokumentasi Visual</span>
              </div>
              <p className="mt-1 leading-normal">
                {dict.about.gallery.placeholderNotice}
              </p>
            </div>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 || !currentItem ? (
          <div className="mt-10 rounded-sm border border-dashed border-border p-12 text-center bg-background">
            <h3 className="text-base font-semibold uppercase text-foreground">
              {dict.about.gallery.emptyTitle}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {dict.about.gallery.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {/* ── Main Slideshow Stage ── */}
            <div
              className="group relative overflow-hidden rounded-sm border border-border bg-[#1F201C] text-sand shadow-sm select-none"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Stage Viewport */}
              <div
                className="relative aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] w-full cursor-zoom-in overflow-hidden"
                onClick={() => setLightboxIndex(currentIndex)}
                title={dict.about.gallery.viewLarge}
              >
                {/* Ambient Subtle Glow Layer for letterboxed photographs */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-2xl transition duration-700 ease-out pointer-events-none"
                  style={{ backgroundImage: `url(${currentItem.image_url})` }}
                />

                {/* Primary Uncropped Photograph */}
                <img
                  key={currentItem.id}
                  src={currentItem.image_url}
                  alt={currentCaption || currentCatName}
                  className="relative z-10 h-full w-full object-contain transition duration-500 ease-out"
                  onError={(e) => {
                    const fallback = FALLBACK_PLACEHOLDERS[currentItem.category];
                    if (!e.currentTarget.src.endsWith(fallback)) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />

                {/* Top Overlay Badge Bar */}
                <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-sm bg-charcoal/85 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ochre border border-sand/15 backdrop-blur-md">
                      {categoryMeta?.code} / {currentCatName}
                    </span>

                    {currentItem.is_placeholder && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-sand/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sand/90 backdrop-blur-md border border-sand/15">
                        <Info className="h-3 w-3 text-ochre" />
                        Placeholder
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(currentIndex);
                    }}
                    aria-label={dict.about.gallery.viewLarge}
                    className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-sm bg-charcoal/85 border border-sand/20 text-sand transition hover:border-sand hover:bg-charcoal focus:outline-none backdrop-blur-md"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Stage Navigation Arrows (Overlay) */}
                {items.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                      aria-label={dict.about.gallery.prevSlide}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-sm bg-charcoal/70 border border-sand/20 text-sand opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-charcoal hover:border-sand focus:opacity-100 focus:outline-none backdrop-blur-sm sm:left-4"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      aria-label={dict.about.gallery.nextSlide}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-sm bg-charcoal/70 border border-sand/20 text-sand opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-charcoal hover:border-sand focus:opacity-100 focus:outline-none backdrop-blur-sm sm:right-4"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Bottom Dark Gradient for Caption Legibility */}
                <div className="absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-charcoal/95 via-charcoal/60 to-transparent pointer-events-none" />

                {/* Bottom Caption Overlay */}
                <div className="absolute bottom-4 left-4 right-4 z-20 text-sand sm:bottom-5 sm:left-6 sm:right-6 pointer-events-none">
                  <p className="text-sm font-medium tracking-tight drop-shadow-sm sm:text-base md:text-lg max-w-4xl leading-relaxed">
                    {currentCaption || currentCatName}
                  </p>
                  {currentItem.is_placeholder && (
                    <p className="mt-1 text-[11px] text-sand/70 font-mono">
                      * Skematik fasilitas ODE (placeholder sementara)
                    </p>
                  )}
                </div>
              </div>

              {/* ── Slide Control Bar (Counter, Play/Pause, Prev/Next) ── */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-sand/15 bg-charcoal px-4 py-3 sm:px-6">
                {/* Current Slide Counter */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs tracking-widest text-ochre font-semibold">
                    {formattedCurrent} <span className="text-sand/40">/</span> {formattedTotal}
                  </span>
                  <span className="hidden sm:inline font-mono text-[11px] text-sand/50 uppercase tracking-wider">
                    {currentCatName}
                  </span>
                </div>

                {/* Slideshow Control Buttons */}
                <div className="flex items-center gap-2">
                  {/* Play / Pause Toggle */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsPlaying((prev) => !prev)}
                      aria-label={isPlaying ? dict.about.gallery.pause : dict.about.gallery.play}
                      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-sand/20 bg-charcoal/80 px-2.5 text-xs text-sand transition hover:border-sand hover:bg-sand/10 focus:outline-none"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-3.5 w-3.5 text-ochre" />
                          <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-wider">
                            {dict.about.gallery.pause}
                          </span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-sand" />
                          <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-wider">
                            {dict.about.gallery.play}
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Previous Button */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label={dict.about.gallery.prevSlide}
                      className="flex h-8 w-8 items-center justify-center rounded-sm border border-sand/20 text-sand transition hover:border-sand hover:bg-sand/10 focus:outline-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  {/* Next Button */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label={dict.about.gallery.nextSlide}
                      className="flex h-8 w-8 items-center justify-center rounded-sm border border-sand/20 text-sand transition hover:border-sand hover:bg-sand/10 focus:outline-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Compact Horizontal Thumbnail Strip ── */}
            {items.length > 1 && (
              <div className="pt-2">
                <div
                  ref={thumbStripRef}
                  className="flex w-full items-center gap-2.5 overflow-x-auto py-1 scroll-smooth no-scrollbar touch-pan-x"
                >
                  {items.map((item, idx) => {
                    const isActive = idx === currentIndex;
                    const cat = GALLERY_CATEGORIES[item.category];

                    return (
                      <button
                        key={item.id}
                        ref={isActive ? activeThumbRef : null}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`${cat?.name_en || item.category} (${idx + 1} of ${items.length})`}
                        className={`group relative flex-shrink-0 aspect-[16/10] w-20 sm:w-24 md:w-28 overflow-hidden rounded-sm border transition duration-200 focus:outline-none ${
                          isActive
                            ? "border-primary ring-2 ring-primary opacity-100 scale-[1.02] shadow-sm"
                            : "border-border/80 opacity-55 hover:opacity-90 hover:border-foreground/50"
                        }`}
                      >
                        <img
                          src={item.image_url}
                          alt={getLocalizedCaption(item, locale) || cat?.name_en || ""}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            const fallback = FALLBACK_PLACEHOLDERS[item.category];
                            if (!e.currentTarget.src.endsWith(fallback)) {
                              e.currentTarget.src = fallback;
                            }
                          }}
                        />

                        {/* Order label badge on thumbnail */}
                        <span className="absolute bottom-1 right-1 rounded-[1px] bg-charcoal/80 px-1 py-0.2 font-mono text-[9px] text-sand/90 backdrop-blur-xs">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accessible Fullscreen Lightbox Modal */}
      <GalleryLightbox
        isOpen={lightboxIndex !== null}
        items={items}
        currentIndex={lightboxIndex ?? currentIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={(idx) => {
          setLightboxIndex(idx);
          setCurrentIndex(idx);
        }}
      />
    </section>
  );
}
