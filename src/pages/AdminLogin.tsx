import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Mail, Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        toast.success('Compte créé! ID: ' + data.user.id);
        toast.info('Copiez cet ID et donnez-le moi pour activer les droits admin');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du compte');
    }

    setLoading(false);
  };

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

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError || !roleData) {
        toast.error('Accès non autorisé. Votre ID: ' + data.user.id);
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      toast.success('Connexion réussie!');
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
            <h1 className="text-4xl font-display font-bold mb-2">
              <span className="text-amber-500">TWIN</span> Admin
            </h1>
            <p className="text-muted-foreground">
              {isSignUp ? 'Créer un compte administrateur' : 'Connectez-vous pour gérer votre restaurant'}
            </p>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@twinpizza.fr"
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

            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? 'Chargement...' : (isSignUp ? 'Créer le compte' : 'Se connecter')}
            </Button>
          </form>

          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setIsSignUp(!isSignUp)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {isSignUp ? 'Déjà un compte? Se connecter' : 'Créer un compte admin'}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour au site
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Accès réservé aux administrateurs Twin Pizza
        </p>
      </div>
    </div>
  );
}
