import React from 'react';

interface CategoryItem {
  id: string;
  name: string;
  image: string;
  extraClass?: string;
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
  },
];

interface CategoryCardGridProps {
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryCardGrid({ onSelectCategory }: CategoryCardGridProps) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-6 pt-2 pb-2">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelectCategory(cat.id)}
          className="group flex flex-col items-center focus:outline-none"
        >
          {/* Floating 3D Graphic with Realistic Ground Shadow */}
          <div className={`relative w-full aspect-square flex items-center justify-center -mb-3 z-10 transition-transform duration-300 group-hover:-translate-y-1.5 group-active:scale-95 ${cat.extraClass || ''}`}>
            <img
              src={cat.image}
              alt={cat.name}
              className="w-[94%] h-[94%] object-contain group-hover:scale-105 transition-all duration-300 food-ground-shadow"
              loading="lazy"
            />
          </div>

          {/* White card label with warm shadow */}
          <div className="w-full bg-white rounded-2xl py-2.5 px-1 shadow-[0_2px_10px_rgba(60,30,10,0.06)] group-hover:shadow-[0_4px_14px_rgba(60,30,10,0.1)] transition-all duration-300">
            <p className="text-center font-bold text-[#3B2216] text-[12.5px] tracking-tight group-hover:text-[#C67B2E] transition-colors">
              {cat.name}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
