import React from 'react';
import { useCategoryImages } from '@/hooks/useCategoryImages';

interface CategoryItem {
  id: string;
  name: string;
  image?: string;
  emoji?: string;
  extraClass?: string;
  /** Per-image zoom/position tuning to recenter off-center source photos and crop out excess background. */
  imgClass?: string;
  /** Source photo already has its own baked-in ground shadow — skip the drawn one to avoid a doubled shadow. */
  noGroundShadow?: boolean;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'pizzas',
    name: 'Pizzas',
    image: '/cat_pizza_3d.png',
  },
  {
    id: 'soufflets',
    name: 'Soufflet',
    image: '/cat_soufflet_3d.png',
  },
  {
    id: 'makloub',
    name: 'Makloub',
    image: '/cat_makloub_3d.png',
    extraClass: 'translate-x-1.5',
  },
  {
    id: 'sandwiches',
    name: 'Sandwich',
    emoji: '🥖',
  },
  {
    id: 'tacos',
    name: 'Tacos',
    image: '/cat_tacos_3d.png',
  },
  {
    id: 'texmex',
    name: 'Tex-Mex',
    image: '/cat_texmex_3d.png',
  },
  {
    id: 'milkshakes',
    name: 'Milkshakes',
    image: '/cat_milkshake_3d.png',
    // Source photo has a lot of empty margin + its own shadow baked in — zoom in
    // so the glass reads as large/centered as the other tiles, and skip the
    // drawn shadow since the photo already has one (that was the doubled-shadow bug).
    imgClass: 'scale-[1.3]',
    noGroundShadow: true,
  },
  {
    id: 'boissons',
    name: 'Boissons',
    emoji: '🥤',
  },
  {
    id: 'salades',
    name: 'Salade',
    emoji: '🥗',
  },
];

interface CategoryCardGridProps {
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryCardGrid({ onSelectCategory }: CategoryCardGridProps) {
  const { images } = useCategoryImages();

  return (
    <div className="grid grid-cols-2 gap-4 pt-2 pb-2">
      {CATEGORIES.map((cat, index) => {
        // The hand-picked static 3D cutout always wins when one exists.
        // Categories without one (sandwiches, boissons, salades) fall through
        // to the admin-uploaded photo from Admin > Images Catégories, then to
        // the emoji as a last resort. All three now sit inside the same
        // uniform card, so mismatched source backgrounds no longer matter.
        const dbEntry = images[cat.id];
        const image = cat.image || dbEntry?.image_url;
        const emoji = cat.emoji || dbEntry?.emoji_fallback;
        // Stagger each tile's float loop so they don't all bob in lockstep.
        const floatDelay = { animationDelay: `${(index % 5) * 0.35}s` };

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className="group flex flex-col items-center focus:outline-none"
          >
            {/* Rounded-square card — icon + label together, uniform across every category */}
            <div className="w-full aspect-square rounded-[1.6rem] bg-white border border-[#3B2216]/[0.06] shadow-[0_2px_10px_rgba(60,30,10,0.06)] p-4 flex flex-col items-center justify-center gap-2 group-hover:shadow-[0_6px_18px_rgba(60,30,10,0.12)] group-hover:-translate-y-1 group-active:scale-95 transition-all duration-300">
              <div className={`animate-float relative w-[72%] aspect-square flex items-center justify-center ${cat.extraClass || ''}`} style={floatDelay}>
                {image ? (
                  <div className="w-full h-full overflow-hidden">
                    <img
                      src={image}
                      alt={cat.name}
                      className={`w-full h-full object-contain group-hover:scale-105 transition-all duration-300 ${cat.imgClass || ''}`}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-amber-400/20 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                    <span className="text-5xl leading-none">{emoji}</span>
                  </div>
                )}
              </div>
              <p className="text-center font-bold text-[#3B2216] text-[15px] leading-tight tracking-tight group-hover:text-[#DB7F1E] transition-colors truncate w-full">
                {cat.name}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
