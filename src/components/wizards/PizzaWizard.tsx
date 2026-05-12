import { useState, useEffect } from 'react';
import { MenuItem, PizzaCustomization, PizzaBase, PizzaSize } from '@/types/order';
import { pizzasTomate, pizzasCreme, pizzaPrices, cheeseSupplementOptions } from '@/data/menu';
import { isMenuMidiTime, getMenuMidiRemainingTime } from '@/utils/promotions';
import { useOrder } from '@/context/OrderContext';
import { usePizzasByBase, Product } from '@/hooks/useProducts';
import { usePizzaFormatImages } from '@/hooks/useWizardImages';
import { trackProductView, trackAddToCart } from '@/hooks/useProductAnalytics';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Check, Pizza, Sun, Clock, Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type WizardStep = 'SELECT_FORMAT' | 'SELECT_PIZZA' | 'CUSTOMIZE';

interface FormatSelection {
  size: PizzaSize;
  isMenuMidi: boolean;
  basePrice: number;
}

interface PizzaWizardProps {
  onClose: () => void;
  lockedSize?: 'senior' | 'mega' | null;
}

export function PizzaWizard({ onClose, lockedSize }: PizzaWizardProps) {
  const { addToCart, orderType } = useOrder();

  // If lockedSize is set (loyalty free pizza), skip format selection
  const initialStep: WizardStep = lockedSize ? 'SELECT_PIZZA' : 'SELECT_FORMAT';
  const initialFormat: FormatSelection = lockedSize
    ? { size: lockedSize, isMenuMidi: false, basePrice: lockedSize === 'mega' ? pizzaPrices.mega : pizzaPrices.senior }
    : { size: 'senior', isMenuMidi: false, basePrice: pizzaPrices.senior };

  const [step, setStep] = useState<WizardStep>(initialStep);
  const [format, setFormat] = useState<FormatSelection>(initialFormat);
  const [selectedPizza, setSelectedPizza] = useState<MenuItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [base, setBase] = useState<PizzaBase>('tomate');
  const [supplements, setSupplements] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [showAddedOverlay, setShowAddedOverlay] = useState(false);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Data fetching
  const { data: dbPizzasTomate, isLoading: loadingTomate } = usePizzasByBase('tomate');
  const { data: dbPizzasCreme, isLoading: loadingCreme } = usePizzasByBase('creme');
  const { data: formatImages } = usePizzaFormatImages();

  const displayPizzasTomate = dbPizzasTomate && dbPizzasTomate.length > 0 ? dbPizzasTomate : pizzasTomate;
  const displayPizzasCreme = dbPizzasCreme && dbPizzasCreme.length > 0 ? dbPizzasCreme : pizzasCreme;

  const showMenuMidi = isMenuMidiTime();
  const promoText = orderType === 'livraison'
    ? '2 achetées = 1 offerte'
    : orderType ? '1 achetée = 1 offerte' : null;

  // Countdown timer for menu midi
  useEffect(() => {
    if (!showMenuMidi) return;
    const update = () => setCountdown(getMenuMidiRemainingTime());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [showMenuMidi]);

  // --- Format Selection ---
  const handleFormatSelect = (size: PizzaSize, isMenuMidi: boolean) => {
    const basePrice = isMenuMidi
      ? (size === 'senior' ? pizzaPrices.menuMidiSenior : pizzaPrices.menuMidiMega)
      : (size === 'senior' ? pizzaPrices.senior : pizzaPrices.mega);
    setFormat({ size, isMenuMidi, basePrice });
    setStep('SELECT_PIZZA');
  };

  // --- Pizza Selection ---
  const handleSelectPizza = (pizza: MenuItem | Product) => {
    const isProduct = 'base_price' in pizza;
    const menuItem: MenuItem = isProduct
      ? { id: pizza.id, name: pizza.name, description: pizza.description || '', price: (pizza as Product).base_price, category: 'pizzas' as const, base: (pizza as Product).pizza_base as PizzaBase || 'tomate', imageUrl: (pizza as Product).image_url || undefined }
      : pizza;
    trackProductView(pizza.id, pizza.name, 'pizzas');
    setSelectedPizza(menuItem);
    setSelectedProduct(isProduct ? pizza as Product : null);
    setBase(menuItem.base || 'tomate');
    setStep('CUSTOMIZE');
  };

  // --- Supplements ---
  const toggleSupplement = (supId: string) => {
    setSupplements(prev => prev.includes(supId) ? prev.filter(s => s !== supId) : [...prev, supId]);
  };

  const getPrice = () => {
    const supplementsPrice = supplements.reduce((total, supId) => {
      const sup = cheeseSupplementOptions.find(s => s.id === supId);
      return total + (sup?.price || 0);
    }, 0);
    return format.basePrice + supplementsPrice;
  };

  // --- Add to Cart ---
  const handleAddToCart = () => {
    if (!selectedPizza) return;
    const customization: PizzaCustomization = {
      base,
      size: format.size,
      isMenuMidi: format.isMenuMidi,
      note: note || undefined,
      supplements: supplements.length > 0 ? supplements : undefined,
    };
    const cartItem = { ...selectedPizza, id: `${selectedPizza.id}-${Date.now()}` };
    addToCart(cartItem, 1, customization, getPrice());
    trackAddToCart(selectedPizza.id.split('-')[0], selectedPizza.name, 'pizzas');
    toast({ title: 'Ajouté au panier', description: `${selectedPizza.name} ${format.size === 'mega' ? 'Mega' : 'Senior'}${format.isMenuMidi ? ' (Menu Midi)' : ''}` });

    // Reset for next pizza and show overlay
    setSelectedPizza(null);
    setSupplements([]);
    setNote('');
    setShowAddedOverlay(true);
    setTimeout(() => {
      setShowAddedOverlay(false);
      setStep('SELECT_PIZZA');
    }, 3000);
  };

  // --- Upsell actions from overlay ---
  const handleUpsellDrinks = () => { setShowAddedOverlay(false); onClose(); };
  const handleUpsellContinue = () => { setShowAddedOverlay(false); setStep('SELECT_PIZZA'); };

  // Get format label
  const formatLabel = format.isMenuMidi
    ? `Menu Midi ${format.size === 'mega' ? 'Mega' : 'Senior'}`
    : `${format.size === 'mega' ? 'Mega 40cm' : 'Senior 31cm'}`;

  // ============================================================
  // STEP 0: FORMAT SELECTION
  // ============================================================
  if (step === 'SELECT_FORMAT') {
    return (
      <div className="min-h-screen bg-background pb-4">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose} className="w-10 h-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl sm:text-2xl font-display font-bold">🍕 Choisissez votre format de Pizza</h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
          {/* Symmetrical two-column grid — cards stretch to same height */}
          <div className="grid grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto flex-1">

            {/* ── SENIOR Column ── */}
            <div
              className="flex flex-col gap-4 cursor-pointer group"
              onClick={() => handleFormatSelect('senior', false)}
            >
              <Card className="flex-1 flex flex-col items-center justify-center rounded-[2rem] p-8 min-h-[450px] bg-white border-2 border-orange-200 hover:border-orange-400 transition-all hover:shadow-2xl group-active:scale-[0.98]">
                {/* Fixed image container — image scales small */}
                <div className="h-64 w-full flex items-center justify-center mb-6">
                  {formatImages?.senior ? (
                    <img src={formatImages.senior} alt="Pizza Senior" className="w-44 h-44 object-contain drop-shadow-xl" />
                  ) : (
                    <div className="w-44 h-44 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                      <Pizza className="w-20 h-20 text-orange-300" />
                    </div>
                  )}
                </div>

                {/* Promo Badge */}
                {promoText && (
                  <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-sm px-5 py-2 mb-4 rounded-full font-bold shadow-md">
                    {promoText.toUpperCase()}
                  </Badge>
                )}

                {/* Size Info */}
                <h2 className="text-4xl font-black tracking-tight text-slate-900">SENIOR</h2>
                <p className="text-muted-foreground mt-1 text-lg">Taille Senior - 31 cm</p>
                <p className="text-4xl font-bold text-primary mt-4">{pizzaPrices.senior},00€</p>
              </Card>

              {/* Menu Midi — pinned to bottom via mt-auto */}
              <div className="mt-auto">
                {showMenuMidi ? (
                  <Button
                    variant="outline"
                    className="w-full h-20 text-xl font-bold rounded-2xl border-2 border-yellow-400/50 hover:bg-yellow-50 hover:border-yellow-500 text-yellow-700"
                    onClick={(e) => { e.stopPropagation(); handleFormatSelect('senior', true); }}
                  >
                    <Sun className="w-6 h-6 mr-3 text-yellow-500" />
                    Menu Midi Senior: {pizzaPrices.menuMidiSenior}€
                  </Button>
                ) : (
                  <div className="h-20" /> /* Spacer to keep alignment when no menu midi */
                )}
              </div>
            </div>

            {/* ── MEGA Column ── */}
            <div
              className="flex flex-col gap-4 cursor-pointer group"
              onClick={() => handleFormatSelect('mega', false)}
            >
              <Card className="flex-1 flex flex-col items-center justify-center rounded-[2rem] p-8 min-h-[450px] bg-white border-2 border-orange-200 hover:border-orange-400 transition-all hover:shadow-2xl group-active:scale-[0.98]">
                {/* Fixed image container — image scales large */}
                <div className="h-64 w-full flex items-center justify-center mb-6">
                  {formatImages?.mega ? (
                    <img src={formatImages.mega} alt="Pizza Mega" className="w-64 h-64 object-contain drop-shadow-xl" />
                  ) : (
                    <div className="w-64 h-64 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                      <Pizza className="w-28 h-28 text-orange-300" />
                    </div>
                  )}
                </div>

                {/* Promo Badge */}
                {promoText && (
                  <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-sm px-5 py-2 mb-4 rounded-full font-bold shadow-md">
                    {promoText.toUpperCase()}
                  </Badge>
                )}

                {/* Size Info */}
                <h2 className="text-4xl font-black tracking-tight text-slate-900">MEGA</h2>
                <p className="text-muted-foreground mt-1 text-lg">Taille Mega - 40 cm</p>
                <p className="text-4xl font-bold text-primary mt-4">{pizzaPrices.mega},00€</p>
              </Card>

              {/* Menu Midi — pinned to bottom via mt-auto */}
              <div className="mt-auto">
                {showMenuMidi ? (
                  <Button
                    variant="outline"
                    className="w-full h-20 text-xl font-bold rounded-2xl border-2 border-yellow-400/50 hover:bg-yellow-50 hover:border-yellow-500 text-yellow-700"
                    onClick={(e) => { e.stopPropagation(); handleFormatSelect('mega', true); }}
                  >
                    <Sun className="w-6 h-6 mr-3 text-yellow-500" />
                    Menu Midi Mega: {pizzaPrices.menuMidiMega}€
                  </Button>
                ) : (
                  <div className="h-20" />
                )}
              </div>
            </div>
          </div>

          {/* Menu Midi info banner */}
          {showMenuMidi && countdown && (
            <div className="mt-6 max-w-5xl mx-auto p-3 bg-yellow-500/10 rounded-lg flex items-center justify-center gap-3">
              <Sun className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-700">Menu Midi disponible</span>
              <span className="text-yellow-600 font-mono">
                Fin dans {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 1: SELECT PIZZA (simplified — single price)
  // ============================================================
  if (step === 'SELECT_PIZZA') {
    const renderPizzaCard = (pizza: any) => {
      const imageUrl = pizza.image_url || pizza.imageUrl || pizza.image;
      const imageZoom = pizza.image_zoom || 1.0;
      return (
        <Card
          key={pizza.id}
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30"
          onClick={() => handleSelectPizza(pizza)}
        >
          <div className="p-4 bg-gradient-to-b from-slate-50 to-white flex justify-center">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-white shadow-md border-4 border-orange-100">
              {imageUrl ? (
                <img src={imageUrl} alt={pizza.name} loading="lazy" decoding="async" className="w-full h-full object-contain" style={{ transform: `scale(${imageZoom})` }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
                  <Pizza className="w-12 h-12 text-primary/30" />
                </div>
              )}
            </div>
          </div>
          <div className="p-4 pt-0">
            <h3 className="font-display font-semibold text-lg text-center">{pizza.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 text-center">{pizza.description}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-lg font-bold text-primary">{format.basePrice}€</span>
              <Badge variant="secondary" className="text-xs">{formatLabel}</Badge>
            </div>
          </div>
        </Card>
      );
    };

    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Added overlay */}
        {showAddedOverlay && <AddedOverlay onDrinks={handleUpsellDrinks} onContinue={handleUpsellContinue} onClose={() => { setShowAddedOverlay(false); onClose(); }} />}

        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => lockedSize ? onClose() : setStep('SELECT_FORMAT')} className="w-10 h-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-display font-bold">Nos Pizzas</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    {formatLabel} — {format.basePrice}€
                  </Badge>
                  {!lockedSize && (
                    <button className="text-xs text-primary underline" onClick={() => setStep('SELECT_FORMAT')}>
                      Changer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <Tabs defaultValue="tomate" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 h-12 sm:h-14">
              <TabsTrigger value="tomate" className="text-sm sm:text-base h-10 sm:h-12">🍅 Base Tomate</TabsTrigger>
              <TabsTrigger value="creme" className="text-sm sm:text-base h-10 sm:h-12">🥛 Base Crème</TabsTrigger>
            </TabsList>

            <TabsContent value="tomate">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(loadingTomate ? [] : displayPizzasTomate).map(renderPizzaCard)}
                {loadingTomate && <div className="col-span-full text-center py-8 text-muted-foreground">Chargement des pizzas...</div>}
              </div>
            </TabsContent>

            <TabsContent value="creme">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {(loadingCreme ? [] : displayPizzasCreme).map(renderPizzaCard)}
                {loadingCreme && <div className="col-span-full text-center py-8 text-muted-foreground">Chargement des pizzas...</div>}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 2: CUSTOMIZE (no size selection — already locked)
  // ============================================================
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Added overlay */}
      {showAddedOverlay && <AddedOverlay onDrinks={handleUpsellDrinks} onContinue={handleUpsellContinue} onClose={() => { setShowAddedOverlay(false); onClose(); }} />}

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setStep('SELECT_PIZZA')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">{selectedPizza?.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedPizza?.description}</p>
            </div>
            <span className="text-xl font-bold text-primary">{getPrice().toFixed(2)}€</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Format badge (non-interactive) */}
        <div className="flex items-center gap-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-sm py-1.5 px-4">
            {formatLabel} — {format.basePrice}€
          </Badge>
          {format.isMenuMidi && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-sm py-1.5 px-3">
              <Sun className="w-4 h-4 mr-1" /> + Boisson offerte
            </Badge>
          )}
        </div>

        <Separator />

        {/* Pizza Supplements */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Suppléments Pizza (+1€ chacun)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cheeseSupplementOptions.map((sup) => (
              <Card
                key={sup.id}
                className={`p-4 min-h-[60px] cursor-pointer transition-all flex items-center justify-between ${supplements.includes(sup.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                onClick={() => toggleSupplement(sup.id)}
              >
                <div>
                  <span className="font-medium text-base">{sup.name}</span>
                  <span className="text-sm text-primary font-semibold ml-2">+{sup.price}€</span>
                </div>
                {supplements.includes(sup.id) && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
              </Card>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Notes / Remarques</h2>
          <Textarea
            placeholder="Ex: bien cuite, sans oignons..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Promo reminder */}
        {promoText && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <p className="text-sm text-center">
              <span className="font-semibold text-primary">Rappel :</span> {promoText}
            </p>
          </Card>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 sm:p-4 z-50 safe-bottom">
        <div className="container mx-auto">
          <Button className="w-full h-14 sm:h-16 text-base sm:text-lg rounded-xl" onClick={handleAddToCart}>
            Ajouter au panier - {getPrice().toFixed(2)}€
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// POST-ADD OVERLAY — Upsell: Boissons, Tarte au Daim, Tiramisu
// ============================================================
function AddedOverlay({ onDrinks, onContinue, onClose }: { onDrinks: () => void; onContinue: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center animate-in zoom-in-95 duration-300">
        {/* Success */}
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Ajouté au panier ! 🎉</h2>
        <p className="text-slate-500 mb-6">Un petit extra avec votre pizza ?</p>

        {/* Upsell Options */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card
            className="p-4 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all border-2 border-transparent hover:border-blue-400/50 text-center"
            onClick={onDrinks}
          >
            <span className="text-4xl block mb-2">🥤</span>
            <h3 className="font-bold text-slate-900 text-sm">Boisson</h3>
          </Card>
          <Card
            className="p-4 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all border-2 border-transparent hover:border-amber-400/50 text-center"
            onClick={onClose}
          >
            <span className="text-4xl block mb-2">🍫</span>
            <h3 className="font-bold text-slate-900 text-sm">Tarte Daim</h3>
          </Card>
          <Card
            className="p-4 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all border-2 border-transparent hover:border-pink-400/50 text-center"
            onClick={onClose}
          >
            <span className="text-4xl block mb-2">🍮</span>
            <h3 className="font-bold text-slate-900 text-sm">Tiramisu</h3>
          </Card>
        </div>

        {/* Continue button */}
        <Button
          variant="outline"
          size="lg"
          onClick={onContinue}
          className="w-full h-14 text-lg text-slate-600 border-slate-300 hover:text-slate-900"
        >
          Ajouter une autre pizza →
        </Button>
      </div>
    </div>
  );
}