import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { supabase } from '@/integrations/supabase/client';

interface GalleryImage {
  id: string;
  title: string | null;
  image_url: string;
}

export function GallerySlider() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Touch gesture support for mobile swiping
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const fetchImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('gallery_images' as any)
      .select('id, title, image_url')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (!error && data) {
      setImages(data as unknown as GalleryImage[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Fast auto-advance carousel (2200ms)
  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [images.length]);

  const goTo = (index: number) => setCurrentIndex(index);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 30;
    if (diff > minSwipeDistance) {
      goNext();
    } else if (diff < -minSwipeDistance) {
      goPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (loading || images.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] bg-[#FDEEDD] shadow-sm py-4 px-3">
      <h2 className="text-[1.05rem] font-extrabold text-[#3B2216] tracking-tight mb-3 px-2 text-center">
        Notre Galerie
      </h2>

      <div className="relative w-full max-w-[420px] mx-auto px-1">
        {/* Fast Smooth Horizontal Sliding Gallery Frame */}
        <div
          className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl bg-[#F7E7D5] shadow-inner select-none touch-pan-y border border-[#3B2216]/5"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex w-full h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((image, index) => (
              <div key={image.id} className="relative w-full h-full flex-shrink-0 flex items-center justify-center p-2 bg-[#F7E7D5]">
                <OptimizedImage
                  src={image.image_url}
                  alt={image.title || 'Photo Twin Pizza'}
                  eager={index === 0}
                  className="w-full h-full object-contain rounded-xl drop-shadow-sm"
                  containerClassName="w-full h-full flex items-center justify-center"
                  showSkeleton={true}
                />
                {image.title && (
                  <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-6 text-white text-center rounded-b-2xl">
                    <p className="text-xs font-semibold tracking-wide">{image.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Controls */}
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Photo précédente"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-stone-900/40 hover:bg-stone-900/70 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                aria-label="Photo suivante"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-stone-900/40 hover:bg-stone-900/70 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Slide Indicator Dots */}
        {images.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-3">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                aria-label={`Aller à la photo ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-[#DB7F1E] w-5'
                    : 'bg-[#3B2216]/20 w-1.5 hover:bg-[#3B2216]/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
