import { useState } from 'react';
import { MenuItem } from '@/types/order';
import { menuOptionPrices } from '@/data/menu';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check, Plus, Minus, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SimpleProductWizardProps {
  items: MenuItem[];
  title: string;
  showMenuOption?: boolean;
  onClose: () => void;
}

export function SimpleProductWizard({ items, title, showMenuOption = false, onClose }: SimpleProductWizardProps) {
  const { addToCart } = useOrder();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [menuOption, setMenuOption] = useState<'none' | 'frites' | 'boisson' | 'menu'>('none');

  const calculatePrice = () => {
    if (!selectedItem) return 0;
    let price = selectedItem.price * quantity;
    if (showMenuOption) {
      price += menuOptionPrices[menuOption] * quantity;
    }
    return price;
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const cartItem = {
      ...selectedItem,
      id: `${selectedItem.id}-${Date.now()}`,
    };

    // Pass menu option as customization if applicable
    const customization = showMenuOption && menuOption !== 'none'
      ? { menuOption }
      : undefined;

    addToCart(cartItem, quantity, customization as any);

    toast({
      title: 'Ajouté au panier',
      description: `${quantity}x ${selectedItem.name}`,
    });

    onClose();
  };

  if (!selectedItem) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-display font-bold">{title}</h1>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun produit disponible dans cette catégorie.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const imageUrl = item.imageUrl || item.image;
                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 border-transparent hover:border-primary/30"
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* Image */}
                    {imageUrl ? (
                      <div className="aspect-video relative">
                        <img
                          src={imageUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <Image className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-lg">{item.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      <div className="mt-3">
                        <span className="text-xl font-bold text-primary">{item.price.toFixed(2)}€</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedImageUrl = selectedItem.imageUrl || selectedItem.image;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold">{selectedItem.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Product Image */}
        {selectedImageUrl && (
          <div className="aspect-video max-w-md mx-auto rounded-lg overflow-hidden">
            <img
              src={selectedImageUrl}
              alt={selectedItem.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Quantity */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quantité</h2>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Menu Option */}
        {showMenuOption && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Option Menu</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'none', label: 'Sans', price: 0 },
                { id: 'frites', label: 'Frites', price: 1.5 },
                { id: 'boisson', label: 'Boisson', price: 1.5 },
                { id: 'menu', label: 'Menu Complet', price: 2.5, desc: 'Frites + Boisson' },
              ].map((option) => (
                <Card
                  key={option.id}
                  className={`p-3 cursor-pointer transition-all ${menuOption === option.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setMenuOption(option.id as typeof menuOption)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{option.label}</span>
                      {option.desc && <p className="text-xs text-muted-foreground">{option.desc}</p>}
                    </div>
                    {menuOption === option.id && <Check className="w-5 h-5 text-primary" />}
                  </div>
                  {option.price > 0 && (
                    <span className="text-sm text-primary font-semibold">+{option.price}€</span>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="container mx-auto">
          <Button
            className="w-full h-14 text-lg"
            onClick={handleAddToCart}
          >
            Ajouter au panier - {calculatePrice().toFixed(2)}€
          </Button>
        </div>
      </div>
    </div>
  );
}
