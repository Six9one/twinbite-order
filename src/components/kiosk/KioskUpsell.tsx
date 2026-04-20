import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProductsByCategory } from '@/hooks/useProducts';

interface KioskUpsellProps {
    onAddItem: (category: string) => void;
    onSkip: () => void;
}

export function KioskUpsell({ onAddItem, onSkip }: KioskUpsellProps) {
    const { data: fritesProducts } = useProductsByCategory('frites');
    const { data: boissonsProducts } = useProductsByCategory('boissons');

    return (
        <div className="h-full flex flex-col items-center justify-start pt-12 p-8">
            <h2 className="text-3xl font-bold text-white mb-2 text-center">
                🎉 Ajouté au panier !
            </h2>
            <p className="text-xl text-white/50 mb-10 text-center">
                Un petit extra ?
            </p>

            <div className="grid grid-cols-3 gap-6 max-w-3xl w-full mb-10">
                {/* Frites */}
                <Card
                    className="p-6 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all border-2 border-transparent hover:border-amber-400/50 text-center"
                    onClick={() => onAddItem('frites')}
                >
                    <span className="text-6xl block mb-4">🍟</span>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Frites</h3>
                    <p className="text-sm text-slate-500">
                        À partir de {fritesProducts?.[0]?.base_price?.toFixed(2) ?? '3.00'}€
                    </p>
                </Card>

                {/* Boisson */}
                <Card
                    className="p-6 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all border-2 border-transparent hover:border-blue-400/50 text-center"
                    onClick={() => onAddItem('boissons')}
                >
                    <span className="text-6xl block mb-4">🥤</span>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Boisson</h3>
                    <p className="text-sm text-slate-500">
                        À partir de {boissonsProducts?.[0]?.base_price?.toFixed(2) ?? '2.00'}€
                    </p>
                </Card>

                {/* Dessert */}
                <Card
                    className="p-6 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all border-2 border-transparent hover:border-pink-400/50 text-center"
                    onClick={() => onAddItem('crepes')}
                >
                    <span className="text-6xl block mb-4">🍰</span>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Dessert</h3>
                    <p className="text-sm text-slate-500">Crêpes, Gaufres...</p>
                </Card>
            </div>

            <Button
                variant="outline"
                size="lg"
                onClick={onSkip}
                className="h-14 px-12 text-xl text-slate-600 border-slate-300 hover:text-slate-900 hover:bg-slate-100"
            >
                Non merci, continuer →
            </Button>
        </div>
    );
}
