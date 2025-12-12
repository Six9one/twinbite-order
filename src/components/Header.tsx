import { ShoppingCart, Menu, X, ShoppingBag, Truck, UtensilsCrossed, ChevronDown, Pizza } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import logoImage from '@/assets/logo.png';
interface HeaderProps {
  onCartClick: () => void;
  onOrderTypeSelect?: (type: OrderType) => void;
  onMenuClick?: () => void;
}
const orderTypeConfig = {
  emporter: {
    label: 'À Emporter',
    icon: ShoppingBag,
    color: 'bg-amber-500'
  },
  livraison: {
    label: 'Livraison',
    icon: Truck,
    color: 'bg-blue-500'
  },
  surplace: {
    label: 'Sur Place',
    icon: UtensilsCrossed,
    color: 'bg-green-500'
  }
};
export function Header({
  onCartClick,
  onOrderTypeSelect,
  onMenuClick
}: HeaderProps) {
  const {
    getItemCount,
    orderType,
    setOrderType
  } = useOrder();
  const itemCount = getItemCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleOrderTypeChange = (type: OrderType) => {
    setOrderType(type);
    if (onOrderTypeSelect) {
      onOrderTypeSelect(type);
    }
  };
  const handleLivraisonClick = () => {
    setOrderType('livraison');
    if (onOrderTypeSelect) {
      onOrderTypeSelect('livraison');
    }
    setMobileMenuOpen(false);
  };
  const handleMenuClick = () => {
    if (onMenuClick) {
      onMenuClick();
    }
    setMobileMenuOpen(false);
  };
  return <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between bg-muted">
        <div className="flex items-center gap-3">
          <img src={logoImage} alt="Twin Pizza" className="w-12 h-12 rounded-full object-cover" />
          <div className="hidden sm:block">
            <h1 className="text-xl font-medium text-foreground leading-tight">Twin Pizza</h1>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {/* Menu button - opens order type selection */}
          <Button variant="ghost" onClick={handleMenuClick} className="text-sm font-medium">
            Menu
          </Button>

          {/* Livraison button - goes directly to delivery menu */}
          <Button variant="outline" onClick={handleLivraisonClick} className="gap-2">
            <Truck className="w-4 h-4" />
            Livraison
          </Button>

          {/* Order Type Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="gap-2 btn-primary">
                Commander
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {Object.entries(orderTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              return <DropdownMenuItem key={type} onClick={() => handleOrderTypeChange(type as OrderType)} className="gap-2 cursor-pointer">
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </DropdownMenuItem>;
            })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Current Order Type Badge */}
          {orderType && <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
              {(() => {
            const config = orderTypeConfig[orderType];
            const Icon = config.icon;
            return <>
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </>;
          })()}
            </Badge>}
        </nav>
        
        <div className="flex items-center gap-3">
          <Button onClick={onCartClick} className="btn-primary relative flex items-center gap-2 px-4 py-2 rounded-full">
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Panier</span>
            {itemCount > 0 && <span className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>}
          </Button>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && <div className="md:hidden bg-background border-t border-border py-4 px-4 animate-slide-up">
          {/* Mobile Order Type Indicator */}
          {orderType && <div className="mb-4 pb-4 border-b border-border">
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3">
                {(() => {
            const config = orderTypeConfig[orderType];
            const Icon = config.icon;
            return <>
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </>;
          })()}
              </Badge>
            </div>}

          {/* Quick Actions */}
          <div className="mb-4 pb-4 border-b border-border space-y-2">
            <Button variant="outline" onClick={handleMenuClick} className="w-full justify-start gap-2">
              <Pizza className="w-4 h-4" />
              Menu
            </Button>
            <Button variant="outline" onClick={handleLivraisonClick} className="w-full justify-start gap-2">
              <Truck className="w-4 h-4" />
              Livraison
            </Button>
          </div>

          {/* Order Type Selection */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Commander</p>
            <div className="flex flex-col gap-2">
              {Object.entries(orderTypeConfig).map(([type, config]) => {
            const Icon = config.icon;
            return <button key={type} onClick={() => {
              handleOrderTypeChange(type as OrderType);
              setMobileMenuOpen(false);
            }} className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${orderType === type ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </button>;
          })}
            </div>
          </div>
        </div>}
    </header>;
}