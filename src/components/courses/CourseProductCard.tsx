import { SupplierProduct } from '@/data/supplierCatalog';
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

  const handleIncrement = () => {
    onUpdateQuantity(quantity + 1);
  };

  const handleDecrement = () => {
    onUpdateQuantity(Math.max(0, quantity - 1));
  };

  if (viewMode === 'grid') {
    return (
      <div
        className={`relative flex flex-col justify-between p-1.5 sm:p-2 rounded-xl border transition-all duration-150 ${
          isSelected
            ? 'bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500/40'
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* Top Image & Selection Indicator */}
        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100 mb-1.5 border border-slate-100/80">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
            }}
          />
          {isSelected && (
            <div className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow">
              <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Title & Unit */}
        <div className="flex-1 min-h-[30px] sm:min-h-[36px] mb-1.5">
          <h3 className="font-bold text-slate-900 text-[10px] sm:text-[11px] leading-tight line-clamp-2">
            {product.name}
          </h3>
          <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-700 block mt-0.5">
            {product.defaultUnit}
          </span>
        </div>

        {/* Compact Micro-Stepper */}
        <div className="flex items-center justify-between bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity === 0}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-200 disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center text-slate-700 shadow-2xs transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>

          <span
            className={`text-[11px] sm:text-xs font-black tabular-nums ${
              isSelected ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            {quantity}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center shadow-2xs transition-colors"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      </div>
    );
  }

  // List View (Ultra Compact Row)
  return (
    <div
      className={`flex items-center justify-between p-1.5 sm:p-2 rounded-xl border transition-all duration-150 ${
        isSelected
          ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-400/30'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1.5">
        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
            }}
          />
          {isSelected && (
            <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-emerald-600 text-white rounded-full flex items-center justify-center">
              <Check className="w-2 h-2 stroke-[3]" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 text-xs leading-tight truncate">
            {product.name}
          </h3>
          <span className="text-[10px] font-semibold text-emerald-700">
            {product.defaultUnit}
          </span>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex-shrink-0">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={quantity === 0}
          className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center text-slate-700 shadow-2xs"
        >
          <Minus className="w-3 h-3" />
        </button>

        <span
          className={`min-w-[1.25rem] text-center text-xs font-black tabular-nums ${
            isSelected ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {quantity}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          className="w-6 h-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-2xs"
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
