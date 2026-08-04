import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    if (images.length < 2) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  const goTo = (index: number) => setCurrentIndex(index);
  const goNext = () => setCurrentIndex(prev => (prev + 1) % images.length);
  const goPrev = () => setCurrentIndex(prev => (prev - 1 + images.length) % images.length);

  if (loading || images.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] bg-[#FDEEDD] shadow-sm py-4 px-3">
      <h2 className="text-[1.05rem] font-extrabold text-[#3B2216] tracking-tight mb-2.5 px-2 text-center">
        Notre Galerie
      </h2>
      
      <div className="relative w-full max-w-[260px] sm:max-w-[290px] mx-auto">
        {/* Compact Square Gallery Frame with rounded corners and no borders */}
        <div className="relative w-full aspect-square overflow-hidden rounded-[1.5rem] bg-stone-900/90 shadow-sm">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                index === currentIndex
                  ? 'opacity-100 scale-100 z-10 pointer-events-auto'
                  : 'opacity-0 scale-95 z-0 pointer-events-none'
              }`}
            >
              {/* Ambient Blurred Background */}
              <img
                src={image.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 select-none pointer-events-none"
              />

              {/* Main Crisp Image - rounded & fitted without borders */}
              <div className="relative z-10 w-full h-full flex items-center justify-center p-1">
                <OptimizedImage
                  src={image.image_url}
                  alt={image.title || 'Photo Twin Pizza'}
                  eager={index === 0}
                  className="w-full h-full object-contain rounded-xl"
                  containerClassName="w-full h-full flex items-center justify-center"
                  showSkeleton={true}
                />
              </div>

              {/* Title overlay */}
              {image.title && (
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-5 text-white text-center">
                  <p className="text-[11px] sm:text-xs font-semibold tracking-wide">{image.title}</p>
                </div>
              )}
            </div>
          ))}

          {/* Navigation Controls - Borderless buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Photo précédente"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goNext}
                aria-label="Photo suivante"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Slide Indicator Dots */}
        {images.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-2.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                aria-label={`Aller à la photo ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-[#DB7F1E] w-4'
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
