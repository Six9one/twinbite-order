import React from 'react';
import { Star, Phone, ArrowRight, CupSoda, IceCream2 } from 'lucide-react';

interface BottomSectionsProps {
  onSelectCategory: (categoryId: string) => void;
}

export function BottomSections({ onSelectCategory }: BottomSectionsProps) {
  const categories = [
    {
      id: 'boissons',
      title: 'Boissons',
      desc: 'Sodas, Eau, Canettes 33cl',
      emoji: '🥤',
      Icon: CupSoda,
    },
    {
      id: 'crepes',
      title: 'Desserts',
      desc: 'Crêpes, Gaufres, Glaces',
      emoji: '🍨',
      Icon: IceCream2,
    },
  ];

  const reviews = [
    {
      name: 'Krimo B.',
      quote: 'Les meilleures pizzas de la ville !',
      stars: 5,
    },
    {
      name: 'Sarah M.',
      quote: 'Makloub et Tacos au top !',
      stars: 5,
    },
    {
      name: 'Yassin K.',
      quote: 'Super accueil, milkshakes parfaits !',
      stars: 5,
    },
  ];

  return (
    <div className="space-y-6 px-4 pb-28">
      {/* Section 1: Boissons & Desserts */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-stone-800 flex items-center gap-2">
          <span>🥤</span> Boissons & Desserts
        </h2>
        <div className="flex flex-col gap-3">
          {categories.map((cat) => {
            const Icon = cat.Icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="w-full bg-white hover:bg-stone-50/80 active:scale-[0.99] transition-all duration-150 rounded-2xl p-4 flex items-center justify-between shadow-sm border border-stone-100/80 text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-xl leading-none">{cat.emoji}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-800 text-base leading-snug">{cat.title}</h3>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">{cat.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-stone-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 2: Avis Clients */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-stone-800 flex items-center gap-2">
            <span>⭐</span> Avis Clients
          </h2>
          <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200/60 shadow-xs">
            4.9/5
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
          {reviews.map((rev, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 min-w-[240px] max-w-[260px] shrink-0 snap-start flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-1 text-amber-400 mb-2">
                  {[...Array(rev.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-stone-600 italic leading-relaxed mb-3">
                  "{rev.quote}"
                </p>
              </div>
              <p className="text-xs font-bold text-stone-800">{rev.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Appeler-nous */}
      <section>
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Besoin d'aide ?</h3>
            <p className="text-xs text-orange-100 font-medium">
              Appelez Twin Pizza directement
            </p>
          </div>
          <a
            href="tel:0232112613"
            className="inline-flex items-center justify-center gap-2 bg-white text-stone-900 font-bold text-sm px-4 py-2.5 rounded-2xl shadow-sm hover:bg-stone-100 active:scale-[0.98] transition-all w-full sm:w-auto"
          >
            <Phone className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>02 32 11 26 13</span>
          </a>
        </div>
      </section>
    </div>
  );
}
