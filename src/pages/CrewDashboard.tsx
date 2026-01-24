import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChefHat,
  AlertTriangle,
  Settings,
  Printer,
  MessageSquare,
  Clock,
  ShoppingCart,
  LayoutDashboard,
  Power,
  Package,
  Terminal,
  ClipboardList
} from 'lucide-react';
import { HACCPManager } from '@/components/admin/HACCPManager';
import { InventoryManager } from '@/components/crew/InventoryManager';
import { SystemHealthPanel } from '@/components/crew/SystemHealthPanel';
import { OrdersKanban } from '@/components/crew/OrdersKanban';
import { useLowStockAlerts } from '@/hooks/useInventory';
import { useSystemHealth } from '@/hooks/useSystemHealth';

type CrewTab = 'dashboard' | 'orders' | 'haccp' | 'inventory' | 'system' | 'settings';

export default function CrewDashboard() {
  const [activeTab, setActiveTab] = useState<CrewTab>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  // System health monitoring
  const { health } = useSystemHealth();

  // Get low stock alerts for dashboard
  const { data: lowStockItems } = useLowStockAlerts();

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-[#0f0f10] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#161618] border-r border-white/5 flex flex-col pt-6">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <ChefHat className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">TWIN<span className="text-orange-500">CREW</span></span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem
            icon={<LayoutDashboard />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem
            icon={<ClipboardList />}
            label="Commandes"
            active={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
          />
          <NavItem
            icon={<AlertTriangle />}
            label="HACCP Labels"
            active={activeTab === 'haccp'}
            onClick={() => setActiveTab('haccp')}
          />
          <NavItem
            icon={<ShoppingCart />}
            label="Stocks & Commandes"
            active={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            badge={lowStockItems?.length}
          />
          <NavItem
            icon={<Terminal />}
            label="Système"
            active={activeTab === 'system'}
            onClick={() => setActiveTab('system')}
          />
          <NavItem
            icon={<Settings />}
            label="Réglages"
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <StatusLine icon={<Printer />} label="Printer" online={health.printer.isOnline} />
          <StatusLine icon={<MessageSquare />} label="WhatsApp Bot" online={health.whatsappBot.isOnline} />
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-950/20 mt-4">
            <Power className="mr-2 h-4 w-4" /> Fermer Session
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Top Header info */}
        <header className="h-16 border-b border-white/5 bg-[#161618]/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-medium capitalize">
            {activeTab === 'dashboard' ? 'Vue d\'ensemble' :
              activeTab === 'orders' ? 'Commandes Live' :
                activeTab === 'haccp' ? 'HACCP Labels' :
                  activeTab === 'inventory' ? 'Stocks & Commandes' :
                    activeTab === 'system' ? 'Système & WhatsApp' :
                      'Réglages'}
          </h2>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 px-3 py-1">
              <Clock className="w-3 h-3 mr-2" />
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          </div>
        </header>

        <ScrollArea className="h-[calc(100vh-64px)] p-8">
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
              <SummaryCard
                title="Commandes Live"
                value="0"
                detail="En préparation"
                icon={<ChefHat className="text-blue-500" />}
              />
              <SummaryCard
                title="HACCP Aujourd'hui"
                value="0"
                detail="Tickets sortis"
                icon={<AlertTriangle className="text-orange-500" />}
              />
              <SummaryCard
                title="Alertes Stock"
                value={String(lowStockItems?.length || 0)}
                detail="Produits en rupture"
                icon={<ShoppingCart className="text-red-500" />}
              />
              <div className="lg:col-span-3">
                <Card className="bg-[#161618] border-white/5 p-6 h-64 flex flex-col items-center justify-center text-center">
                  <ChefHat className="w-12 h-12 text-gray-600 mb-4 opacity-20" />
                  <p className="text-gray-500">Bienvenue dans le TwinCrew Hub.</p>
                  <p className="text-gray-600 text-sm mt-2">Tout est sous contrôle. 🍕</p>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <OrdersKanban />
          )}

          {activeTab === 'haccp' && (
            <div className="space-y-6">
              <HACCPManager />
            </div>
          )}

          {activeTab === 'inventory' && (
            <InventoryManager />
          )}

          {activeTab === 'system' && (
            <SystemHealthPanel />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <Card className="bg-[#161618] border-white/5 p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Settings className="text-orange-500" />
                  Réglages
                </h3>
                <p className="text-gray-500">Configuration du système à venir...</p>
              </Card>
            </div>
          )}
        </ScrollArea>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void, badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all ${active
        ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
        }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
      {badge && badge > 0 && (
        <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5">{badge}</Badge>
      )}
      {active && !badge && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)]" />}
    </button>
  );
}

function StatusLine({ icon, label, online }: { icon: React.ReactNode, label: string, online: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs px-2">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
        <span className={online ? 'text-green-500 font-medium' : 'text-red-500'}>
          {online ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, detail, icon }: { title: string, value: string, detail: string, icon: React.ReactNode }) {
  return (
    <Card className="p-6 bg-[#161618] border-white/5 hover:border-orange-500/30 transition-all hover:bg-[#1a1a1c] cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <Badge variant="outline" className="text-gray-500 bg-white/5">Auto</Badge>
      </div>
      <h3 className="text-3xl font-bold mb-1">{value}</h3>
      <p className="text-gray-400 font-medium">{title}</p>
      <div className="mt-4 pt-4 border-t border-white/5 text-xs text-gray-500 flex items-center gap-2">
        <div className="w-1 h-1 rounded-full bg-orange-500" />
        {detail}
      </div>
    </Card>
  );
}
