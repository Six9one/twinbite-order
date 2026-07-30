import React, { useState, useEffect } from 'react';
import { useTenant, Tenant, DEFAULT_TENANT_ID } from '@/context/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, CheckCircle, RefreshCw, Shield, Globe, Layers, ArrowRight, Store } from 'lucide-react';
import { toast } from 'sonner';

export const TenantManager: React.FC = () => {
  const { tenant, setTenant, isLoading: contextLoading } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // New tenant form state
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching tenants:', error);
        toast.error('Impossible de charger les établissements.');
        return;
      }

      setTenants((data as Tenant[]) || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Le nom et le slug sont requis.');
      return;
    }

    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          name: name.trim(),
          slug: formattedSlug,
          domain: domain.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating tenant:', error);
        toast.error(`Erreur: ${error.message}`);
        return;
      }

      toast.success(`Établissement "${name}" créé avec succès !`);
      setIsOpen(false);
      setName('');
      setSlug('');
      setDomain('');
      fetchTenants();
    } catch (err: any) {
      toast.error(`Erreur lors de la création: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTenant = (selected: Tenant) => {
    setTenant(selected);
    toast.success(`Session basculée sur : ${selected.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-red-600 via-amber-600 to-emerald-600 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-7 h-7 text-white" />
            <h1 className="text-2xl font-bold">Plateforme Multi-Tenant B2B</h1>
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">SaaS Active</Badge>
          </div>
          <p className="text-white/80 text-sm">
            Gérez les établissements, l'isolation des données RLS et la configuration multi-restaurant.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-md border-none">
              <Plus className="w-4 h-4 mr-2" /> Nouveau Restaurant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-red-600" />
                Ajouter un Restaurant Tenant
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Nom du Restaurant</Label>
                <Input
                  id="tenant-name"
                  placeholder="ex: Mamma Mia Pizzeria"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-slug">Identifiant Slug (Unique)</Label>
                <Input
                  id="tenant-slug"
                  placeholder="ex: mamma-mia"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">Utilisé dans l'URL: ?tenant=mamma-mia</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-domain">Domaine Personnalisé (Optionnel)</Label>
                <Input
                  id="tenant-domain"
                  placeholder="ex: mammamia.fr"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? 'Création...' : 'Créer le Tenant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Session Tenant Card */}
      <Card className="border-2 border-red-500/20 bg-gradient-to-br from-red-50/50 to-orange-50/30 dark:from-gray-900 dark:to-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <CardTitle className="text-lg">Session Active Utilisateur</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
              Isolé RLS
            </Badge>
          </div>
          <CardDescription>
            Toutes les requêtes Supabase sont automatiquement filtrées sur cet établissement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</span>
              <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                <Store className="w-4 h-4 text-red-600" />
                {tenant.name}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</span>
              <p className="text-sm font-mono text-gray-700 dark:text-gray-300 mt-0.5 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded w-fit">
                {tenant.slug}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">ID Tenant</span>
              <p className="text-xs font-mono text-gray-500 truncate mt-0.5" title={tenant.id}>
                {tenant.id}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Actif</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table & Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              Établissements Enregistrés ({tenants.length})
            </CardTitle>
            <CardDescription>
              Liste des restaurants hébergés sur la plateforme multi-tenant.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTenants} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => {
              const isCurrent = t.id === tenant.id;
              const isDefault = t.id === DEFAULT_TENANT_ID;

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-xl border transition-all duration-200 ${
                    isCurrent
                      ? 'border-red-500 bg-red-50/40 dark:bg-red-950/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isCurrent ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          {t.name}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">slug: {t.slug}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <Badge className="bg-red-600 text-white border-none flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Actif
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 my-3 font-mono bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tenant ID:</span>
                      <span className="truncate max-w-[160px]" title={t.id}>{t.id}</span>
                    </div>
                    {t.domain && (
                      <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                        <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Domaine:</span>
                        <span>{t.domain}</span>
                      </div>
                    )}
                    {isDefault && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                        ★ Tenant Initial (Twin Pizza)
                      </div>
                    )}
                  </div>

                  {!isCurrent ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50"
                      onClick={() => handleSelectTenant(t)}
                    >
                      Basculler la session <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-gray-400 cursor-default" disabled>
                      Établissement actuellement sélectionné
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
