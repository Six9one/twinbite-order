import { useState, useEffect } from 'react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TestOrderButtonProps {
  onStartTestCheckout: () => void;
}

export function TestOrderButton({ onStartTestCheckout }: TestOrderButtonProps) {
  const { clearCart, addToCart, setOrderType } = useOrder();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Enable if URL has ?test=1, or localhost, or if test_mode flag is set in localStorage
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === '1' || window.location.hostname === 'localhost') {
      localStorage.setItem('test_mode', 'true');
      setEnabled(true);
    } else if (localStorage.getItem('test_mode') === 'true') {
      setEnabled(true);
    }

    // Shortcut key Shift + T to toggle test mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
        const next = !localStorage.getItem('test_mode');
        if (next) {
          localStorage.setItem('test_mode', 'true');
          setEnabled(true);
          toast({ title: 'MODE TEST ACTIVÉ ⚡', description: 'Le bouton d\'ordre de test est affiché!' });
        } else {
          localStorage.removeItem('test_mode');
          setEnabled(false);
          toast({ title: 'Mode test désactivé' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!enabled) return null;

  const handleFastTestOrder = (price: number = 0.01) => {
    clearCart();
    setOrderType('emporter');

    // Add sample test item
    addToCart(
      {
        id: 'test-item-1',
        name: 'Test Fast myPOS',
        description: 'Commande de test rapide 0.01€',
        price: price,
        category: 'pizzas',
        image: '/favicon.png',
      },
      1,
      {
        base: 'tomate',
        size: 'senior',
        sauces: [],
        toppings: [],
        supplements: [],
      } as any,
      price
    );

    // Save test customer info into localStorage for auto-filling
    localStorage.setItem('tp_customer_name', 'ADEL BEGUIR');
    localStorage.setItem('tp_customer_phone', '0769116307');
    localStorage.setItem('tp_customer_address', '104 BD MAURICE BERTEAUX');

    toast({
      title: `⚡ Test Order (${price.toFixed(2)}€)`,
      description: 'Redirection directe vers le paiement myPOS...',
    });

    onStartTestCheckout();
  };

  return (
    <div className="fixed bottom-20 right-4 z-[99999] flex gap-2">
      <Button
        onClick={() => handleFastTestOrder(0.01)}
        className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-full px-4 py-3 shadow-2xl border-2 border-black flex items-center gap-2 active:scale-95 text-xs sm:text-sm"
      >
        <Zap className="w-4 h-4 text-black fill-black" />
        <span>TEST 0.01€</span>
      </Button>
      <Button
        onClick={() => handleFastTestOrder(1.00)}
        className="bg-zinc-800 hover:bg-zinc-900 text-white font-extrabold rounded-full px-3 py-3 shadow-2xl border-2 border-zinc-700 flex items-center gap-1 active:scale-95 text-xs"
      >
        <span>1.00€</span>
      </Button>
    </div>
  );
}
