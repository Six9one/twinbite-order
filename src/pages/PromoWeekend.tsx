import { useState, useRef, useEffect } from 'react';
import { useOrder } from '@/context/OrderContext';
import { MenuItem } from '@/types/order';
import { pizzasTomate, pizzasCreme } from '@/data/menu';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { calculateTVA } from '@/utils/promotions';
import { usePizzasByBase } from '@/hooks/useProducts';
import { playTossAnimation } from '@/utils/tossAnimation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Check, 
  Phone, 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus,
  Sparkles,
  CreditCard,
  Banknote,
  Loader2,
  MapPin,
  X,
  PartyPopper,
  Flame,
  Wine,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  Info,
  Search,
  ShoppingCart
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── High Quality Pizza Disk Images ───
const LOCAL_PIZZA_IMAGES: Record<string, string> = {
  'margherita': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80',
  'végétarienne': 'https://images.unsplash.com/photo-1571066811602-71683a3f680d?w=500&q=80',
  'fruits de mer': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80',
  'mexicaine': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&q=80',
  '4 saisons': 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=500&q=80',
  'reine': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80',
  'orientale': 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80',
  'campione': 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=500&q=80',
  '4 fromages': 'https://images.unsplash.com/photo-1573821663912-569905455b1c?w=500&q=80',
  'calzone': 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=500&q=80',
  'savoyarde': 'https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=500&q=80',
  'pêcheur': 'https://images.unsplash.com/photo-1534080391025-097d02b173e9?w=500&q=80',
  'pimento': 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=500&q=80',
  'royale': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80',
  '3 jambons': 'https://images.unsplash.com/photo-1555072956-7758afb20a8f?w=500&q=80',
  'twinizienne': 'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=500&q=80',
  'tartiflette': 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=500&q=80',
  'kebab': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=500&q=80',
  'norvégienne': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
  'buffalo': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&q=80',
  'raclette': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80',
  'antillaise': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&q=80',
  'chèvre miel': 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&q=80',
  'farmer': 'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=500&q=80',
  'charcutière': 'https://images.unsplash.com/photo-1555072956-7758afb20a8f?w=500&q=80',
  'boursin': 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=500&q=80',
  'biggy': 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80',
  'cheezy': 'https://images.unsplash.com/photo-1548369937-2751babf242d?w=500&q=80',
  'chicken': 'https://images.unsplash.com/photo-1562967914-6c8273b89a3e?w=500&q=80',
  'indienne': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80',
  'la hawaïe': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80',
};

function getPizzaImage(name: string, defaultUrl?: string): string {
  if (defaultUrl && defaultUrl.startsWith('http')) return defaultUrl;
  const key = name.toLowerCase().trim();
  return LOCAL_PIZZA_IMAGES[key] || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80';
}

// ─── Available Free Drink Choices ───
const FREE_DRINKS = [
  { id: 'coca-33', name: 'Coca-Cola 33cl', icon: '🥤' },
  { id: 'coca-zero-33', name: 'Coca-Cola Zéro 33cl', icon: '🥤' },
  { id: 'oasis-33', name: 'Oasis Tropical 33cl', icon: '🧃' },
  { id: 'fanta-33', name: 'Fanta Orange 33cl', icon: '🍊' },
  { id: 'icetea-33', name: 'Ice Tea Pêche 33cl', icon: '🍑' },
  { id: 'sprite-33', name: 'Sprite 33cl', icon: '🍋' },
  { id: 'tropico-33', name: 'Tropico 33cl', icon: '🍍' },
  { id: 'eau-50', name: 'Eau Minérale 50cl', icon: '💧' },
  { id: 'perrier-33', name: 'Perrier 33cl', icon: '🫧' }
];

