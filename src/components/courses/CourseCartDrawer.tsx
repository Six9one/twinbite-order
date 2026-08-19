import { useState } from 'react';
import {
  OrderItem,
  formatWhatsAppOrderMessage,
  createWhatsAppUrl,
  getSupplierContacts,
  saveOrderToSupabase,
  clearDraftOrder,
} from '@/lib/coursesService';
import { getCleanDisplayName } from '@/lib/coursesNameFormatter';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ShoppingCart,
  Send,
  Copy,
  Trash2,
  Calendar,
  Phone,
  Settings,
  PackageCheck,
  ChevronRight,
  Minus,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

interface CourseCartDrawerProps {
  items: OrderItem[];
  onClear: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export function CourseCartDrawer({
  items,
  onClear,
  onUpdateQuantity,
}: CourseCartDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [contacts, setContacts] = useState(getSupplierContacts());
  const [showConfig, setShowConfig] = useState(false);

  const distinctCount = items.length;
  const totalUnitsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleSendToKFA = async () => {
    if (items.length === 0) {
      toast.error('Votre commande est vide');
      return;
    }

    setIsSending(true);
    try {
      const messageText = formatWhatsAppOrderMessage({
        items,
        requestedDeliveryDate: deliveryDate || undefined,
        notes: orderNotes || undefined,
      }, contacts);

      // Save order to history
      await saveOrderToSupabase({
        items,
        requestedDeliveryDate: deliveryDate,
        notes: orderNotes,
      });

      const phone = contacts.kfaPhone || '0614222681';
      const url = createWhatsAppUrl(phone, messageText);

      window.open(url, '_blank');
      toast.success('Commande enregistrée et ouverte dans WhatsApp !');
      clearDraftOrder();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToBoss = () => {
    if (items.length === 0) {
      toast.error('Votre commande est vide');
      return;
    }

    const messageText = formatWhatsAppOrderMessage({
      items,
      requestedDeliveryDate: deliveryDate || undefined,
      notes: orderNotes || undefined,
    }, contacts);

    const phone = contacts.bossPhone || '';
    if (!phone) {
      toast.error('Numéro du responsable non configuré. Renseignez-le dans les réglages.');
      setShowConfig(true);
      return;
    }

    const url = createWhatsAppUrl(phone, messageText);
    window.open(url, '_blank');
    toast.success('Commande envoyée au responsable !');
  };

  const handleCopyMessage = () => {
    if (items.length === 0) {
      toast.error('Votre commande est vide');
      return;
    }
    const messageText = formatWhatsAppOrderMessage({
      items,
      requestedDeliveryDate: deliveryDate || undefined,
      notes: orderNotes || undefined,
    }, contacts);

    navigator.clipboard.writeText(messageText);
    toast.success('Texte de la commande copié !');
  };

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
      <div className="max-w-xl mx-auto pointer-events-auto">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-semibold rounded-2xl shadow-lg shadow-emerald-950/15 flex items-center justify-between px-4 sm:px-5 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold leading-tight">
                    {distinctCount} {distinctCount > 1 ? 'articles' : 'article'} sélectionnés
                  </div>
                  <div className="text-[11px] text-emerald-100 font-medium">
                    Total : {totalUnitsCount} unités
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-emerald-800/50 hover:bg-emerald-800/70 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors">
                <span>Voir le panier</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="h-[88vh] bg-white border-t border-slate-200 text-slate-900 rounded-t-3xl p-0 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-3xl">
              <div>
                <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-emerald-600" />
                  Récapitulatif de Commande
                </SheetTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {distinctCount} {distinctCount > 1 ? 'articles prêts' : 'article prêt'} à envoyer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                title="Paramètres de contact"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Settings Section */}
              {showConfig && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Numéros WhatsApp
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-slate-500">KFA Commercial</Label>
                      <Input
                        value={contacts.kfaPhone}
                        onChange={(e) => setContacts({ ...contacts, kfaPhone: e.target.value })}
                        placeholder="0614222681"
                        className="h-9 bg-white border-slate-300 text-xs rounded-xl mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-500">Boss / Gérant</Label>
                      <Input
                        value={contacts.bossPhone}
                        onChange={(e) => setContacts({ ...contacts, bossPhone: e.target.value })}
                        placeholder="06..."
                        className="h-9 bg-white border-slate-300 text-xs rounded-xl mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Articles choisis
                  </span>
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Vider la commande
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item) => {
                    const cleanName = getCleanDisplayName(item.product.name);

                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                          <img
                            src={item.product.image}
                            alt={cleanName}
                            className="w-10 h-10 rounded-xl object-cover bg-slate-200 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                              {cleanName}
                            </div>
                            <div className="text-[11px] font-medium text-emerald-700">
                              {item.quantity} {item.unit}
                            </div>
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-1 flex-shrink-0 bg-white p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                            className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-900 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery date & Notes */}
              <div className="space-y-3 pt-1">
                <div>
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Date de livraison souhaitée
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex: Demain matin avant 11h, Jeudi 21/08..."
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 h-10 text-xs sm:text-sm rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Remarques ou instructions
                  </Label>
                  <Textarea
                    placeholder="Ex: Poulet bien frais date longue svp..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 text-xs sm:text-sm h-18 resize-none rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
              <Button
                type="button"
                onClick={handleSendToKFA}
                disabled={isSending}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold text-sm text-white rounded-2xl shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Envoyer à KFA (WhatsApp)
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendToBoss}
                  className="h-10 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Envoyer au Boss
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyMessage}
                  className="h-10 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copier texte
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
