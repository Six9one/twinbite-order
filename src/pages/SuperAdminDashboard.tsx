import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant, Tenant, DEFAULT_TENANT_ID } from '@/context/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Building2, Plus, RefreshCw, Shield, Globe, Layers, ArrowRight, Store,
  TrendingUp, Users, Package, CheckCircle, XCircle, Search, ExternalLink, LogOut, Settings
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { tenant, setTenant } = useTenant();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tenants:', error);
        toast.error('Erreur lors du chargement des restaurants.');
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

  const handleInspectRestaurant = (selected: Tenant) => {
    setTenant(selected);
    toast.success(`Session SuperAdmin basculée sur : ${selected.name}`);
    navigate('/admin/dashboard');
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                Resto<span className="text-amber-500 font-extrabold">OS</span>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                  SuperAdmin Master Control
                </Badge>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/register-restaurant">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                <Plus className="w-4 h-4 mr-1.5" /> Nouveau Restaurant
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => navigate('/admin/dashboard')} className="border-slate-700 text-slate-300">
              Voir Back-Office Actif
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Restaurants</p>
                <h3 className="text-3xl font-extrabold mt-1 text-amber-400">{tenants.length}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                <Building2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Session Active</p>
                <h3 className="text-base font-bold mt-1 text-white truncate max-w-[150px]">{tenant.name}</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Shield className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Isolation RLS</p>
                <h3 className="text-base font-bold mt-1 text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> 100% Strict
                </h3>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                <Layers className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Plateforme SaaS</p>
                <h3 className="text-base font-bold mt-1 text-amber-400">RestoOS v1.0</h3>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Management Table */}
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                Gestion Générale des Établissements Clients
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Contrôlez et inspectez les restaurants hébergés sur RestoOS.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  placeholder="Rechercher un restaurant..."
                  className="pl-9 bg-slate-800 border-slate-700 text-white text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" onClick={fetchTenants} disabled={isLoading} className="border-slate-700">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-950/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Restaurant</TableHead>
                  <TableHead className="text-slate-400">Slug URL</TableHead>
                  <TableHead className="text-slate-400">Tenant ID</TableHead>
                  <TableHead className="text-slate-400">Statut</TableHead>
                  <TableHead className="text-slate-400 text-right">Action SuperAdmin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((t) => {
                  const isCurrent = t.id === tenant.id;
                  const isDefault = t.id === DEFAULT_TENANT_ID;

                  return (
                    <TableRow key={t.id} className="border-slate-800/60 hover:bg-slate-800/40">
                      <TableCell className="font-semibold text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-500 font-bold">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              {t.name}
                              {isDefault && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                  Restaurant #1
                                </Badge>
                              )}
                            </p>
                            {t.domain && <p className="text-xs text-slate-400">{t.domain}</p>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="font-mono text-sm text-slate-300">
                        ?tenant={t.slug}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-slate-400">
                        {t.id.slice(0, 18)}...
                      </TableCell>

                      <TableCell>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Actif
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className={isCurrent ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 hover:bg-slate-700 text-white"}
                          onClick={() => handleInspectRestaurant(t)}
                        >
                          {isCurrent ? 'Session Active' : 'Inspecter le Back-Office'}
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
