import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Flame, Star } from 'lucide-react';
import deal1 from '@/assets/deal-1.png';
import deal2 from '@/assets/deal-2.jpg';
import deal3 from '@/assets/deal-3.jpg';
const creativeDeals = [{
  id: 'deal-1',
  title: '🔥 Best Sellers',
  subtitle: '1 Achetée = 1 Offerte',
  description: 'Sur place & À emporter',
  image: deal1,
  icon: Flame
}, {
  id: 'deal-2',
  title: '⭐ Top Pick',
  subtitle: '2 Achetées = 1 Offerte',
  description: 'En livraison - 3 pizzas pour le prix de 2',
  image: deal2,
  icon: Star
}, {
  id: 'deal-3',
  title: '✨ Menu Midi',
  subtitle: 'Pizza + Boisson = 10€',
  description: 'De 11h à 15h - Une offre imbattable !',
  image: deal3,
  icon: Sparkles
}];
export function DealsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % creativeDeals.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  const goTo = (index: number) => {
    setCurrentIndex(index);
  };
  const goNext = () => {
    setCurrentIndex(prev => (prev + 1) % creativeDeals.length);
  };
  const goPrev = () => {
    setCurrentIndex(prev => (prev - 1 + creativeDeals.length) % creativeDeals.length);
  };
  return <div className="relative w-full max-w-5xl mx-auto px-2">
    {/* Carousel Container - Better mobile aspect ratio */}
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] shadow-xl">
      {creativeDeals.map((deal, index) => {
        const IconComponent = deal.icon;
        return <div key={deal.id} className={`absolute inset-0 transition-all duration-700 ease-out ${index === currentIndex ? 'opacity-100 translate-x-0 scale-100' : index < currentIndex ? 'opacity-0 -translate-x-full scale-95' : 'opacity-0 translate-x-full scale-95'}`}>
          <img src={deal.image} alt={deal.title} loading={index === 0 ? "eager" : "lazy"} decoding="async" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
            <div className="flex items-center gap-2 mb-1">
              <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              <span className="text-sm sm:text-base font-semibold text-amber-400">{deal.title}</span>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">{deal.subtitle}</h3>
            <p className="text-sm sm:text-base text-white/80">{deal.description}</p>
          </div>
        </div>;
      })}
    </div>

    {/* Navigation Arrows - Smaller on mobile */}
    <button onClick={goPrev} className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-all hover:scale-110 shadow-lg">
      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
    </button>
    <button onClick={goNext} className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-all hover:scale-110 shadow-lg">
      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
    </button>

    {/* Dots - Adjusted size */}
    <div className="flex justify-center gap-2 mt-4">
      {creativeDeals.map((_, index) => <button key={index} onClick={() => goTo(index)} className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-primary w-6 sm:w-8' : 'bg-muted w-2 sm:w-2.5 hover:bg-muted-foreground'}`} />)}
    </div>
  </div>;
}
