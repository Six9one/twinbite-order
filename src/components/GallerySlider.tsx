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
    <section className="rounded-[2rem] bg-[#FDEEDD] shadow-[0_-10px_28px_-8px_rgba(60,30,10,0.18)] py-5">
      <h2 className="text-[1.1rem] font-extrabold text-[#3B2216] tracking-tight mb-3 px-5">
        Notre Galerie
      </h2>
      <div className="relative w-full max-w-5xl mx-auto px-2">
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] shadow-xl">
        {images.map((image, index) => (
          <div
            key={image.id}
            className={`absolute inset-0 transition-all duration-700 ease-out ${
              index === currentIndex
                ? 'opacity-100 translate-x-0 scale-100'
                : index < currentIndex
                ? 'opacity-0 -translate-x-full scale-95'
                : 'opacity-0 translate-x-full scale-95'
            }`}
          >
            <OptimizedImage
              src={image.image_url}
              alt={image.title || 'Photo Twin Pizza'}
              eager={index === 0}
              className="w-full h-full object-cover"
              containerClassName="w-full h-full"
              showSkeleton={true}
            />
            {image.title && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                  <p className="text-sm sm:text-base font-semibold">{image.title}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Photo précédente"
            className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-all hover:scale-110 shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={goNext}
            aria-label="Photo suivante"
            className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-all hover:scale-110 shadow-lg"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="flex justify-center gap-2 mt-4">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                aria-label={`Aller à la photo ${index + 1}`}
                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-primary w-6 sm:w-8'
                    : 'bg-muted w-2 sm:w-2.5 hover:bg-muted-foreground'
                }`}
              />
            ))}
          </div>
        </>
      )}
      </div>
    </section>
  );
}
