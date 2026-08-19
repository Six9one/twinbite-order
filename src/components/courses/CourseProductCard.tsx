import { useState } from 'react';
import { SupplierProduct } from '@/data/supplierCatalog';
import { Minus, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CourseProductCardProps {
  product: SupplierProduct;
  quantity: number;
  onUpdateQuantity: (quantity: number) => void;
}

export function CourseProductCard({
  product,
  quantity,
  onUpdateQuantity,
}: CourseProductCardProps) {
  const isSelected = quantity > 0;

  const handleIncrement = (amount = 1) => {
    onUpdateQuantity(quantity + amount);
  };

  const handleDecrement = (amount = 1) => {
    onUpdateQuantity(Math.max(0, quantity - amount));
  };

  return (
    <div
      className={`relative rounded-2xl p-3.5 transition-all duration-200 border ${
        isSelected
          ? 'bg-emerald-950/30 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center gap-3.5">
        {/* Product Image */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700/50">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback image if network fails
              (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
            }}
          />
          {isSelected && (
            <div className="absolute top-1 left-1 w-5 h-5 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center shadow-lg">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Product Info & Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="font-semibold text-white text-sm sm:text-base leading-tight line-clamp-2">
              {product.name}
            </h3>
            {product.reference && (
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">
                #{product.reference}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            {/* Unit display */}
            <span className="text-xs font-medium text-slate-400">
              Unité : <span className="text-emerald-400 font-semibold">{product.defaultUnit}</span>
            </span>

            {/* Main Stepper Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleDecrement(1)}
                disabled={quantity === 0}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-white transition-colors"
                aria-label="Diminuer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="min-w-[2.5rem] text-center">
                <span
                  className={`font-bold text-sm sm:text-base tabular-nums ${
                    isSelected ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {quantity}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleIncrement(1)}
                className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 flex items-center justify-center text-white shadow-md transition-colors"
                aria-label="Augmenter"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tap Presets Bar (when configured for bulky items like poultry/mozza/fries) */}
      {product.presets && product.presets.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          <span className="text-[11px] text-slate-400 mr-1 flex-shrink-0 font-medium">Ajout rapide:</span>
          {product.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onUpdateQuantity(preset)}
              className={`text-xs py-1 px-2.5 rounded-lg font-medium transition-all flex-shrink-0 ${
                quantity === preset
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 active:scale-95 border border-slate-700/60'
              }`}
            >
              {preset} {product.defaultUnit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
