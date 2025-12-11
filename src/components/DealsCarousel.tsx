import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { deals } from '@/data/menu';
import deal1 from '@/assets/deal-1.jpg';
import deal2 from '@/assets/deal-2.jpg';
import deal3 from '@/assets/deal-3.jpg';

const dealImages: Record<string, string> = {
  'deal-1': deal1,
  'deal-2': deal2,
  'deal-3': deal3,
};

export function DealsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % deals.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % deals.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + deals.length) % deals.length);
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl font-bold mb-6 text-center">
          Nos <span className="text-primary">Offres</span> du Moment
        </h2>
        
        <div className="relative max-w-4xl mx-auto">
          {/* Carousel Container */}
          <div className="relative overflow-hidden rounded-2xl aspect-[16/9] shadow-xl">
            {deals.map((deal, index) => (
              <div
                key={deal.id}
                className={`absolute inset-0 transition-all duration-500 ${
                  index === currentIndex
                    ? 'opacity-100 translate-x-0'
                    : index < currentIndex
                    ? 'opacity-0 -translate-x-full'
                    : 'opacity-0 translate-x-full'
                }`}
              >
                <img
                  src={dealImages[deal.image]}
                  alt={deal.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-card">
                  <h3 className="font-display text-2xl md:text-3xl font-bold mb-2">{deal.title}</h3>
                  <p className="text-card/80">{deal.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {deals.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-primary w-8'
                    : 'bg-muted hover:bg-muted-foreground'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
