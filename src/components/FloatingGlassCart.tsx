import React from 'react';
import { useOrder } from '@/context/OrderContext';
import { ShoppingBag, ArrowRight } from 'lucide-react';

interface FloatingGlassCartProps {
  onOpenCart: () => void;
}

export function FloatingGlassCart({ onOpenCart }: FloatingGlassCartProps) {
  const { getItemCount, getTotal } = useOrder();
  const itemCount = getItemCount();
  const total = getTotal();

  if (itemCount === 0) return null;

  return (
    <div
      onClick={onOpenCart}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[88%] max-w-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-in slide-in-from-bottom-5 fade-in-0"
    >
      <div className="flex items-center justify-between h-[3.25rem] px-4 rounded-full bg-white/75 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.10)] select-none">
        {/* Cart icon + badge */}
        <div className="relative flex items-center justify-center text-stone-700">
          <ShoppingBag className="w-[1.125rem] h-[1.125rem]" />
          <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
            {itemCount}
          </span>
        </div>

        {/* Total */}
        <span className="font-extrabold text-stone-800 text-[15px] tracking-tight">
          {total.toFixed(2)} €
        </span>

        {/* CTA */}
        <div className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[13px] px-3.5 py-1.5 rounded-xl transition-colors shadow-sm">
          Commander
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
