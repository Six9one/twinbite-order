import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { supabase, setSupabaseTenantHeader } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Store, ArrowRight, CheckCircle2, Sparkles, ShieldCheck, Building2, MapPin, Phone, Mail, Globe, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterRestaurant() {
  const navigate = useNavigate();
  const { setTenant } = useTenant();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form fields
  const [name, setName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [domain, setDomain] = useState<string>('');
  const [plan, setPlan] = useState<string>('pro');

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim() || !email.trim() || !password.trim()) {
      toast.error('Veuillez remplir le nom, email et mot de passe.');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

    try {
      setIsSubmitting(true);

      // 1. Create tenant in public.tenants table
      let { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: name.trim(),
          slug: cleanSlug,
          domain: domain.trim() || null,
          plan: plan,
          is_active: true,
        })
        .select()
        .single();

      // Fallback if 'plan' column is not added in Supabase yet
      if (tenantError && tenantError.message.includes('plan')) {
        const fallbackRes = await supabase
          .from('tenants')
          .insert({
            name: name.trim(),
            slug: cleanSlug,
            domain: domain.trim() || null,
            is_active: true,
          })
          .select()
          .single();
        newTenant = fallbackRes.data;
        tenantError = fallbackRes.error;
      }

      if (tenantError) {
        console.error('Tenant creation error:', tenantError);
        toast.error(`Erreur lors de la création: ${tenantError.message}`);
        return;
      }

      const createdTenant = newTenant as any;
      setSupabaseTenantHeader(createdTenant.id);
      setTenant(createdTenant);

      // 2. Register Supabase Auth Admin User
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              tenant_id: createdTenant.id,
              restaurant_name: name.trim(),
            }
          }
        });

        if (authData?.user) {
          // Link user as Admin for this tenant in user_roles
          await supabase.from('user_roles' as any).insert([
            {
              user_id: authData.user.id,
              role: 'admin',
              tenant_id: createdTenant.id,
            }
          ]);
        }
      } catch (authErr) {
        console.warn('Auth user registration warning:', authErr);
      }

      // 3. Seed initial categories for the new tenant
      try {
        await supabase.from('categories').insert([
          { name: 'Pizzas', slug: 'pizzas', display_order: 1, is_active: true, tenant_id: createdTenant.id },
          { name: 'Boissons', slug: 'drinks', display_order: 2, is_active: true, tenant_id: createdTenant.id },
          { name: 'Desserts', slug: 'desserts', display_order: 3, is_active: true, tenant_id: createdTenant.id },
        ]);
      } catch (catErr) {
        console.warn('Initial categories seeding error:', catErr);
      }

      toast.success(`🎉 Félicitations ! Votre restaurant "${name}" est prêt !`);
      setStep(3);
    } catch (err: any) {
      console.error('Registration submit error:', err);
      toast.error(`Une erreur est survenue: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-amber-950 text-white flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Top Navbar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold font-display">
          <Store className="w-7 h-7 text-amber-500" />
          <span>Resto<span className="text-amber-500 font-extrabold">OS</span></span>
        </Link>
        <Link to="/admin">
          <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            Espace Admin
          </Button>
        </Link>
      </header>

      {/* Main Content Container */}
      <main className="max-w-xl w-full mx-auto my-8">
        <Card className="bg-zinc-900/90 border-zinc-800 shadow-2xl backdrop-blur-xl text-white">
          <CardHeader className="text-center pb-2">
            <Badge className="w-fit mx-auto bg-amber-500/20 text-amber-400 border-amber-500/30 mb-2">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Plateforme B2B Restauration
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              Créez votre Restaurant en 2 Minutes
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Lancez votre menu digital, commandes en ligne, POS et borne tactile avec isolation totale.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {step === 1 && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-zinc-200">Nom de l'établissement</Label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-zinc-400 absolute left-3 top-3 z-10" />
                    <Input
                      id="reg-name"
                      placeholder="ex: Le Gourmet Burger"
                      style={{ backgroundColor: '#09090b', color: '#ffffff' }}
                      className="pl-9 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-amber-500"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-slug" className="text-zinc-200">Identifiant URL (Slug)</Label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-3 z-10" />
                    <Input
                      id="reg-slug"
                      placeholder="ex: le-gourmet-burger"
                      style={{ backgroundColor: '#09090b', color: '#ffffff' }}
                      className="pl-9 border-zinc-700 placeholder:text-zinc-500 font-mono text-sm focus-visible:ring-amber-500"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-zinc-400">
                    Adresse de votre boutique: <span className="text-amber-400 font-mono">?tenant={slug || 'votre-slug'}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-zinc-200">Email Administrateur</Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3 z-10" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="admin@restaurant.fr"
                        style={{ backgroundColor: '#09090b', color: '#ffffff' }}
                        className="pl-9 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-amber-500"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-pass" className="text-zinc-200">Mot de Passe Admin</Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3 z-10" />
                      <Input
                        id="reg-pass"
                        type="password"
                        placeholder="••••••••"
                        style={{ backgroundColor: '#09090b', color: '#ffffff' }}
                        className="pl-9 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-amber-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-zinc-200">Téléphone (Optionnel)</Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3 z-10" />
                    <Input
                      id="reg-phone"
                      placeholder="01 23 45 67 89"
                      style={{ backgroundColor: '#09090b', color: '#ffffff' }}
                      className="pl-9 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-amber-500"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-address" className="text-zinc-200">Adresse du Restaurant</Label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-3 z-10" />
                    <Input
                      id="reg-address"
                      placeholder="ex: 15 Rue de la Paix, Paris"
                      style={{ backgroundColor: '#09090b', color: '#ffffff' }}
                      className="pl-9 border-zinc-700 placeholder:text-zinc-500 focus-visible:ring-amber-500"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Plan Selection Cards */}
                <div className="space-y-2 pt-2">
                  <Label className="text-zinc-200 font-semibold flex items-center justify-between">
                    <span>Choisissez votre Formule RestoOS</span>
                    <span className="text-xs text-amber-400 font-normal">0% Commission sur les commandes</span>
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Starter Card */}
                    <div
                      onClick={() => setPlan('starter')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        plan === 'starter'
                          ? 'border-amber-500 bg-amber-500/10 text-white shadow-md'
                          : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-white">Starter</span>
                        <Badge className="bg-zinc-800 text-zinc-300 border-none text-[10px]">15€/mois</Badge>
                      </div>
                      <p className="text-[11px] leading-tight">Menu Digital & Commande en ligne (0% com)</p>
                    </div>

                    {/* Pro Card */}
                    <div
                      onClick={() => setPlan('pro')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all relative ${
                        plan === 'pro'
                          ? 'border-amber-500 bg-amber-500/20 text-white shadow-md ring-2 ring-amber-500/40'
                          : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="absolute -top-2 right-2 bg-amber-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                        POPULAIRE
                      </span>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-amber-400">Pro</span>
                        <Badge className="bg-amber-500/20 text-amber-300 border-none text-[10px]">29€/mois</Badge>
                      </div>
                      <p className="text-[11px] leading-tight">POS Caisse, KDS Cuisine & Impression</p>
                    </div>

                    {/* Full SaaS Card */}
                    <div
                      onClick={() => setPlan('full')}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        plan === 'full'
                          ? 'border-red-500 bg-red-500/10 text-white shadow-md'
                          : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-white">Full SaaS</span>
                        <Badge className="bg-red-500/20 text-red-300 border-none text-[10px]">49€/mois</Badge>
                      </div>
                      <p className="text-[11px] leading-tight">Tout inclus + Réceptionniste IA & WhatsApp</p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-bold py-3 mt-4 rounded-xl shadow-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Création de votre établissement...'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Lancer mon Restaurant <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {step === 3 && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white">Établissement Activé !</h3>
                <p className="text-zinc-300 text-sm max-w-md mx-auto">
                  Votre restaurant <span className="text-amber-400 font-semibold">{name}</span> a été créé avec succès et votre session est active.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate('/')}
                    variant="outline"
                    className="border-zinc-700 hover:bg-zinc-800 text-white"
                  >
                    Voir mon Menu Digital
                  </Button>
                  <Button
                    onClick={() => navigate('/admin/dashboard')}
                    className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  >
                    Accéder à mon Back-Office
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-center border-t border-zinc-800 text-xs text-zinc-500 pt-4">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Données isolées et sécurisées par PostgreSQL Row Level Security</span>
            </div>
          </CardFooter>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-600 py-2">
        © {new Date().getFullYear()} RestoOS Platform. Tous droits réservés.
      </footer>
    </div>
  );
}
