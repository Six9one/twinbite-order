import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { Lock, Mail, Eye, EyeOff, ArrowLeft, Store } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { tenant, setTenant } = useTenant();
  const { name } = useTenantSettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error('Email ou mot de passe incorrect');
        setLoading(false);
        return;
      }

      // Check user roles and tenant association
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        toast.error('Accès non autorisé. Votre ID: ' + data.user.id);
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // If user has a tenant_id specified in user_roles, bind session to that tenant
      if ((roleData as any)?.tenant_id) {
        const { data: userTenant } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', (roleData as any).tenant_id)
          .single();

        if (userTenant) {
          setTenant(userTenant as any);
        }
      }

      toast.success(`Connexion réussie! Bienvenue sur le back-office de ${tenant.name}`);
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Erreur de connexion');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl p-8 border">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-500">
              <Store className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-1">
              <span className="text-amber-500">{name}</span> Admin
            </h1>
            <p className="text-muted-foreground text-sm">
              Connectez-vous pour gérer votre établissement
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Administrateur
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={`admin@${tenant.slug}.fr`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold" disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au site client
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Accès sécurisé réservé aux administrateurs de {name} — Propulsé par RestoOS SaaS
        </p>
      </div>
    </div>
  );
}

