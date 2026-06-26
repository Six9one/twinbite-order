import { useState, useRef, useEffect } from 'react';
import { useOrder } from '@/context/OrderContext';
import { MenuItem } from '@/types/order';
import { pizzasTomate, pizzasCreme } from '@/data/menu';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { applyPizzaPromotions, calculateTVA } from '@/utils/promotions';
import { usePizzasByBase } from '@/hooks/useProducts';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Pizza, 
  Check, 
  ShoppingBag, 
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
  ChevronUp,
  PartyPopper,
  Clock,
  Lock,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAdminSetting } from '@/hooks/useAdminSettings';

// ─── Per-pizza note tracking ───
interface PizzaInCart {
  pizza: MenuItem;
  note: string;
  cartItemId?: string;
}

export default function PromoWeekend() {
  const { cart, addToCart, removeFromCart, clearCart } = useOrder();
  const createOrder = useCreateOrder();
  const [view, setView] = useState<'landing' | 'checkout' | 'success'>('landing');

  // Load promo settings
  const { data: promoSettingsSetting, isLoading: loadingPromoSettings } = useAdminSetting('promo_page_settings');
  const promoSettings = promoSettingsSetting?.setting_value as {
    enabled?: boolean;
    schedule_type?: 'manual' | 'scheduled';
    scheduled_days?: string[];
    scheduled_start_time?: string;
    scheduled_end_time?: string;
  } | undefined;

  // Customer checkout state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [globalNotes, setGlobalNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cb' | 'especes'>('cb');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Pizza selection
  const [activeBase, setActiveBase] = useState<'tomate' | 'creme'>('tomate');
  const [selectedPizzas, setSelectedPizzas] = useState<PizzaInCart[]>([]);
  const [cartOpen, setCartOpen] = useState(false);


  // Database pizza queries
  const { data: dbPizzasTomate } = usePizzasByBase('tomate');
  const { data: dbPizzasCreme } = usePizzasByBase('creme');

  // Map database products to MenuItems and fallback to static menu
  const displayPizzasTomate = dbPizzasTomate && dbPizzasTomate.length > 0 
    ? dbPizzasTomate.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.base_price || 18,
        category: 'pizzas' as const,
        base: p.pizza_base as 'tomate' | 'creme' || 'tomate',
        imageUrl: p.image_url || undefined
      }))
    : pizzasTomate;

  const displayPizzasCreme = dbPizzasCreme && dbPizzasCreme.length > 0 
    ? dbPizzasCreme.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.base_price || 18,
        category: 'pizzas' as const,
        base: p.pizza_base as 'tomate' | 'creme' || 'creme',
        imageUrl: p.image_url || undefined
      }))
    : pizzasCreme;

  const displayPizzas = activeBase === 'tomate' ? displayPizzasTomate : displayPizzasCreme;

  const selectorRef = useRef<HTMLDivElement>(null);

  const scrollToSelector = () => {
    selectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ─── Pricing ───
  const totalPizzas = selectedPizzas.length;
  const pairs = Math.floor(totalPizzas / 2);
  const odd = totalPizzas % 2;
  const promoTotal = (pairs * 16) + (odd * 16); // 16€ per pair (1 achetée = 1 offerte), odd = 16€

  // ─── Add pizza (unlimited) ───
  const handleAddPizza = (pizza: MenuItem) => {
    setSelectedPizzas(prev => [...prev, { pizza, note: '' }]);
    
    // Haptic-like feedback
    toast({
      title: `${pizza.name} ajoutée !`,
      description: `${totalPizzas + 1} pizza${totalPizzas + 1 > 1 ? 's' : ''} • ${calculateNewTotal(totalPizzas + 1)}`,
      className: "bg-green-600 text-white border-none",
      duration: 1500,
    });
  };

  const calculateNewTotal = (count: number) => {
    const p = Math.floor(count / 2);
    const o = count % 2;
    return `${(p * 16 + o * 16).toFixed(2)} €`;
  };

  // ─── Remove pizza ───
  const handleRemovePizza = (index: number) => {
    setSelectedPizzas(prev => prev.filter((_, i) => i !== index));

  };

  // ─── Update note for a pizza ───
  const handleUpdateNote = (index: number, note: string) => {
    setSelectedPizzas(prev => prev.map((p, i) => i === index ? { ...p, note } : p));
  };

  // ─── Count of a specific pizza in selection ───
  const getPizzaCount = (pizzaId: string) => {
    return selectedPizzas.filter(p => p.pizza.id === pizzaId).length;
  };

  // ─── Proceed to checkout ───
  const handleCheckoutClick = () => {
    if (selectedPizzas.length === 0) {
      toast({
        title: "Panier vide",
        description: "Veuillez d'abord choisir au moins une pizza.",
        variant: "destructive"
      });
      return;
    }
    setCartOpen(false);
    setView('checkout');
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast({ title: 'Erreur', description: 'Veuillez entrer votre nom', variant: 'destructive' });
      return false;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      toast({ title: 'Erreur', description: 'Veuillez entrer un numéro de téléphone à 10 chiffres', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsProcessing(true);
    const generatedNum = await generateOrderNumber();
    setOrderNumber(generatedNum);

    try {
      // Clear existing cart and add all selected pizzas
      clearCart();
      
      // Build items for the order
      const orderItems = selectedPizzas.map((p, idx) => ({
        id: `promo-${idx}-${Date.now()}`,
        item: p.pizza,
        quantity: 1,
        customization: {
          base: p.pizza.base || 'tomate',
          size: 'senior' as const,
          promoApplied: 'weekend_promo',
          note: p.note || undefined,
        },
        calculatedPrice: idx % 2 === 0 
          ? (idx + 1 < selectedPizzas.length ? 8 : 18) // first in pair = 8€ if pair exists
          : 8, // second in pair = 8€
      }));

      // Recalculate proper prices: pairs at 8€ each, odd at 18€
      const recalculatedItems = selectedPizzas.map((p, idx) => {
        const pairIndex = Math.floor(idx / 2);
        const isInCompletePair = idx < pairs * 2;
        const isSecondInPair = idx % 2 === 1 && isInCompletePair;
        const price = isSecondInPair ? 0 : 16; // 16€ paid, 2nd in pair = free
        return {
          id: `promo-${idx}-${Date.now()}`,
          item: p.pizza,
          quantity: 1,
          customization: {
            base: p.pizza.base || 'tomate',
            size: 'senior' as const,
            promoApplied: 'weekend_promo',
            note: p.note || undefined,
          },
          calculatedPrice: price,
        };
      });

      // Combine all notes
      const allNotes: string[] = [];
      if (globalNotes.trim()) allNotes.push(globalNotes.trim());
      selectedPizzas.forEach((p, i) => {
        if (p.note.trim()) {
          allNotes.push(`Pizza ${i + 1} (${p.pizza.name}): ${p.note.trim()}`);
        }
      });
      const combinedNotes = allNotes.length > 0 ? allNotes.join(' | ') : null;

      const { ht, tva, ttc } = calculateTVA(promoTotal);

      // Create order in database
      await createOrder.mutateAsync({
        order_number: generatedNum,
        order_type: 'emporter',
        items: recalculatedItems as any,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_address: null,
        customer_notes: combinedNotes,
        payment_method: paymentMethod,
        subtotal: ht,
        tva,
        total: ttc,
        delivery_fee: 0,
        status: 'pending',
        is_scheduled: false,
        scheduled_for: null,
      });

      // Send Telegram notification with PROMO tag
      try {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            orderNumber: generatedNum,
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerAddress: null,
            customerNotes: combinedNotes ? `🎉 COMMANDE PROMO WEEK-END 🎉\n${combinedNotes}` : '🎉 COMMANDE PROMO WEEK-END 🎉',
            orderType: 'emporter',
            paymentMethod,
            total: ttc,
            subtotal: ht,
            tva,
            deliveryFee: 0,
            items: recalculatedItems.map(item => ({
              name: item.item.name,
              quantity: item.quantity,
              price: item.calculatedPrice,
              category: item.item.category,
              customization: item.customization,
            })),
            isScheduled: false,
            scheduledFor: null,
            promoSource: 'weekend_promo',
          },
        });
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
      }

      clearCart();
      setView('success');
    } catch (err) {
      console.error('Order creation error:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer votre commande. Veuillez réessayer.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ═══════════════════════════════════
  // CHECKOUT VIEW
  // ═══════════════════════════════════
  if (view === 'checkout') {
    const { ht, tva, ttc } = calculateTVA(promoTotal);
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
        {/* Fixed header */}
        <div className="sticky top-0 z-50 bg-stone-950/95 backdrop-blur border-b border-stone-800 px-4 py-3 flex items-center gap-3">
          <button 
            onClick={() => setView('landing')}
            className="p-2 -ml-2 rounded-xl hover:bg-stone-900 text-stone-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-white">Finaliser</h2>
            <p className="text-xs text-stone-500">{totalPizzas} pizza{totalPizzas > 1 ? 's' : ''} • {ttc.toFixed(2)} €</p>
          </div>
        </div>

        <div className="px-4 pb-8 pt-4 max-w-lg mx-auto space-y-5">
          {/* Order summary */}
          <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Récapitulatif</span>
              <span className="text-xs text-stone-500">{totalPizzas} article{totalPizzas > 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-stone-800/50 max-h-52 overflow-y-auto">
              {selectedPizzas.map((p, i) => {
                const isInPair = i < pairs * 2;
                const isSecondInPair = i % 2 === 1 && isInPair;
                const price = isSecondInPair ? 0 : 16;
                return (
                  <div key={i} className="px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-white block truncate">{p.pizza.name}</span>
                      {p.note && <span className="text-[11px] text-amber-400/70 block truncate">📝 {p.note}</span>}
                      <span className="text-[11px] text-stone-500">Senior • {p.pizza.base === 'creme' ? 'Crème' : 'Tomate'}</span>
                    </div>
                    <span className="text-sm font-bold text-amber-400 ml-3">{price.toFixed(2)} €</span>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-stone-800 bg-stone-900/50">
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">Total</span>
                <span className="font-black text-xl text-amber-400">{ttc.toFixed(2)} €</span>
              </div>
              {pairs > 0 && (
                <p className="text-[11px] text-green-500 mt-1">
                  🎉 {pairs} pizza{pairs > 1 ? 's' : ''} offerte{pairs > 1 ? 's' : ''} !
                </p>
              )}
            </div>
          </div>

          {/* Customer form */}
          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-stone-400 text-xs font-bold uppercase tracking-wider">Nom</Label>
                <Input 
                  id="name"
                  type="text"
                  placeholder="Votre nom"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="bg-stone-950 border-stone-800 focus-visible:ring-amber-500 text-white rounded-xl h-12 text-base placeholder:text-stone-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-stone-400 text-xs font-bold uppercase tracking-wider">Téléphone</Label>
                <Input 
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  className="bg-stone-950 border-stone-800 focus-visible:ring-amber-500 text-white rounded-xl h-12 text-base placeholder:text-stone-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="globalNotes" className="text-stone-400 text-xs font-bold uppercase tracking-wider">Commentaire général (optionnel)</Label>
                <Textarea 
                  id="globalNotes"
                  placeholder="Ex: Sonner en arrivant..."
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                  className="bg-stone-950 border-stone-800 focus-visible:ring-amber-500 text-white rounded-xl min-h-[60px] text-base placeholder:text-stone-600"
                />
              </div>
            </div>

            {/* Payment method - NO online */}
            <div className="bg-stone-900 rounded-2xl border border-stone-800 p-4 space-y-3">
              <Label className="text-stone-400 text-xs font-bold uppercase tracking-wider">Paiement au retrait</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cb')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                    paymentMethod === 'cb' 
                      ? 'border-amber-500 bg-amber-500/10 text-white scale-[1.02]' 
                      : 'border-stone-800 bg-stone-950 text-stone-400 active:scale-95'
                  }`}
                >
                  <CreditCard className="w-7 h-7 mb-2" />
                  <span className="text-sm font-bold">Carte</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('especes')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 text-center transition-all duration-200 ${
                    paymentMethod === 'especes' 
                      ? 'border-amber-500 bg-amber-500/10 text-white scale-[1.02]' 
                      : 'border-stone-800 bg-stone-950 text-stone-400 active:scale-95'
                  }`}
                >
                  <Banknote className="w-7 h-7 mb-2" />
                  <span className="text-sm font-bold">Espèces</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-black py-7 rounded-2xl uppercase tracking-wider text-base flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl shadow-amber-950/40"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Confirmer • {ttc.toFixed(2)} €
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════
  // SUCCESS VIEW
  // ═══════════════════════════════════
  if (view === 'success') {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-24 h-24 bg-green-500/10 border-2 border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-400">
            <PartyPopper className="w-12 h-12" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-white">COMMANDE CONFIRMÉE !</h2>
          
          {/* Digital Ticket */}
          <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 p-6 text-center">
              <p className="text-xs uppercase tracking-widest font-extrabold opacity-75">Twin Pizza • Promo Week-end</p>
              <p className="text-5xl font-black font-mono mt-2">#{orderNumber}</p>
              <p className="text-[11px] font-semibold opacity-80 mt-2 uppercase">Présentez ce numéro à la caisse</p>
            </div>
            
            <div className="p-5 space-y-3 text-left text-sm">
              <p className="text-center text-stone-400 text-xs">
                Venez retirer votre commande chaude à Grand-Couronne 🔥
              </p>
              <div className="border-t border-stone-800 pt-3 space-y-2 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>60 Rue Georges Clemenceau, 76530 Grand-Couronne</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <a href="tel:0232112613" className="underline">02 32 11 26 13</a>
                </div>
              </div>
            </div>
          </div>

          <Button 
            className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-4 rounded-2xl transition-transform active:scale-95"
            onClick={() => {
              setView('landing');
              setName('');
              setPhone('');
              setGlobalNotes('');
              setSelectedPizzas([]);
            }}
          >
            Nouvelle commande
          </Button>
        </div>
      </div>
    );
  }

  // Loading settings state
  if (loadingPromoSettings) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-stone-400 mt-4 text-sm font-medium">Chargement de la page...</p>
      </div>
    );
  }

  // Active check logic
  const checkPromoActive = () => {
    if (!promoSettings) return true; // default to active if no setting key exists yet
    if (promoSettings.enabled === false) return false;
    if (promoSettings.schedule_type === 'manual') return true;

    if (promoSettings.schedule_type === 'scheduled') {
      const now = new Date();
      // Sunday is 0, Monday is 1, etc.
      const daysOfWeekMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = daysOfWeekMap[now.getDay()];
      
      const isDayActive = promoSettings.scheduled_days?.includes(currentDay);
      if (!isDayActive) return false;

      // Check current time HH:MM
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      const startTime = promoSettings.scheduled_start_time || '00:00';
      const endTime = promoSettings.scheduled_end_time || '23:59';

      return currentTime >= startTime && currentTime <= endTime;
    }
    return true;
  };

  const isActive = checkPromoActive();

  if (!isActive) {
    // Render inactive view
    // Translate English day names to French for public display
    const frenchDayNames: Record<string, string> = {
      'Monday': 'Lundi',
      'Tuesday': 'Mardi',
      'Wednesday': 'Mercredi',
      'Thursday': 'Jeudi',
      'Friday': 'Vendredi',
      'Saturday': 'Samedi',
      'Sunday': 'Dimanche'
    };
    const activeDaysText = promoSettings?.scheduled_days
      ? promoSettings.scheduled_days.map(d => frenchDayNames[d] || d).join(', ')
      : 'Vendredi, Samedi, Dimanche';

    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Store photo background faded */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 filter blur-sm scale-105"
          style={{ backgroundImage: "url('/store-front.jpg')" }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-stone-950/90" />

        <div className="relative z-10 max-w-md w-full text-center space-y-8 p-6 bg-stone-905/60 backdrop-blur rounded-[2rem] border border-stone-800 shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/25 rounded-full flex items-center justify-center mx-auto text-amber-500">
            <Lock className="w-10 h-10" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase text-white tracking-tight">Offre Indisponible</h2>
            <p className="text-stone-400 text-sm leading-relaxed px-2">
              L'offre promotionnelle n'est pas active actuellement. Nous vous donnons rendez-vous lors des périodes d'ouverture de l'offre !
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-850 space-y-3 text-left">
            <div className="flex items-center gap-3 text-stone-300">
              <Calendar className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-stone-400">Jours d'activité :</p>
                <p className="text-amber-500 font-semibold">{activeDaysText}</p>
              </div>
            </div>
            
            {promoSettings?.schedule_type === 'scheduled' && (
              <div className="flex items-center gap-3 text-stone-300 border-t border-stone-900 pt-3">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-stone-400">Horaires :</p>
                  <p className="text-amber-500 font-semibold">De {promoSettings.scheduled_start_time} à {promoSettings.scheduled_end_time}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <a href="/" className="block">
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold py-4 rounded-xl shadow-lg shadow-amber-500/10 transition-transform active:scale-95">
                Retourner à l'accueil
              </Button>
            </a>
            <p className="text-[10px] text-stone-500 font-medium">Twin Pizza Grand-Couronne</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════
  // MAIN LANDING VIEW
  // ═══════════════════════════════════
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950">
      
      {/* ─── HERO with Store Photo Background ─── */}
      <section className="relative overflow-hidden min-h-[85vh] flex flex-col justify-end">
        {/* Store photo background faded */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/store-front.jpg')" }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/85 to-stone-950/50" />
        
        <div className="relative z-10 px-5 pb-8 pt-20 max-w-lg mx-auto w-full space-y-5">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Offre Week-end Limitée
          </div>

          {/* Main headline */}
          <h1 className="text-[2.75rem] leading-[1.05] font-black text-white tracking-tight uppercase">
            1 Pizza{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              16€
            </span>
          </h1>

          <p className="text-lg font-bold text-amber-300 uppercase tracking-wide">
            1 Achetée = 1 Offerte !
          </p>

          <p className="text-stone-300 text-sm leading-relaxed">
            Achetez 1 pizza Senior à <strong className="text-white">16€</strong>, la 2ème est <strong className="text-green-400">OFFERTE</strong> !
            Retrait à <strong className="text-amber-400">Grand-Couronne</strong>.
            <br/>Ajoutez autant de pizzas que vous voulez !
          </p>

          <button 
            onClick={scrollToSelector}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-lg px-6 py-5 rounded-2xl shadow-2xl shadow-red-950/50 active:scale-95 transition-all duration-200 uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Pizza className="w-6 h-6" />
            Choisir mes pizzas
          </button>

          {/* Quick info */}
          <div className="flex items-center gap-4 text-xs text-stone-400 pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              Grand-Couronne
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <a href="tel:0232112613" className="hover:text-white">02 32 11 26 13</a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PIZZA SELECTOR ─── */}
      <section ref={selectorRef} className="scroll-mt-0 pb-40">
        {/* Sticky base selector */}
        <div className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur border-b border-stone-800">
          <div className="max-w-lg mx-auto flex">
            <button 
              onClick={() => setActiveBase('tomate')}
              className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-wider transition-all relative ${
                activeBase === 'tomate' ? 'text-amber-400' : 'text-stone-500 active:text-stone-300'
              }`}
            >
              🍅 Tomate
              {activeBase === 'tomate' && <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-amber-400 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveBase('creme')}
              className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-wider transition-all relative ${
                activeBase === 'creme' ? 'text-amber-400' : 'text-stone-500 active:text-stone-300'
              }`}
            >
              🧀 Crème
              {activeBase === 'creme' && <span className="absolute bottom-0 left-4 right-4 h-[3px] bg-amber-400 rounded-full" />}
            </button>
          </div>
        </div>

        {/* Pizza grid */}
        <div className="px-4 pt-4 max-w-lg mx-auto">
          <div className="space-y-3">
            {displayPizzas.map((pizza) => {
              const count = getPizzaCount(pizza.id);
              
              return (
                <div 
                  key={pizza.id}
                  className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden active:scale-[0.98] transition-transform duration-150"
                >
                  <div className="flex items-stretch">
                    {/* Pizza image or icon */}
                    {pizza.imageUrl ? (
                      <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-stone-950">
                        <OptimizedImage 
                          src={pizza.imageUrl} 
                          alt={pizza.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 flex-shrink-0 bg-stone-800/50 flex items-center justify-center">
                        <Pizza className="w-8 h-8 text-stone-600" />
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 px-3 py-2.5 flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-white text-[15px] leading-tight truncate">{pizza.name}</h4>
                      <p className="text-[11px] text-stone-400 leading-snug mt-0.5 line-clamp-2">{pizza.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-amber-400 text-xs font-bold">16€</span>
                        <span className="text-[10px] text-green-500">2ème offerte</span>
                      </div>
                    </div>

                    {/* Add button */}
                    <div className="flex items-center pr-3 gap-1">
                      {count > 0 && (
                        <span className="bg-amber-500 text-stone-950 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                          {count}
                        </span>
                      )}
                      <button
                        onClick={() => handleAddPizza(pizza)}
                        className="w-12 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-950 flex items-center justify-center transition-colors active:scale-90"
                      >
                        <Plus className="w-6 h-6" strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ STICKY BOTTOM CART BAR ═══ */}
      {selectedPizzas.length > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2">
          <div 
            className="max-w-lg mx-auto bg-stone-900/98 backdrop-blur-xl border border-stone-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
          >
            {/* Tap to expand */}
            <button 
              onClick={() => setCartOpen(true)}
              className="w-full px-4 py-1.5 flex items-center justify-center text-stone-500 hover:text-stone-300"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            
            <div className="px-4 pb-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <span className="text-xs text-stone-400 font-semibold">
                    {totalPizzas} pizza{totalPizzas > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-xl font-black text-amber-400 block -mt-0.5">
                  {promoTotal.toFixed(2)} €
                </span>
              </div>

              <Button 
                onClick={handleCheckoutClick}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black px-6 py-6 rounded-xl uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-transform text-sm"
              >
                Commander
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CART DRAWER (SLIDE-UP) ═══ */}
      {cartOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] flex flex-col">
            <div className="max-w-lg mx-auto w-full bg-stone-900 rounded-t-3xl border border-stone-700 border-b-0 shadow-2xl flex flex-col max-h-[85vh]">
              {/* Handle + header */}
              <div className="pt-3 px-5 pb-3 border-b border-stone-800 flex-shrink-0">
                <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-lg">Mon panier</h3>
                    <p className="text-xs text-stone-500">{totalPizzas} pizza{totalPizzas > 1 ? 's' : ''} sélectionnée{totalPizzas > 1 ? 's' : ''}</p>
                  </div>
                  <button 
                    onClick={() => setCartOpen(false)}
                    className="p-2 rounded-xl hover:bg-stone-800 text-stone-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Items list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {selectedPizzas.map((p, i) => {
                  const isInPair = i < pairs * 2;
                  const isSecondInPair = i % 2 === 1 && isInPair;
                  const price = isSecondInPair ? 0 : 16;
                  
                  return (
                    <div key={i} className="bg-stone-950 rounded-xl border border-stone-800 overflow-hidden">
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500 text-[10px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {i + 1}
                            </span>
                            <span className="text-sm font-bold text-white truncate">{p.pizza.name}</span>
                          </div>
                          <span className="text-[11px] text-stone-500 ml-6 block">
                            {p.pizza.base === 'creme' ? 'Crème' : 'Tomate'} • {price === 0 ? 'OFFERTE 🎁' : `${price.toFixed(2)} €`}
                          </span>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => handleRemovePizza(i)}
                          className="p-2 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Note field — always visible */}
                      <div className="px-3 pb-3 pt-0">
                        <input
                          type="text"
                          placeholder="📝 Note: sans oignons, bien cuite..."
                          value={p.note}
                          onChange={(e) => handleUpdateNote(i, e.target.value)}
                          className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Hint for odd pizza */}
                {odd > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-amber-400 font-semibold">
                      💡 Ajoutez 1 pizza de plus pour avoir la 2ème offerte !
                    </p>
                    <button 
                      onClick={() => { setCartOpen(false); scrollToSelector(); }}
                      className="mt-2 text-xs font-bold text-amber-500 underline"
                    >
                      Ajouter une pizza
                    </button>
                  </div>
                )}
              </div>

              {/* Footer with total */}
              <div className="px-4 pb-5 pt-3 border-t border-stone-800 space-y-3 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-white block">Total</span>
                    {pairs > 0 && (
                      <span className="text-[11px] text-green-500">
                        🎁 {pairs} pizza{pairs > 1 ? 's' : ''} offerte{pairs > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-amber-400">{promoTotal.toFixed(2)} €</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (confirm('Vider le panier ?')) {
                        setSelectedPizzas([]);
                        setCartOpen(false);
                      }
                    }}
                    className="p-3 rounded-xl border border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <Button 
                    onClick={handleCheckoutClick}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 font-black py-6 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-transform text-base"
                  >
                    <Check className="w-5 h-5" />
                    Commander
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
