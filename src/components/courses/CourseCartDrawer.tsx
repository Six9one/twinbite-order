import { useState } from 'react';
import {
  OrderItem,
  formatWhatsAppOrderMessage,
  createWhatsAppUrl,
  getSupplierContacts,
  saveOrderToSupabase,
  clearDraftOrder,
} from '@/lib/coursesService';
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
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

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
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
      <div className="max-w-xl mx-auto pointer-events-auto">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-between px-4 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-extrabold leading-tight">
                    {distinctCount} {distinctCount > 1 ? 'articles' : 'article'} sélectionnés
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-emerald-800/60 py-1 px-2.5 rounded-lg text-xs font-semibold">
                <span>Finaliser</span>
                <span>→</span>
              </div>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="h-[88vh] bg-white border-t border-slate-200 text-slate-900 rounded-t-3xl p-0 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 rounded-t-3xl">
              <div>
                <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  Récapitulatif de Commande
                </SheetTitle>
                <p className="text-[11px] text-slate-500">
                  {distinctCount} articles à envoyer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                title="Paramètres de contact"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {/* Settings Section */}
              {showConfig && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Numéros WhatsApp
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-500">KFA Commercial</Label>
                      <Input
                        value={contacts.kfaPhone}
                        onChange={(e) => setContacts({ ...contacts, kfaPhone: e.target.value })}
                        placeholder="0614222681"
                        className="h-8 bg-white border-slate-300 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500">Boss / Gérant</Label>
                      <Input
                        value={contacts.bossPhone}
                        onChange={(e) => setContacts({ ...contacts, bossPhone: e.target.value })}
                        placeholder="06..."
                        className="h-8 bg-white border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Articles choisis
                  </span>
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Vider
                  </button>
                </div>

                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-xl"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <img
                          src={item.product.image}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover bg-slate-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {item.product.name}
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-700">
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-1 flex-shrink-0 bg-white p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                          className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 bg-emerald-600 text-white rounded flex items-center justify-center text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery date & Notes */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Date de livraison souhaitée
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex: Demain matin avant 11h, Jeudi 21/08..."
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 mb-1 block">
                    Remarques ou instructions
                  </Label>
                  <Textarea
                    placeholder="Ex: Poulet bien frais date longue svp..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 text-xs h-16 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3.5 border-t border-slate-200 bg-white space-y-2">
              <Button
                type="button"
                onClick={handleSendToKFA}
                disabled={isSending}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded-xl shadow flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Envoyer à KFA (WhatsApp)
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendToBoss}
                  className="h-9 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  <Phone className="w-3 h-3 mr-1 text-emerald-600" />
                  Envoyer au Boss
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyMessage}
                  className="h-9 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  <Copy className="w-3 h-3 mr-1" />
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
