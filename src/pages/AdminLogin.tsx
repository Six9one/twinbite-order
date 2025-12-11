import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pizza, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Note: This is a demo login. In production, use proper authentication with Supabase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Demo credentials - in production, validate against Supabase
    if (credentials.username === 'admin' && credentials.password === 'twinpizza2024') {
      sessionStorage.setItem('adminAuth', 'true');
      toast.success('Connexion réussie');
      navigate('/admin/dashboard');
    } else {
      toast.error('Identifiants incorrects');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Pizza className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">Admin Twin Pizza</h1>
          <p className="text-muted-foreground mt-2">Connectez-vous pour accéder au panneau d'administration</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card rounded-2xl p-8 shadow-lg border border-border">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nom d'utilisateur</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="admin"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-primary py-3 rounded-xl font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Demo: admin / twinpizza2024
          </p>
        </form>

        <p className="text-center mt-6">
          <a href="/" className="text-sm text-primary hover:underline">
            ← Retour au site
          </a>
        </p>
      </div>
    </div>
  );
}