// ─── Custom Extra Options ───
const EXTRA_OPTIONS = [
  { id: 'ex-mozza', name: 'Supplément Mozzarella', price: 1.5 },
  { id: 'ex-chevre', name: 'Supplément Chèvre', price: 1.5 },
  { id: 'ex-reblochon', name: 'Supplément Reblochon', price: 1.5 },
  { id: 'ex-poulet', name: 'Supplément Poulet', price: 2.0 },
  { id: 'ex-viande', name: 'Supplément Viande Hachée', price: 2.0 },
  { id: 'ex-merguez', name: 'Supplément Merguez', price: 2.0 },
  { id: 'ex-harissa', name: 'Sauce Harissa', price: 0.5 },
  { id: 'ex-barbecue', name: 'Sauce Barbecue', price: 0.5 }
];

// ─── Pizza Item in Selection ───
interface PizzaOfferItem {
  pizza: MenuItem;
  note: string;
  base: 'tomate' | 'creme';
  removedIngredients: string[];
  addedExtras: { name: string; price: number }[];
  drinks: string[]; // Needs exactly 2 drinks per pizza
}

export default function PromoWeekend() {
  const { clearCart } = useOrder();
  const createOrder = useCreateOrder();
  
  // View Wizard steps: 'pizza' -> 'drinks' -> 'checkout' -> 'success'
  const [step, setStep] = useState<'pizza' | 'drinks' | 'checkout' | 'success'>('pizza');

  // Customer State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<'emporter' | 'surplace' | 'livraison'>('emporter');
  const [address, setAddress] = useState('');
  const [globalNotes, setGlobalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cb' | 'especes'>('cb');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState('');

  // Pizza & Drinks Selection State
  const [activeBase, setActiveBase] = useState<'tomate' | 'creme'>('tomate');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPizzas, setSelectedPizzas] = useState<PizzaOfferItem[]>([]);

  // Customization Modal State
  const [customizingPizza, setCustomizingPizza] = useState<MenuItem | null>(null);
  const [customBase, setCustomBase] = useState<'tomate' | 'creme'>('tomate');
  const [customNote, setCustomNote] = useState('');
  const [customRemoved, setCustomRemoved] = useState<string[]>([]);
  const [customExtras, setCustomExtras] = useState<{ name: string; price: number }[]>([]);

  // DB Pizzas query
  const { data: dbPizzasTomate } = usePizzasByBase('tomate');
  const { data: dbPizzasCreme } = usePizzasByBase('creme');

  const displayPizzasTomate = dbPizzasTomate && dbPizzasTomate.length > 0 
    ? dbPizzasTomate.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: 10.90, // PROMO OFFER PRICE
        category: 'pizzas' as const,
        base: p.pizza_base as 'tomate' | 'creme' || 'tomate',
        imageUrl: p.image_url || undefined
      }))
    : pizzasTomate.map(p => ({ ...p, price: 10.90 }));

  const displayPizzasCreme = dbPizzasCreme && dbPizzasCreme.length > 0 
    ? dbPizzasCreme.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: 10.90, // PROMO OFFER PRICE
        category: 'pizzas' as const,
        base: p.pizza_base as 'tomate' | 'creme' || 'creme',
        imageUrl: p.image_url || undefined
      }))
    : pizzasCreme.map(p => ({ ...p, price: 10.90 }));

  const displayPizzas = (activeBase === 'tomate' ? displayPizzasTomate : displayPizzasCreme)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()));

  // Open Customization Modal for a Pizza
  const openCustomizer = (pizza: MenuItem) => {
    setCustomizingPizza(pizza);
    setCustomBase(pizza.base || activeBase);
    setCustomNote('');
    setCustomRemoved([]);
    setCustomExtras([]);
  };

  // Confirm Customization and Add to Cart
  const handleConfirmCustomization = () => {
    if (!customizingPizza) return;

    setSelectedPizzas(prev => [
      ...prev,
      {
        pizza: customizingPizza,
        note: customNote,
        base: customBase,
        removedIngredients: customRemoved,
        addedExtras: customExtras,
        drinks: []
      }
    ]);

    toast({
      title: `🍕 ${customizingPizza.name} ajoutée !`,
      description: `Prix spécial: 10,90€ + 2 boissons offertes`,
      className: "bg-amber-600 text-white border-none font-bold",
      duration: 1500,
    });

    setCustomizingPizza(null);
  };

  // Add pizza directly (default customization) with Toss Animation
  const handleAddPizzaDirect = (e: React.MouseEvent<HTMLButtonElement>, pizza: MenuItem) => {
    playTossAnimation(e.currentTarget, 'pizzas');
    
    setSelectedPizzas(prev => [
      ...prev,
      {
        pizza,
        note: '',
        base: pizza.base || activeBase,
        removedIngredients: [],
        addedExtras: [],
        drinks: []
      }
    ]);
    toast({
      title: `🍕 ${pizza.name} ajoutée !`,
      description: `Prix spécial: 10,90€ (2 boissons offertes incluses)`,
      className: "bg-amber-600 text-white border-none font-bold",
      duration: 1500,
    });
  };

  // Remove pizza from selection
  const handleRemovePizza = (index: number) => {
    setSelectedPizzas(prev => prev.filter((_, i) => i !== index));
  };

  // Handle Drink selection per pizza
  const toggleDrinkForPizza = (pizzaIndex: number, drinkName: string) => {
    setSelectedPizzas(prev => prev.map((item, i) => {
      if (i !== pizzaIndex) return item;
      const currentDrinks = item.drinks;
      if (currentDrinks.includes(drinkName)) {
        return { ...item, drinks: currentDrinks.filter(d => d !== drinkName) };
      } else {
        if (currentDrinks.length >= 2) {
          return { ...item, drinks: [currentDrinks[0], drinkName] };
        }
        return { ...item, drinks: [...currentDrinks, drinkName] };
      }
    }));
  };

  // Total Calculation: 10.90€ + extras per Senior Pizza
  const totalPrice = selectedPizzas.reduce((acc, item) => {
    const extrasTotal = item.addedExtras.reduce((eAcc, e) => eAcc + e.price, 0);
    return acc + 10.90 + extrasTotal;
  }, 0);

  // Validation before going to drinks step
  const handleProceedToDrinks = () => {
    if (selectedPizzas.length === 0) {
      toast({
        title: "Veuillez choisir au moins 1 pizza",
        description: "Sélectionnez votre Pizza Senior à 10,90€ pour profiter de l'offre.",
        variant: "destructive"
      });
      return;
    }
    setStep('drinks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Validation before going to checkout step
  const handleProceedToCheckout = () => {
    const incompleteIndex = selectedPizzas.findIndex(p => p.drinks.length < 2);
    if (incompleteIndex !== -1) {
      toast({
        title: "Boissons incomplètes",
        description: `Veuillez choisir 2 boissons offertes pour la pizza N°${incompleteIndex + 1} (${selectedPizzas[incompleteIndex].pizza.name}).`,
        variant: "destructive"
      });
      return;
    }
    setStep('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Order to Supabase & Trigger Notifications
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Nom requis", description: "Veuillez saisir votre nom.", variant: "destructive" });
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      toast({ title: "Téléphone valide requis", description: "Veuillez saisir votre numéro de téléphone.", variant: "destructive" });
      return;
    }
    if (orderType === 'livraison' && !address.trim()) {
      toast({ title: "Adresse requise", description: "Veuillez indiquer l'adresse de livraison.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const generatedNum = generateOrderNumber();
      setConfirmedOrderNumber(generatedNum);

      // Build items array formatted for Supabase orders table
      const orderItems = selectedPizzas.map((item, idx) => {
        const itemPrice = 10.90 + item.addedExtras.reduce((eAcc, e) => eAcc + e.price, 0);
        const customDetails: string[] = [];
        if (item.base) customDetails.push(`Base: ${item.base}`);
        if (item.removedIngredients.length > 0) customDetails.push(`Sans: ${item.removedIngredients.join(', ')}`);
        if (item.addedExtras.length > 0) customDetails.push(`Suppléments: ${item.addedExtras.map(e => e.name).join(', ')}`);
        customDetails.push(`Boissons Offertes: ${item.drinks.join(', ')}`);
        if (item.note) customDetails.push(`Note: ${item.note}`);

        return {
          id: `promo-1090-${idx}-${Date.now()}`,
          item: {
            ...item.pizza,
            price: itemPrice
          },
          quantity: 1,
          customization: {
            base: item.base,
            size: 'senior',
            promoApplied: 'senior_10.90_2_drinks',
            note: customDetails.join(' | '),
            freeDrinks: item.drinks
          },
          calculatedPrice: itemPrice
        };
      });

      // Combine notes
      const notesList: string[] = [];
      if (globalNotes.trim()) notesList.push(`Note globale: ${globalNotes.trim()}`);
      selectedPizzas.forEach((p, i) => {
        notesList.push(`Pizza ${i + 1} (${p.pizza.name}): Base ${p.base} | Boissons [${p.drinks.join(', ')}]${p.note ? ` (${p.note})` : ''}`);
      });
      const finalNotes = `🔥 OFFRE CE SOIR (10.90€ + 2 BOISSONS) 🔥 | ` + notesList.join(' | ');

      const { ht, tva, ttc } = calculateTVA(totalPrice);

      // Insert Order into Supabase
      await createOrder.mutateAsync({
        order_number: generatedNum,
        order_type: orderType,
        items: orderItems as any,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_address: orderType === 'livraison' ? address.trim() : null,
        customer_notes: finalNotes,
        payment_method: paymentMethod,
        subtotal: ht,
        tva,
        total: ttc,
        delivery_fee: orderType === 'livraison' ? 2.5 : 0,
        status: 'pending',
        is_scheduled: false,
        scheduled_for: null
      });

      // Send Telegram notification
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            orderNumber: generatedNum,
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerAddress: orderType === 'livraison' ? address.trim() : null,
            customerNotes: finalNotes,
            orderType: orderType,
            paymentMethod,
            total: ttc,
            subtotal: ht,
            tva,
            deliveryFee: orderType === 'livraison' ? 2.5 : 0,
            items: orderItems.map(i => ({
              name: `${i.item.name} (Senior 10.90€ + 2 Boissons: ${i.customization.freeDrinks.join(', ')})`,
              quantity: 1,
              price: i.calculatedPrice,
              customization: i.customization
            })),
            isScheduled: false,
            scheduledFor: null,
            promoSource: 'special_offer_1090'
          }
        });
      } catch (tgErr) {
        console.error('Telegram error:', tgErr);
      }

      clearCart();
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error('Failed to submit order:', err);
      toast({
        title: "Erreur lors de la commande",
        description: err.message || "Un problème est survenu. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: SUCCESS VIEW
  // ═══════════════════════════════════════════════════════════════
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-stone-950 text-white font-sans flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-stone-900 border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
          
          <div className="w-20 h-20 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/40 animate-bounce">
            <PartyPopper className="w-10 h-10" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              Commande Confirmée
            </span>
            <h1 className="text-3xl font-black text-white">Merci {name} !</h1>
            <p className="text-stone-400 text-sm mt-1">Votre commande est transmise en cuisine.</p>
          </div>

          <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-left space-y-2">
            <div className="flex justify-between items-center text-sm border-b border-stone-800 pb-2">
              <span className="text-stone-400">N° de commande</span>
              <span className="text-amber-400 font-extrabold text-lg">#{confirmedOrderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Pizzas Senior</span>
              <span className="font-bold text-white">{selectedPizzas.length} pizza(s) (10,90€/u)</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Boissons offertes</span>
              <span className="font-bold text-green-400">{selectedPizzas.length * 2} boissons</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-stone-800">
              <span className="text-stone-300 font-bold">Total réglé / à régler</span>
              <span className="text-amber-400 font-black text-xl">{totalPrice.toFixed(2)} €</span>
            </div>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left text-xs text-amber-200 space-y-1">
            <p className="font-bold">📍 Information Restaurant Twin Pizza :</p>
            <p>Téléphone : <a href="tel:0769116301" className="underline font-bold">07 69 11 63 01</a></p>
            <p>Retrait : {orderType === 'emporter' ? 'À Emporter' : orderType === 'surplace' ? 'Sur Place' : 'Livraison'}</p>
          </div>

          <Button 
            onClick={() => {
              setSelectedPizzas([]);
              setStep('pizza');
            }}
            className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-black py-4 text-base rounded-2xl"
          >
            Passer une autre commande
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans pb-32">
      {/* ─── PROMO BANNER HEADER ─── */}
      <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur border-b border-amber-500/30 px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500 text-stone-950 font-black rounded-xl flex items-center justify-center text-xl shadow-lg">
              🍕
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                TWIN PIZZA <span className="px-2 py-0.5 bg-amber-500 text-stone-950 text-[10px] font-black rounded-full uppercase">Offre Spéciale</span>
              </h1>
              <p className="text-xs text-amber-400 font-bold">Toutes les Pizzas Senior à 10,90€ + 2 Boissons OFFERTES !</p>
            </div>
          </div>

          {selectedPizzas.length > 0 && (
            <div className="bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 rounded-xl text-right shopping-cart-btn">
              <div className="text-[10px] text-stone-400 font-bold">Panier</div>
              <div className="text-sm font-black text-amber-400">{totalPrice.toFixed(2)} € ({selectedPizzas.length})</div>
            </div>
          )}
        </div>
      </header>

      {/* ─── HERO INTRO BANNER ─── */}
      <section className="bg-gradient-to-b from-amber-500/10 via-stone-950 to-stone-950 px-4 py-6 border-b border-stone-800">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-xs font-extrabold text-amber-400 animate-pulse">
            <Flame className="w-4 h-4 text-amber-400" /> OFFRE CE SOIR - 1 PIZZA SENIOR + 2 BOISSONS OFFERTES
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            1 Pizza Senior = <span className="text-amber-400">10,90 €</span>
          </h2>
          <p className="text-stone-300 text-sm md:text-base max-w-xl mx-auto">
            Sélectionnez votre Pizza Senior au choix à <strong className="text-amber-400 font-bold">10,90 €</strong> et personnalisez vos ingrédients avec l'animation de rotation !
          </p>

          {/* Wizard Step Indicator */}
          <div className="flex justify-center items-center gap-2 pt-2 text-xs font-bold">
            <span className={`px-3 py-1 rounded-full ${step === 'pizza' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-800 text-stone-400'}`}>
              1. Pizzas (10.90€)
            </span>
            <ChevronRight className="w-3 h-3 text-stone-600" />
            <span className={`px-3 py-1 rounded-full ${step === 'drinks' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-800 text-stone-400'}`}>
              2. 2 Boissons Offertes
            </span>
            <ChevronRight className="w-3 h-3 text-stone-600" />
            <span className={`px-3 py-1 rounded-full ${step === 'checkout' ? 'bg-amber-500 text-stone-950 font-black' : 'bg-stone-800 text-stone-400'}`}>
              3. Validation
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          STEP 1: PIZZA SELECTION (ROUNDED ROTATING PIZZA DISKS + TOSS ANIMATION)
         ═══════════════════════════════════════════════════════════════ */}
      {step === 'pizza' && (
        <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
          {/* Base selector & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-stone-900 p-3 rounded-2xl border border-stone-800">
            <div className="flex bg-stone-950 p-1 rounded-xl w-full sm:w-auto border border-stone-800">
              <button
                onClick={() => setActiveBase('tomate')}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-black transition-all ${
                  activeBase === 'tomate'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Base Tomate ({displayPizzasTomate.length})
              </button>
              <button
                onClick={() => setActiveBase('creme')}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-black transition-all ${
                  activeBase === 'creme'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Base Crème ({displayPizzasCreme.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
              <Input 
                type="text"
                placeholder="Rechercher une pizza..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-stone-950 border-stone-800 text-white placeholder:text-stone-500 rounded-xl text-xs pl-9 w-full"
              />
            </div>
          </div>

          {/* Pizza Grid Cards with Rotating Pizza Disks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPizzas.map((pizza) => {
              const countInCart = selectedPizzas.filter(p => p.pizza.id === pizza.id).length;
              const imageUrl = getPizzaImage(pizza.name, pizza.imageUrl);

              return (
                <div 
                  key={pizza.id}
                  className="bg-stone-900 border border-stone-800 hover:border-amber-500/60 rounded-3xl p-5 flex flex-col justify-between transition-all shadow-xl group relative overflow-hidden"
                >
                  {/* Pizza Disk with Image Spin Rotation */}
                  <div className="flex justify-center items-center py-3 relative">
                    <div className="w-40 h-40 rounded-full p-1 border-4 border-amber-500/30 group-hover:border-amber-400 shadow-2xl relative transition-all duration-700 bg-stone-950 overflow-hidden flex items-center justify-center">
                      <img 
                        src={imageUrl} 
                        alt={pizza.name}
                        className="w-full h-full object-cover rounded-full transition-transform duration-1000 ease-out group-hover:rotate-[360deg] active:scale-95 cursor-pointer"
                        onClick={() => openCustomizer(pizza)}
                      />
                    </div>

                    <span className="absolute top-0 left-0 bg-amber-500 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
                      10,90 €
                    </span>

                    <span className="absolute top-0 right-0 bg-green-500/90 text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow-lg backdrop-blur">
                      +2 Boissons
                    </span>

                    {countInCart > 0 && (
                      <span className="absolute bottom-0 right-2 bg-amber-500 text-stone-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-lg">
                        {countInCart} en panier
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-2 pt-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-black text-white text-lg group-hover:text-amber-400 transition-colors">
                        {pizza.name}
                      </h3>
                      <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed mt-1">{pizza.description}</p>
                    </div>

                    {/* Price and Action Buttons */}
                    <div className="pt-3 border-t border-stone-800 space-y-2">
                      <div className="flex justify-center items-baseline gap-2">
                        <span className="text-2xl font-black text-amber-400">10,90 €</span>
                        <span className="text-xs text-stone-500 line-through font-bold">18,00 €</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openCustomizer(pizza)}
                          className="border-stone-800 hover:border-amber-500 text-stone-300 hover:text-white rounded-xl text-xs py-2.5 font-bold flex items-center justify-center gap-1"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" /> Modifier
                        </Button>

                        <Button
                          type="button"
                          onClick={(e) => handleAddPizzaDirect(e, pizza)}
                          className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs py-2.5 flex items-center justify-center gap-1 shadow-md"
                        >
                          <Plus className="w-4 h-4" /> Ajouter
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Cart Bar */}
          {selectedPizzas.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur border-t border-amber-500/40 p-4 shadow-2xl">
              <div className="max-w-4xl mx-auto space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Votre Panier ({selectedPizzas.length} pizza{selectedPizzas.length > 1 ? 's' : ''})</h4>
                    <p className="text-xs text-amber-400 font-bold">Total : {totalPrice.toFixed(2)} € • {selectedPizzas.length * 2} boissons offertes incluses</p>
                  </div>
                  <Button 
                    onClick={handleProceedToDrinks}
                    className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-6 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg animate-pulse shopping-cart-btn"
                  >
                    Choisir mes boissons offertes <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {selectedPizzas.map((item, idx) => (
                    <div key={idx} className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-white">{idx + 1}. {item.pizza.name}</span>
                      {item.addedExtras.length > 0 && <span className="text-[10px] text-amber-400">(+{item.addedExtras.reduce((a, b) => a + b.price, 0).toFixed(2)}€)</span>}
                      <button 
                        onClick={() => handleRemovePizza(idx)}
                        className="text-stone-500 hover:text-red-400 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PIZZA CUSTOMIZATION MODAL (COMME D'HABITUDE BRO)
         ═══════════════════════════════════════════════════════════════ */}
      {customizingPizza && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-950">
              <div className="flex items-center gap-3">
                <img 
                  src={getPizzaImage(customizingPizza.name, customizingPizza.imageUrl)} 
                  alt={customizingPizza.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-amber-500 animate-spin-slow"
                />
                <div>
                  <h3 className="font-extrabold text-white text-base">{customizingPizza.name}</h3>
                  <p className="text-xs text-amber-400 font-bold">Pizza Senior • 10,90 €</p>
                </div>
              </div>
              <button 
                onClick={() => setCustomizingPizza(null)}
                className="p-2 rounded-xl bg-stone-900 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Sauce Base Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-stone-300">Sauce de Base</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomBase('tomate')}
                    className={`py-2.5 px-3 rounded-xl font-bold border transition-all text-xs ${
                      customBase === 'tomate'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    🍅 Base Sauce Tomate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomBase('creme')}
                    className={`py-2.5 px-3 rounded-xl font-bold border transition-all text-xs ${
                      customBase === 'creme'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    🥛 Base Crème Fraîche
                  </button>
                </div>
              </div>

              {/* Extras & Suppléments */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-stone-300">Ajouter des Suppléments / Extras</Label>
                <div className="grid grid-cols-2 gap-2">
                  {EXTRA_OPTIONS.map((extra) => {
                    const isAdded = customExtras.some(e => e.id === extra.id);

                    return (
                      <button
                        key={extra.id}
                        type="button"
                        onClick={() => {
                          if (isAdded) {
                            setCustomExtras(prev => prev.filter(e => e.id !== extra.id));
                          } else {
                            setCustomExtras(prev => [...prev, extra]);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left flex justify-between items-center transition-all ${
                          isAdded
                            ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                            : 'bg-stone-950 border-stone-800 text-stone-400'
                        }`}
                      >
                        <span>{extra.name}</span>
                        <span className="text-amber-400 font-bold">+{extra.price.toFixed(2)}€</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Pizza Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-300">Instructions Particulières pour le Chef</Label>
                <Input 
                  type="text"
                  placeholder="Ex: Bien cuite, sans oignons, découper en 8..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-white text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-between items-center">
              <div>
                <div className="text-[10px] text-stone-400">Prix total pizza</div>
                <div className="text-lg font-black text-amber-400">
                  {(10.90 + customExtras.reduce((a, b) => a + b.price, 0)).toFixed(2)} €
                </div>
              </div>
              <Button
                onClick={handleConfirmCustomization}
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-6 py-3 rounded-xl text-sm"
              >
                Ajouter au Panier (10,90 €)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 2: FREE DRINKS SELECTION
         ═══════════════════════════════════════════════════════════════ */}
      {step === 'drinks' && (
        <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
          <button 
            onClick={() => setStep('pizza')}
            className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Modifier ma sélection de pizzas
          </button>

          <div className="bg-stone-900 border border-amber-500/40 rounded-2xl p-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Wine className="w-5 h-5 text-amber-400" /> Choisissez vos 2 Boissons OFFERTES par Pizza
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Pour chaque Pizza Senior à 10,90€, sélectionnez 2 boissons gratuites.
            </p>
          </div>

          <div className="space-y-6">
            {selectedPizzas.map((item, pizzaIdx) => (
              <div key={pizzaIdx} className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="font-black text-amber-400 text-base">
                      Pizza N°{pizzaIdx + 1} : {item.pizza.name} (Senior 10,90€)
                    </h3>
                    <p className="text-xs text-stone-400">
                      Boissons sélectionnées : <strong className="text-white">{item.drinks.length} / 2</strong>
                    </p>
                  </div>
                  {item.drinks.length === 2 && (
                    <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border border-green-500/30">
                      <Check className="w-3.5 h-3.5" /> Boissons Choisies
                    </span>
                  )}
                </div>

                {/* Drinks selection grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                  {FREE_DRINKS.map((drink) => {
                    const isSelected = item.drinks.includes(drink.name);

                    return (
                      <button
                        key={drink.id}
                        type="button"
                        onClick={() => toggleDrinkForPizza(pizzaIdx, drink.name)}
                        className={`p-3 rounded-xl text-left border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white font-bold shadow-md'
                            : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        <span className="text-xs flex items-center gap-2">
                          <span>{drink.icon}</span>
                          <span>{drink.name}</span>
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-between items-center">
            <Button 
              variant="outline"
              onClick={() => setStep('pizza')}
              className="border-stone-800 text-stone-400 hover:text-white"
            >
              Retour aux pizzas
            </Button>

            <Button 
              onClick={handleProceedToCheckout}
              className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-black px-8 py-3 rounded-xl text-sm flex items-center gap-2 shadow-lg"
            >
              Valider et Passer la Commande <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </main>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STEP 3: CHECKOUT FORM
         ═══════════════════════════════════════════════════════════════ */}
      {step === 'checkout' && (
        <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
          <button 
            onClick={() => setStep('drinks')}
            className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Modifier les boissons
          </button>

          <form onSubmit={handleSubmitOrder} className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="border-b border-stone-800 pb-4">
              <h2 className="text-xl font-black text-white">Coordonnées de Commande</h2>
              <p className="text-xs text-stone-400 mt-1">
                Finalisez votre commande de {selectedPizzas.length} pizza(s) Senior pour <strong>{totalPrice.toFixed(2)} €</strong>.
              </p>
            </div>

            {/* Mode de Retrait */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-stone-300">Mode de Retrait</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'emporter', label: '🛍️ À Emporter' },
                  { id: 'surplace', label: '🍽️ Sur Place' },
                  { id: 'livraison', label: '🛵 Livraison' }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrderType(type.id as any)}
                    className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all ${
                      orderType === type.id
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Address if delivery */}
            {orderType === 'livraison' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-300">Adresse de livraison complète</Label>
                <Input 
                  type="text"
                  placeholder="N° rue, nom de rue, étage, digicode..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-white text-xs rounded-xl"
                  required
                />
              </div>
            )}

            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-300">Votre Nom *</Label>
                <Input 
                  type="text"
                  placeholder="Ex: Alexandre Dupuis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-white text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-stone-300">Numéro de Téléphone *</Label>
                <Input 
                  type="tel"
                  placeholder="Ex: 06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-stone-950 border-stone-800 text-white text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-stone-300">Mode de Règlement</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cb')}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                    paymentMethod === 'cb'
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-amber-400" /> Carte Bancaire</span>
                  {paymentMethod === 'cb' && <Check className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('especes')}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                    paymentMethod === 'especes'
                      ? 'bg-amber-500/20 border-amber-500 text-white'
                      : 'bg-stone-950 border-stone-800 text-stone-400'
                  }`}
                >
                  <span className="flex items-center gap-2"><Banknote className="w-4 h-4 text-amber-400" /> Espèces</span>
                  {paymentMethod === 'especes' && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Order Summary Box */}
            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-2 text-xs">
              <h4 className="font-extrabold text-amber-400 border-b border-stone-800 pb-2">Récapitulatif de votre commande</h4>
              {selectedPizzas.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-stone-300 py-1">
                  <div>
                    <span className="font-bold text-white">{item.pizza.name} (Senior)</span>
                    <div className="text-[11px] text-stone-400">Boissons : {item.drinks.join(', ')}</div>
                    {item.addedExtras.length > 0 && <div className="text-[11px] text-amber-400">Extras: {item.addedExtras.map(e => e.name).join(', ')}</div>}
                  </div>
                  <span className="font-bold text-amber-400">{(10.90 + item.addedExtras.reduce((a, b) => a + b.price, 0)).toFixed(2)} €</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-stone-800 text-sm font-extrabold text-white">
                <span>Total à régler</span>
                <span className="text-amber-400 text-base">{totalPrice.toFixed(2)} €</span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-black py-4 text-base rounded-2xl shadow-xl flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Transmission en cuisine...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" /> CONFIRMER MA COMMANDE ({totalPrice.toFixed(2)} €)
                </>
              )}
            </Button>
          </form>
        </main>
      )}
    </div>
  );
}
