import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Flame, Star } from 'lucide-react';
import deal1 from '@/assets/deal-1.jpg';
import deal2 from '@/assets/deal-2.jpg';
import deal3 from '@/assets/deal-3.jpg';

const creativeDeals = [
  { 
    id: 'deal-1', 
    title: '🔥 Best Sellers', 
    subtitle: '1 Achetée = 1 Offerte',
    description: 'Sur place & À emporter', 
    image: deal1,
    icon: Flame
  },
  { 
    id: 'deal-2', 
    title: '⭐ Top Pick', 
    subtitle: '2 Achetées = 1 Offerte',
    description: 'En livraison - 3 pizzas pour le prix de 2', 
    image: deal2,
    icon: Star
  },
  { 
    id: 'deal-3', 
    title: '✨ Menu Midi', 
    subtitle: 'Pizza + Boisson = 10€',
    description: 'Une offre imbattable !', 
    image: deal3,
    icon: Sparkles
  },
];

export function DealsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % creativeDeals.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % creativeDeals.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + creativeDeals.length) % creativeDeals.length);
  };

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Carousel Container */}
      <div className="relative overflow-hidden rounded-2xl aspect-[16/9] shadow-xl">
        {creativeDeals.map((deal, index) => {
          const IconComponent = deal.icon;
          return (
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
                src={deal.image}
                alt={deal.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="w-6 h-6 text-amber-400" />
                  <span className="text-amber-400 font-semibold text-lg">{deal.title}</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-bold mb-1">{deal.subtitle}</h3>
                <p className="text-white/80">{deal.description}</p>
              </div>
            </div>
          );
        })}
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
        {creativeDeals.map((_, index) => (
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
  );
}