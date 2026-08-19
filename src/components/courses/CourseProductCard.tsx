import { SupplierProduct } from '@/data/supplierCatalog';
import { getCleanDisplayName } from '@/lib/coursesNameFormatter';
import { Minus, Plus, Check } from 'lucide-react';

interface CourseProductCardProps {
  product: SupplierProduct;
  quantity: number;
  viewMode?: 'grid' | 'list';
  onUpdateQuantity: (quantity: number) => void;
}

export function CourseProductCard({
  product,
  quantity,
  viewMode = 'grid',
  onUpdateQuantity,
}: CourseProductCardProps) {
  const isSelected = quantity > 0;
  const displayName = getCleanDisplayName(product.name);

  const handleIncrement = () => {
    onUpdateQuantity(quantity + 1);
  };

  const handleDecrement = () => {
    onUpdateQuantity(Math.max(0, quantity - 1));
  };

  if (viewMode === 'grid') {
    return (
      <div
        className={`group relative flex flex-col justify-between p-2 sm:p-2.5 rounded-2xl border transition-all duration-200 ${
          isSelected
            ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/15'
            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-sm'
        }`}
      >
        {/* Product Image */}
        <div className="relative w-full aspect-square rounded-[18px] overflow-hidden bg-slate-100 mb-2 border border-slate-100">
          <img
            src={product.image}
            alt={displayName}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
            }}
          />
          {isSelected && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Product Info (Short Clean Title + Unit Badge) */}
        <div className="flex-1 min-h-[46px] mb-2">
          <h3 className="font-semibold text-slate-900 text-xs sm:text-[13px] leading-snug line-clamp-2">
            {displayName}
          </h3>
          <div className="mt-1">
            <span
              className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md ${
                isSelected
                  ? 'bg-emerald-100/70 text-emerald-800 font-semibold'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {product.defaultUnit}
            </span>
          </div>
        </div>

        {/* Modern Compact Quantity Selector */}
        <div className="flex items-center justify-between bg-slate-50 p-1 rounded-xl border border-slate-200/70">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity === 0}
            className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 active:scale-95 disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center text-slate-700 shadow-2xs transition-all"
            aria-label="Diminuer la quantité"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span
            className={`text-xs sm:text-sm font-bold tabular-nums transition-transform duration-150 ${
              isSelected ? 'text-emerald-700 scale-105' : 'text-slate-400'
            }`}
          >
            {quantity}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all"
            aria-label="Augmenter la quantité"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    );
  }

  // List View (Compact Row)
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-200 ${
        isSelected
          ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/15'
          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-[0_2px_6px_rgba(0,0,0,0.02)]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
        <div className="relative w-12 h-12 rounded-[14px] overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
          <img
            src={product.image}
            alt={displayName}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
            }}
          />
          {isSelected && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight truncate">
            {displayName}
          </h3>
          <span className="inline-block mt-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {product.defaultUnit}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/70 flex-shrink-0">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={quantity === 0}
          className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-100 active:scale-95 disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center text-slate-700 shadow-2xs transition-all"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span
          className={`min-w-[1.5rem] text-center text-xs sm:text-sm font-bold tabular-nums ${
            isSelected ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {quantity}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-xs transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
