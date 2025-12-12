import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
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
  Shield,
  Settings,
  Clock,
  ChevronDown,
  Utensils,
  Droplet,
  Leaf,
  Plus,
  GlassWater,
  Cake
} from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavItem {
  label: string;
  icon: React.ElementType;
  value?: string;
  href?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, value: 'dashboard' },
  { label: 'Commandes', icon: Package, value: 'orders' },
  { label: 'TV Dashboard', icon: Tv, href: '/tv' },
  { label: 'Imprimante', icon: Printer, value: 'printer' },
  {
    label: 'Produits',
    icon: Pizza,
    children: [
      { label: 'Tous les Produits', icon: Pizza, value: 'products' },
      { label: 'Viandes', icon: Utensils, value: 'meats' },
      { label: 'Sauces', icon: Droplet, value: 'sauces' },
      { label: 'Garnitures', icon: Leaf, value: 'garnitures' },
      { label: 'Suppléments', icon: Plus, value: 'supplements' },
      { label: 'Boissons', icon: GlassWater, value: 'drinks' },
      { label: 'Desserts', icon: Cake, value: 'desserts' },
    ]
  },
  { label: 'Zones de Livraison', icon: MapPin, value: 'zones' },
  { label: 'Carousel & Média', icon: Image, value: 'media' },
  { label: 'Promotions', icon: Gift, value: 'promotions' },
  { label: 'Fidélité', icon: Star, value: 'loyalty' },
  { label: 'Statistiques', icon: BarChart3, value: 'stats' },
  { label: 'Horaires', icon: Clock, value: 'hours' },
  { label: 'Ventes', icon: BarChart3, value: 'ventes' },
  { label: 'Paramètres', icon: Settings, value: 'settings' },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const [openGroups, setOpenGroups] = useState<string[]>(['Produits']);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => 
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    );
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const Icon = item.icon;
    const isActive = item.value === activeTab;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openGroups.includes(item.label);

    if (item.href) {
      return (
        <Link
          key={item.label}
          to={item.href}
          target={item.href === '/tv' ? '_blank' : undefined}
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
        <Collapsible key={item.label} open={isOpen} onOpenChange={() => toggleGroup(item.label)}>
          <CollapsibleTrigger className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
            "hover:bg-amber-500/10 hover:text-amber-500",
            "text-muted-foreground"
          )}>
            <Icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
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
        onClick={() => item.value && onTabChange(item.value)}
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
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
            <Pizza className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold">
              <span className="text-amber-500">TWIN</span> Admin
            </h1>
          </div>
        </Link>
      </div>

      <nav className="p-3 space-y-1">
        {navItems.map(item => renderNavItem(item))}
      </nav>
    </aside>
  );
}