import { ShoppingCart, Menu, X, ShoppingBag, Truck, UtensilsCrossed, ChevronDown, Pizza, CalendarClock } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { OrderType } from '@/types/order';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import logoImage from '@/assets/logo.png';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface HeaderProps {
  onCartClick: () => void;
  onOrderTypeSelect?: (type: OrderType) => void;
  onMenuClick?: () => void;
  onScheduleClick?: () => void;
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
  onMenuClick,
  onScheduleClick
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
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-sm border-b border-border safe-top">
      <div className="w-full bg-muted/50 border-b border-border/50">
        <div className="container mx-auto px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src={logoImage}
              alt="Twin Pizza"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-primary/20"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight">Twin Pizza</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden xs:block">Grand-Couronne</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4">
            <Button variant="ghost" onClick={handleMenuClick} className="text-sm font-semibold hover:text-primary transition-colors">
              Menu
            </Button>

            <Button variant="ghost" onClick={handleLivraisonClick} className="gap-2 text-sm font-semibold hover:text-primary transition-colors">
              <Truck className="w-4 h-4" />
              Livraison
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5">
                  Commander
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 p-1">
                {Object.entries(orderTypeConfig).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => handleOrderTypeChange(type as OrderType)}
                      className="gap-2 cursor-pointer py-2 px-3 rounded-md focus:bg-primary/10 focus:text-primary"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{config.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {orderType && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 px-3 bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-wider">
                {(() => {
                  const config = orderTypeConfig[orderType];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </>
                  );
                })()}
              </Badge>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            <Button
              onClick={onScheduleClick}
              variant="ghost"
              size="sm"
              className="hidden md:flex gap-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-semibold"
            >
              <CalendarClock className="w-4 h-4" />
              <span className="hidden xl:inline">Plus tard</span>
            </Button>

            <Button
              onClick={onCartClick}
              className="relative flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 h-9 sm:h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-bold text-sm sm:text-base">Panier</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-accent text-accent-foreground text-[10px] sm:text-xs font-black rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in">
                  {itemCount}
                </span>
              )}
            </Button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-muted flex items-center justify-center transition-colors hover:bg-muted/80 active:scale-95"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-foreground" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[-1] lg:hidden animate-in fade-in duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Content */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-background border-t border-border py-6 px-4 shadow-xl animate-in slide-in-from-top duration-300">
          {/* Mobile Order Type Indicator */}
          {orderType && (
            <div className="mb-6 flex justify-center">
              <Badge variant="secondary" className="gap-2 py-2 px-4 bg-primary/10 text-primary border-none text-xs font-bold uppercase tracking-widest">
                {(() => {
                  const config = orderTypeConfig[orderType];
                  const Icon = config.icon;
                  return (
                    <>
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </>
                  );
                })()}
              </Badge>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            <Button
              variant="outline"
              onClick={handleMenuClick}
              className="w-full h-12 justify-between px-4 text-base font-semibold rounded-xl border-muted-foreground/10 hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Pizza className="w-5 h-5 text-primary" />
                <span>Menu complet</span>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 opacity-40" />
            </Button>

            <Button
              variant="outline"
              onClick={handleLivraisonClick}
              className="w-full h-12 justify-between px-4 text-base font-semibold rounded-xl border-muted-foreground/10 hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-primary" />
                <span>Zone de Livraison</span>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 opacity-40" />
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                onScheduleClick?.();
                setMobileMenuOpen(false);
              }}
              className="w-full h-12 justify-between px-4 text-base font-semibold rounded-xl border-purple-100 bg-purple-50/50 text-purple-700 hover:bg-purple-100"
            >
              <div className="flex items-center gap-3">
                <CalendarClock className="w-5 h-5" />
                <span>Commander plus tard</span>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 opacity-40" />
            </Button>
          </div>

          {/* Order Type Selection */}
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 px-2">Mode de Commande</p>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(orderTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                const isActive = orderType === type;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      handleOrderTypeChange(type as OrderType);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between w-full h-12 px-4 rounded-xl text-sm font-bold transition-all ${isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-white hover:bg-white/80 text-foreground shadow-sm'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                      {config.label}
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Language Switcher */}
          <div className="mt-8 flex justify-center pb-2">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
