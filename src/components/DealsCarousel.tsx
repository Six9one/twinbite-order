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
    description: 'De 11h à 15h - Une offre imbattable !', 
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
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Carousel Container - Made wider and larger */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl aspect-[16/7] md:aspect-[21/9] shadow-2xl">
        {creativeDeals.map((deal, index) => {
          const IconComponent = deal.icon;
          return (
            <div
              key={deal.id}
              className={`absolute inset-0 transition-all duration-700 ease-out ${
                index === currentIndex
                  ? 'opacity-100 translate-x-0 scale-100'
                  : index < currentIndex
                  ? 'opacity-0 -translate-x-full scale-95'
                  : 'opacity-0 translate-x-full scale-95'
              }`}
            >
              <img
                src={deal.image}
                alt={deal.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-amber-400" />
                  <span className="text-amber-400 font-semibold text-lg md:text-2xl">{deal.title}</span>
                </div>
                <h3 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-3">{deal.subtitle}</h3>
                <p className="text-white/80 text-base md:text-xl">{deal.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows - Made larger and more visible */}
      <button
        onClick={goPrev}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-all hover:scale-110 shadow-lg"
      >
        <ChevronLeft className="w-7 h-7 md:w-8 md:h-8" />
      </button>
      <button
        onClick={goNext}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-all hover:scale-110 shadow-lg"
      >
        <ChevronRight className="w-7 h-7 md:w-8 md:h-8" />
      </button>

      {/* Dots - Made larger */}
      <div className="flex justify-center gap-3 mt-6">
        {creativeDeals.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-primary w-10'
                : 'bg-muted w-3 hover:bg-muted-foreground'
            }`}
          />
        ))}
      </div>
    </div>
  );
}