import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant, Tenant, DEFAULT_TENANT_ID } from '@/context/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from '@/components/ui/dialog';
import {
  FlaskConical, Store, Shield, ShoppingCart, Tv, CreditCard,
  Building2, Plus, Zap, ArrowRight, CheckCircle2, RefreshCw, LayoutDashboard
} from 'lucide-react';
import { toast } from 'sonner';

export default function TestSandboxModal() {
  const navigate = useNavigate();
  const { tenant, setTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [isInjectingOrder, setIsInjectingOrder] = useState(false);

  // Quick switch tenants list
  const testTenants = [
    { id: DEFAULT_TENANT_ID, name: 'Twin Pizza', slug: 'twin-pizza', plan: 'pro' },
    { id: 'merrill-simon-tenant-id', name: 'Merrill Simon', slug: 'merrill-simon', plan: 'full' },
    { id: 'lisandra-reid-tenant-id', name: 'Lisandra Reid', slug: 'lisandra-reid', plan: 'starter' },
  ];

  const handleSwitchTenant = (t: Partial<Tenant>) => {
    setTenant(t as Tenant);
    toast.success(`Session de test basculée sur : ${t.name}`);
  };

  const handleInjectTestOrder = async () => {
    try {
      setIsInjectingOrder(true);

      const orderNumber = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
      const testOrder = {
        tenant_id: tenant.id,
        order_number: orderNumber,
        customer_name: 'Client Test Sandbox',
        customer_phone: '06 12 34 56 78',
        delivery_type: 'pickup',
        status: 'pending',
        payment_method: 'cash',
        total: 24.50,
        items: [
          { name: 'Pizza Reine (Taille L)', quantity: 1, price: 14.50 },
          { name: 'Coca-Cola 33cl', quantity: 2, price: 5.00 },
        ],
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(testOrder as any)
        .select()
        .single();

      if (error) {
        console.error('Inject order error:', error);
        toast.error(`Erreur création commande test: ${error.message}`);
        return;
      }

      toast.success(`🍕 Commande de test #${orderNumber} injectée dans ${tenant.name} !`);
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setIsInjectingOrder(false);
    }
  };

  return (
    <>
      {/* Floating Sandbox Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900 text-amber-400 border border-amber-500/40 shadow-2xl hover:scale-105 hover:bg-slate-800 transition-all font-bold text-xs group"
        title="Ouvrir le Bac à Sable de Test RestoOS"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <FlaskConical className="w-4 h-4 text-amber-500 group-hover:rotate-12 transition-transform" />
        <span>RestoOS Test Sandbox</span>
      </button>

      {/* Sandbox Dialog Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 text-white border-slate-800">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <FlaskConical className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Bac à Sable & Testeur Universel RestoOS
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                  Mode Démo Sans Mot de Passe
                </Badge>
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              Naviguez instantanément entre tous les restaurants, rôles et écrans sans saisir aucun identifiant ou mot de passe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* 1. Active Tenant Quick Switch */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                1. Basculer de Restaurant Instantanément
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {testTenants.map((t) => {
                  const isSelected = tenant.name.toLowerCase().includes(t.name.toLowerCase());
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSwitchTenant(t as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 text-white shadow-lg ring-1 ring-amber-500/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{t.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">?tenant={t.slug}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Direct Navigation Links */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                2. Accéder Instantanément aux Écrans de l'App
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { navigate('/admin/dashboard'); setIsOpen(false); }}
                  className="bg-slate-900 border-slate-800 text-amber-400 hover:bg-amber-500/10 justify-start"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Back-Office Admin
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { navigate('/superadmin'); setIsOpen(false); }}
                  className="bg-slate-900 border-slate-800 text-purple-400 hover:bg-purple-500/10 justify-start"
                >
                  <Shield className="w-4 h-4 mr-2" /> SuperAdmin Master
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { navigate(`/?tenant=${tenant.slug}`); setIsOpen(false); }}
                  className="bg-slate-900 border-slate-800 text-emerald-400 hover:bg-emerald-500/10 justify-start"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" /> Menu Client Web
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { navigate('/tv'); setIsOpen(false); }}
                  className="bg-slate-900 border-slate-800 text-sky-400 hover:bg-sky-500/10 justify-start"
                >
                  <Tv className="w-4 h-4 mr-2" /> Écran TV Cuisine
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { navigate('/pos'); setIsOpen(false); }}
                  className="bg-slate-900 border-slate-800 text-amber-400 hover:bg-amber-500/10 justify-start"
                >
                  <CreditCard className="w-4 h-4 mr-2" /> Caisse POS
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { navigate('/register-restaurant'); setIsOpen(false); }}
                  className="bg-slate-900 border-slate-800 text-rose-400 hover:bg-rose-500/10 justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" /> Créer Restaurant
                </Button>
              </div>
            </div>

            {/* 3. Inject Test Order Action */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm text-white">Tester les Alertes & Commande Instantanée</p>
                <p className="text-xs text-slate-400">Injecte une commande de test pour déclencher les notifications, tickets et écran cuisine.</p>
              </div>
              <Button
                onClick={handleInjectTestOrder}
                disabled={isInjectingOrder}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {isInjectingOrder ? 'Injection...' : 'Générer 1 Commande Test'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
