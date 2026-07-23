import { useState, useEffect } from 'react';
import { X, Video, Gift, Sparkles, Clock, MapPin, Smile, Users, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ContestModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenModal = sessionStorage.getItem('twin_pizza_contest_seen');
    if (!hasSeenModal) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.getItem('twin_pizza_contest_seen') || sessionStorage.setItem('twin_pizza_contest_seen', 'true');
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <>
      {/* Floating Trigger Badge */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2.5 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 text-white px-4 py-3 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 animate-pulse border border-white/20"
        >
          <div className="bg-white/20 p-1.5 rounded-full">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div className="text-left leading-tight">
            <span className="block text-[10px] font-semibold text-amber-200 uppercase tracking-wider">⏳ FIN DANS 5 JOURS</span>
            <span className="block text-xs font-black">5 Menus Complets à Gagner 🍕🔥</span>
          </div>
          <Sparkles className="w-4 h-4 text-yellow-300 animate-bounce ml-0.5" />
        </button>
      )}

      {/* Contest Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-zinc-900 via-zinc-900 to-black text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-500/40 relative flex flex-col max-h-[92vh]">
            
            {/* Header / Poster Image */}
            <div className="relative h-52 sm:h-60 w-full bg-zinc-800 overflow-hidden flex-shrink-0">
              <img
                src="/concours-video.jpg"
                alt="Concours Vidéo Twin Pizza Grand-Couronne - 5 Menus Complets Offerts"
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/50" />

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full backdrop-blur-sm transition-colors border border-white/10"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                <div className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> 5 MENUS COMPLETS OFFERTS 🎁
                </div>
                <div className="bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Offre limitée : Fin dans 5 jours !
                </div>
              </div>

              {/* Location & Terrace Badge */}
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-amber-300 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" /> Ambiance Terrasse • Grand-Couronne
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
                  🍕 CONCOURS VIDÉO TWIN PIZZA 🎥
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm mt-1 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-red-400" />
                  <span className="font-semibold text-red-400">Attention, l'offre se termine dans 5 jours !</span>
                </p>
              </div>

              {/* Reward Highlights */}
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/40 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shrink-0 font-bold text-xl shadow-md">
                  👑
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 text-sm sm:text-base">5 MENUS COMPLETS À GAGNER !</h4>
                  <p className="text-xs text-zinc-300">Les 5 premières vidéos validées gagnent leur menu complet !</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Comment participer en 30 secondes ?</h3>
                
                <div className="flex items-start gap-3 bg-zinc-800/70 p-3 rounded-xl border border-zinc-700/60">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-black font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow">1</div>
                  <div>
                    <p className="text-xs sm:text-sm text-zinc-200 font-medium">Prends une vidéo de <strong>5 à 10 secondes</strong> !</p>
                    <p className="text-[11px] text-amber-300/90 mt-0.5 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Filme entre amis, en terrasse ou parle de l'ambiance Twin Pizza !
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-800/70 p-3 rounded-xl border border-zinc-700/60">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-black font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow">2</div>
                  <p className="text-xs sm:text-sm text-zinc-200">Publie-la sur <strong>Instagram, Snapchat, TikTok ou Facebook</strong>.</p>
                </div>

                <div className="flex items-start gap-3 bg-zinc-800/70 p-3 rounded-xl border border-zinc-700/60">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-black font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow">3</div>
                  <p className="text-xs sm:text-sm text-zinc-200">Taggue <strong>@TwinPizza</strong> ou envoie-la en message privé !</p>
                </div>
              </div>

              {/* Location & Conditions */}
              <div className="text-[11px] text-zinc-400 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1">
                <p className="font-semibold text-zinc-300 flex items-center gap-1">
                  📍 Twin Pizza Grand-Couronne (60 Rue Georges Clemenceau)
                </p>
                <p className="text-zinc-400">Profitez de notre super terrasse entre amis ! ☀️🍕</p>
              </div>
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800">
              <Button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-black font-black text-sm rounded-xl py-5 shadow-xl transition-all"
              >
                C'est parti, je participe ! 🚀
              </Button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
