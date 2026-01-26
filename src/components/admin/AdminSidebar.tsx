import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Tv,
  Printer,
  Pizza,
  MapPin,
  Image,
  Gift,
  Star,
  BarChart3,
  Users,
  User,
  Shield,
  Settings,
  Clock,
  ChevronDown,
  Utensils,
  Droplet,
  Leaf,
  Plus,
  GlassWater,
  Cake,
  Sandwich,
  Salad,
  MessageSquare,
  Flame,
  Globe,
  CreditCard,
  Power,
  Euro,
  LogOut,
  ExternalLink,
  Ticket,
  FileText
} from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import logoImage from '@/assets/logo.png';

interface NavItem {
  label: string;
  icon: React.ElementType;
  value?: string;
  href?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Outils Rapides',
    icon: TrendingUp,
    children: [
      { label: 'Mode TV', icon: Tv, href: '/tv' },
      { label: 'Avis Clients', icon: MessageSquare, value: 'reviews' },
    ]
  },
  {
    label: 'Clients',
    icon: Users,
    children: [
      { label: 'Tickets Clients', icon: Ticket, value: 'tickets' },
    ]
  },
  {
    label: 'Menu Digital',
    icon: Pizza,
    children: [
      { label: 'Pizzas', icon: Pizza, value: 'pizzas' },
      { label: 'Sandwiches', icon: Sandwich, value: 'sandwiches' },
      {
        label: 'Autres Catégories',
        icon: Utensils,
        children: [
          { label: 'Soufflé', icon: Package, value: 'soufflet' },
          { label: 'Makloub', icon: Package, value: 'makloub' },
          { label: 'Mlawi', icon: Package, value: 'mlawi' },
          { label: 'Tacos', icon: Package, value: 'tacos' },
          { label: 'Panini', icon: Package, value: 'panini' },
          { label: 'Croques', icon: Package, value: 'croques' },
          { label: 'Tex-Mex', icon: Flame, value: 'texmex' },
          { label: 'Frites', icon: Package, value: 'frites' },
          { label: 'Milkshakes', icon: GlassWater, value: 'milkshakes' },
          { label: 'Crêpes', icon: Cake, value: 'crepes' },
          { label: 'Gaufres', icon: Cake, value: 'gaufres' },
          { label: 'Boissons', icon: GlassWater, value: 'drinks' },
          { label: 'Desserts', icon: Cake, value: 'desserts' },
        ]
      },
      {
        label: 'Options & Extras',
        icon: Plus,
        children: [
          { label: 'Viandes', icon: Utensils, value: 'meats' },
          { label: 'Sauces', icon: Droplet, value: 'sauces' },
          { label: 'Garnitures', icon: Leaf, value: 'garnitures' },
          { label: 'Crudités', icon: Salad, value: 'crudites' },
          { label: 'Suppléments', icon: Plus, value: 'supplements' },
        ]
      },
      { label: '💰 Tous les Prix', icon: Euro, value: 'prices' },
    ]
  },
  {
    label: 'Marketing & CRM',
    icon: Gift,
    children: [
      { label: 'Promotions', icon: Gift, value: 'promotions' },
      { label: 'Fidélité', icon: Star, value: 'loyalty' },
      { label: 'Carousel Media', icon: Image, value: 'carousel' },
      { label: 'Images Catégories', icon: Image, value: 'category-images' },
      { label: 'Images Wizard', icon: Image, value: 'wizard-images' },
      { label: 'Contenu Site', icon: Globe, value: 'content' },
    ]
  },
  {
    label: 'Config. Établissement',
    icon: Power,
    children: [
      { label: 'Statut & Horaires', icon: Power, value: 'store-status' },
      { label: 'Zones de Livraison', icon: MapPin, value: 'zones' },
      { label: '🧾 HACCP', icon: Shield, value: 'haccp' },
    ]
  },
  {
    label: 'Réglages Système',
    icon: Settings,
    children: [
      { label: 'Paiements', icon: CreditCard, value: 'payments' },
      { label: 'Configuration Imprimante', icon: Printer, value: 'printer' },
      { label: 'Templates Tickets', icon: FileText, value: 'ticket-templates' },
      { label: 'Settings Gérants', icon: Settings, value: 'settings' },
      { label: 'Portail Tickets Public', icon: ExternalLink, href: '/tickets' },
    ]
  }
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ activeTab, onTabChange, isOpen = true, onClose }: AdminSidebarProps) {
  // All sections closed by default - open only when clicked
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

  const handleNavClick = (value: string) => {
    onTabChange(value);
    // Close sidebar on mobile after navigation
    if (onClose && window.innerWidth < 768) {
      onClose();
    }
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon;
    const isActive = item.value === activeTab;
    const hasChildren = item.children && item.children.length > 0;
    const isGroupOpen = openGroups.includes(item.label);

    if (item.href) {
      return (
        <Link
          key={item.label}
          to={item.href}
          target={item.href === '/tv' ? '_blank' : undefined}
          onClick={() => onClose && window.innerWidth < 768 && onClose()}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            "hover:bg-amber-500/10 hover:text-amber-500",
            "text-muted-foreground"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <Icon className="w-4 h-4" />
          {item.label}
        </Link>
      );
    }

    if (hasChildren) {
      return (
        <Collapsible key={item.label} open={isGroupOpen} onOpenChange={() => toggleGroup(item.label)}>
          <CollapsibleTrigger className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
            "hover:bg-amber-500/10 hover:text-amber-500",
            "text-muted-foreground"
          )}>
            <Icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isGroupOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-2 border-l border-border/50 pl-2 mt-1">
            {item.children?.map(child => renderNavItem(child, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <button
        key={item.label}
        onClick={() => item.value && handleNavClick(item.value)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-left",
          isActive
            ? "bg-amber-500 text-black"
            : "hover:bg-amber-500/10 hover:text-amber-500 text-muted-foreground"
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <Icon className="w-4 h-4" />
        {item.label}
      </button>
    );
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "bg-card border-r border-border h-screen overflow-y-auto transition-transform duration-300 z-50",
        // Mobile: fixed overlay
        "fixed md:sticky top-0 left-0 w-72",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        // Desktop: adjust width based on isOpen
        !isOpen && "md:w-0 md:overflow-hidden"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <button onClick={() => handleNavClick('orders')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logoImage} alt="Twin Pizza" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-lg font-bold">
                <span className="text-amber-500">TWIN</span> Admin
              </h1>
            </div>
          </button>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-muted"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map(item => renderNavItem(item))}
        </nav>
      </aside>
    </>
  );
}