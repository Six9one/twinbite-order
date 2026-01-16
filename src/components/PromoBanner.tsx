import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
const promos = ["🍕 MENU MIDI - Pizza + Boisson à seulement 10€ ! (11h-minuit)", "🎉 1 ACHETÉE = 1 OFFERTE sur place & à emporter !", "🚗 LIVRAISON GRATUITE dès 15€ à Grand-Couronne !"];
export function PromoBanner() {
  const [currentPromo, setCurrentPromo] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromo(prev => (prev + 1) % promos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  if (!isVisible) return null;
  return <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 py-2 px-4 relative overflow-hidden text-secondary-foreground">
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

    <div className="container mx-auto flex items-center justify-center relative text-secondary-foreground">
      <div className="animate-fade-in text-center font-medium text-sm md:text-base">
        {promos[currentPromo]}
      </div>
      <button onClick={() => setIsVisible(false)} className="absolute right-0 p-1 hover:bg-white/20 rounded transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Sliding dots indicator */}
    <div className="flex justify-center gap-1 mt-1 text-destructive-foreground">
      {promos.map((_, idx) => <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentPromo ? 'bg-white w-4' : 'bg-white/50'}`} />)}
    </div>
  </div>;
}