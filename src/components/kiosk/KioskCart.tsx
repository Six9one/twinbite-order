import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

interface KioskCartProps {
    customerName: string;
    orderType: 'surplace' | 'emporter';
    onConfirm: () => void;
}

export function KioskCart({ customerName, orderType, onConfirm }: KioskCartProps) {
    const { cart, removeFromCart, updateQuantity, getTotal, getItemCount } = useOrder();
    const itemCount = getItemCount();
    const total = getTotal();

    return (
        <div className="h-full flex flex-col bg-slate-900/50 border-l border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-bold text-white">Votre Commande</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                        {customerName}
                    </Badge>
                    <Badge className="bg-white/10 text-white/70 border-white/20 text-xs">
                        {orderType === 'surplace' ? '🍽️ Sur Place' : '🛍️ À Emporter'}
                    </Badge>
                </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/30">
                        <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">Votre panier est vide</p>
                        <p className="text-xs mt-1">Sélectionnez des produits</p>
                    </div>
                ) : (
                    cart.map((item) => {
                        const price = item.calculatedPrice ?? item.item.price;
                        return (
                            <div
                                key={item.id}
                                className="bg-white/5 rounded-xl p-3 border border-white/10"
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white text-sm truncate">
                                            {item.item.name}
                                        </p>
                                        {item.customization && (
                                            <div className="text-xs text-white/40 mt-0.5">
                                                {item.customization.size && (
                                                    <span className="text-amber-400">{item.customization.size.toUpperCase()}</span>
                                                )}
                                                {item.customization.meats?.length > 0 && (
                                                    <span> • {item.customization.meats.join(', ')}</span>
                                                )}
                                                {item.customization.meat && (
                                                    <span> • {item.customization.meat}</span>
                                                )}
                                                {item.customization.sauces?.length > 0 && (
                                                    <span> • {item.customization.sauces.join(', ')}</span>
                                                )}
                                                {item.customization.menuOption && item.customization.menuOption !== 'none' && (
                                                    <span> • Option: {item.customization.menuOption}</span>
                                                )}
                                                {item.customization.menuDrink && (
                                                    <span> • Boisson incluse: {item.customization.menuDrink}</span>
                                                )}
                                                {item.customization.extraDrinks?.length > 0 && (
                                                    <span> • + Boissons extras: {item.customization.extraDrinks.join(', ')}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-amber-400 font-bold text-sm whitespace-nowrap">
                                        {(price * item.quantity).toFixed(2)}€
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="w-8 h-8 text-slate-900 hover:bg-slate-100"
                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        >
                                            <Minus className="w-3 h-3" />
                                        </Button>
                                        <span className="w-8 text-center text-white font-bold text-sm">
                                            {item.quantity}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="w-8 h-8 text-slate-900 hover:bg-slate-100"
                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                                        onClick={() => removeFromCart(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer with total and confirm */}
            {itemCount > 0 && (
                <div className="p-4 border-t border-white/10 bg-gradient-to-t from-slate-900 to-transparent space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-white/70 text-sm">{itemCount} article{itemCount > 1 ? 's' : ''}</span>
                        <span className="text-2xl font-extrabold text-white">{total.toFixed(2)}€</span>
                    </div>
                    <Button
                        onClick={onConfirm}
                        className="w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
                    >
                        ✅ Confirmer la commande
                    </Button>
                </div>
            )}
        </div>
    );
}
