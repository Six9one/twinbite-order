import { ShoppingCart, Pizza, Menu, X } from 'lucide-react';
import { useOrder } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const { getItemCount, orderType } = useOrder();
  const itemCount = getItemCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const orderTypeLabels = {
    emporter: 'À Emporter',
    livraison: 'Livraison',
    surplace: 'Sur Place',
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-11 h-11 bg-primary rounded-full flex items-center justify-center">
            <Pizza className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground leading-tight">Twin Pizza</h1>
            {orderType && (
              <span className="text-xs text-primary font-medium">
                {orderTypeLabels[orderType]}
              </span>
            )}
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('menu')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Menu
          </button>
          <button onClick={() => scrollToSection('delivery')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Livraison
          </button>
          <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Admin
          </Link>
        </nav>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={onCartClick}
            className="btn-primary relative flex items-center gap-2 px-4 py-2 rounded-full"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">Panier</span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 rounded-full bg-muted flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border py-4 px-4 animate-slide-up">
          <nav className="flex flex-col gap-3">
            <button onClick={() => scrollToSection('menu')} className="text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Menu
            </button>
            <button onClick={() => scrollToSection('delivery')} className="text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Livraison
            </button>
            <Link to="/admin" className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
