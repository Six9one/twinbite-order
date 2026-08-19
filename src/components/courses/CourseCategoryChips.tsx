import { useRef } from 'react';
import { FoodCategoryChip } from '@/lib/coursesNameFormatter';

interface CourseCategoryChipsProps {
  categories: FoodCategoryChip[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categoryCounts: Record<string, number>;
}

export function CourseCategoryChips({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}: CourseCategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative w-full -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] ?? 0;

          // Don't show category chip if empty (unless it's 'all')
          if (cat.id !== 'all' && count === 0) return null;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 active:scale-95 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs border border-slate-900'
                  : 'bg-white text-slate-600 border border-slate-200/90 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
