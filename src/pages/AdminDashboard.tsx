import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Pizza, LogOut, Menu as MenuIcon, Package, MapPin, Settings, Home, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { menuItems as initialMenuItems, deliveryZones as initialZones, categoryLabels } from '@/data/menu';
import { toast } from 'sonner';

type AdminTab = 'menu' | 'zones' | 'orders';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [zones, setZones] = useState(initialZones);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  useEffect(() => {
    const isAuth = sessionStorage.getItem('adminAuth');
    if (!isAuth) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuth');
    navigate('/admin');
  };

  const handleDeleteItem = (id: string) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
    toast.success('Article supprimé');
  };

  const handleUpdatePrice = (id: string, newPrice: number) => {
    setMenuItems(menuItems.map(item => 
      item.id === id ? { ...item, price: newPrice } : item
    ));
    setEditingItem(null);
    toast.success('Prix mis à jour');
  };

  const handleUpdateZone = (id: string, field: string, value: number) => {
    setZones(zones.map(zone =>
      zone.id === id ? { ...zone, [field]: value } : zone
    ));
    toast.success('Zone mise à jour');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Pizza className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">Admin Panel</h1>
              <span className="text-xs text-muted-foreground">Twin Pizza</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Site</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'menu' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            <MenuIcon className="w-4 h-4" />
            Menu
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'zones' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Zones
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'orders' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            <Package className="w-4 h-4" />
            Commandes
          </button>
        </div>

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Gestion du Menu</h2>
              <Button className="btn-primary gap-2">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium">Article</th>
                      <th className="text-left p-4 text-sm font-medium">Catégorie</th>
                      <th className="text-left p-4 text-sm font-medium">Prix</th>
                      <th className="text-right p-4 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map((item) => (
                      <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-muted rounded text-xs">
                            {categoryLabels[item.category]}
                          </span>
                        </td>
                        <td className="p-4">
                          {editingItem === item.id ? (
                            <Input
                              type="number"
                              step="0.5"
                              defaultValue={item.price}
                              className="w-20"
                              onBlur={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdatePrice(item.id, parseFloat((e.target as HTMLInputElement).value));
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold text-primary">{item.price.toFixed(2)} €</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingItem(item.id)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Zones Tab */}
        {activeTab === 'zones' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Zones de Livraison</h2>
              <Button className="btn-primary gap-2">
                <Plus className="w-4 h-4" />
                Ajouter Zone
              </Button>
            </div>

            <div className="grid gap-4">
              {zones.map((zone) => (
                <div key={zone.id} className="bg-card rounded-xl p-5 border border-border">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg">{zone.name}</h3>
                    </div>
                    <span className="text-sm text-muted-foreground">{zone.estimatedTime}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Commande min. (€)</label>
                      <Input
                        type="number"
                        value={zone.minOrder}
                        onChange={(e) => handleUpdateZone(zone.id, 'minOrder', parseFloat(e.target.value))}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Frais livraison (€)</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={zone.deliveryFee}
                        onChange={(e) => handleUpdateZone(zone.id, 'deliveryFee', parseFloat(e.target.value))}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in">
            <h2 className="font-display text-xl font-bold mb-4">Commandes</h2>
            
            <div className="bg-card rounded-xl p-8 border border-border text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Aucune commande</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Les commandes apparaîtront ici une fois que les clients passeront commande.
              </p>
              <p className="text-xs text-muted-foreground">
                Connectez Supabase pour activer le système de commandes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
