import { SUPPLIER_CATEGORIES } from '@/data/supplierCatalog';

interface CourseCategoryTabsProps {
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  selectedCount: number;
  showOnlySelected: boolean;
  onToggleOnlySelected: () => void;
}

export function CourseCategoryTabs({
  activeCategory,
  onSelectCategory,
  selectedCount,
  showOnlySelected,
  onToggleOnlySelected,
}: CourseCategoryTabsProps) {
  return (
    <div className="sticky top-[69px] z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 py-2.5 px-4 -mx-4 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 min-w-max">
        {/* Quick Filter: Selected only */}
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onToggleOnlySelected}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showOnlySelected
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
            }`}
          >
            <span>🛒 Mon Panier</span>
            <span className="px-1.5 py-0.2 bg-emerald-400 text-slate-950 rounded-full text-[10px] font-black">
              {selectedCount}
            </span>
          </button>
        )}

        {/* Categories */}
        {SUPPLIER_CATEGORIES.map((cat) => {
          const isActive = !showOnlySelected && activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (showOnlySelected) onToggleOnlySelected();
                onSelectCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-white text-slate-950 border-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
