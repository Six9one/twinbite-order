import { useState } from 'react';
import { SupplierProduct } from '@/data/supplierCatalog';
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
  Sparkles,
  Phone,
  Settings,
  Check,
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

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const distinctCount = items.length;
  const totalEstimatedHt = items.reduce(
    (sum, item) => sum + (item.product.unitPriceEstimate || 0) * item.quantity,
    0
  );

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
        totalEstimatedHt: totalEstimatedHt > 0 ? totalEstimatedHt : undefined,
      }, contacts);

      // Save order to history & sync for kitchen reception
      await saveOrderToSupabase({
        items,
        requestedDeliveryDate: deliveryDate,
        notes: orderNotes,
        totalEstimatedHt,
      });

      const phone = contacts.kfaPhone || '0614222681';
      const url = createWhatsAppUrl(phone, messageText);

      // Open WhatsApp
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

  const handleSendToBoss = async () => {
    if (items.length === 0) {
      toast.error('Votre commande est vide');
      return;
    }

    const messageText = formatWhatsAppOrderMessage({
      items,
      requestedDeliveryDate: deliveryDate || undefined,
      notes: orderNotes || undefined,
      totalEstimatedHt: totalEstimatedHt > 0 ? totalEstimatedHt : undefined,
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
      totalEstimatedHt: totalEstimatedHt > 0 ? totalEstimatedHt : undefined,
    }, contacts);

    navigator.clipboard.writeText(messageText);
    toast.success('Texte de la commande copié dans le presse-papier !');
  };

  if (items.length === 0) return null;

  return (
    <>
      {/* Floating Bottom Sticky Bar (Mobile First) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none">
        <div className="max-w-xl mx-auto pointer-events-auto">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-2xl shadow-[0_4px_25px_rgba(16,185,129,0.4)] flex items-center justify-between px-5 transition-all border border-emerald-400/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-950/40 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-emerald-200" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm leading-tight font-extrabold">
                      {distinctCount} {distinctCount > 1 ? 'articles' : 'article'}
                    </div>
                    {totalEstimatedHt > 0 && (
                      <div className="text-[11px] text-emerald-200 font-normal">
                        Total estimé : ~{totalEstimatedHt.toFixed(2)} € HT
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/30 py-1.5 px-3 rounded-xl text-xs font-semibold">
                  <span>Voir & Envoyer</span>
                  <span>→</span>
                </div>
              </button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              className="h-[88vh] bg-slate-900 border-slate-800 text-white rounded-t-3xl p-0 flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <SheetTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                    Récapitulatif de Commande
                  </SheetTitle>
                  <p className="text-xs text-slate-400">
                    {distinctCount} articles sélectionnés
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                  title="Paramètres de contact"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Config section if open */}
                {showConfig && (
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Numéros WhatsApp
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] text-slate-400">KFA Commercial</Label>
                        <Input
                          value={contacts.kfaPhone}
                          onChange={(e) => setContacts({ ...contacts, kfaPhone: e.target.value })}
                          placeholder="0614222681"
                          className="h-9 bg-slate-900 border-slate-700 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-400">Boss / Gérant</Label>
                        <Input
                          value={contacts.bossPhone}
                          onChange={(e) => setContacts({ ...contacts, bossPhone: e.target.value })}
                          placeholder="06..."
                          className="h-9 bg-slate-900 border-slate-700 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Items list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Articles à commander
                    </span>
                    <button
                      type="button"
                      onClick={onClear}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Tout vider
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={item.product.image}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-slate-800 flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/cat_pizza_3d.webp';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white truncate">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-emerald-400">
                              {item.quantity} {item.unit}
                              {item.product.unitPriceEstimate && (
                                <span className="text-slate-500 ml-1.5">
                                  (~{(item.product.unitPriceEstimate * item.quantity).toFixed(2)} €)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick stepper */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                            className="w-7 h-7 bg-slate-800 text-white rounded-lg flex items-center justify-center active:scale-95 text-xs"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="w-7 h-7 bg-slate-800 text-white rounded-lg flex items-center justify-center active:scale-95 text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date & Notes */}
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs text-slate-300 flex items-center gap-1.5 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      Date de livraison souhaitée
                    </Label>
                    <Input
                      type="text"
                      placeholder="Ex: Demain matin avant 11h, Jeudi 21/08..."
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white h-10 text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-slate-300 mb-1.5 block">
                      Remarques ou instructions spéciales
                    </Label>
                    <Textarea
                      placeholder="Ex: Poulet bien frais date longue, manque serviettes de la dernière fois..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white text-xs h-20 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/90 space-y-2">
                <Button
                  type="button"
                  onClick={handleSendToKFA}
                  disabled={isSending}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Envoyer à KFA (WhatsApp)
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendToBoss}
                    className="h-10 border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold rounded-xl"
                  >
                    <Phone className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Envoyer au Boss
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyMessage}
                    className="h-10 border-slate-700 bg-slate-900 text-slate-200 text-xs font-semibold rounded-xl"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copier le texte
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
