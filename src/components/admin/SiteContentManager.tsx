import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Save, Globe, Phone, MapPin, Clock, MessageSquare, Image, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SiteSettings {
    id?: string;
    key: string;
    value: string;
    category: string;
}

const defaultSettings: Record<string, string> = {
    // Contact
    'restaurant_name': 'Twin Pizza',
    'phone_number': '02 35 67 89 00',
    'whatsapp_number': '33612345678',
    'address': '60 Rue Georges Clemenceau, 76530 Grand-Couronne',
    'email': 'contact@twinpizza.fr',

    // Social
    'facebook_url': '',
    'instagram_url': '',
    'google_maps_url': '',

    // Hero Section
    'hero_title': 'Les Meilleures Pizzas de Grand-Couronne',
    'hero_subtitle': 'Pizzas artisanales, tacos, soufflés et bien plus encore. Livraison rapide et gratuite!',

    // Delivery
    'min_order_delivery': '12',
    'delivery_time': '20-35 min',
    'free_delivery_min': '15',

    // Messages
    'closed_message': 'Nous sommes actuellement fermés. Revenez pendant nos heures d\'ouverture!',
    'order_success_message': 'Merci pour votre commande! Nous vous contacterons bientôt.',
};

export function SiteContentManager() {
    const [settings, setSettings] = useState<Record<string, string>>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('site_settings' as any)
                .select('*');

            if (!error && data) {
                const settingsMap: Record<string, string> = { ...defaultSettings };
                (data as unknown as SiteSettings[]).forEach(setting => {
                    settingsMap[setting.key] = setting.value;
                });
                setSettings(settingsMap);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Upsert all settings
            const upsertData = Object.entries(settings).map(([key, value]) => ({
                key,
                value,
                category: getCategoryForKey(key),
            }));

            for (const item of upsertData) {
                await supabase
                    .from('site_settings' as any)
                    .upsert(item, { onConflict: 'key' });
            }

            toast.success('Paramètres sauvegardés!');
        } catch (error) {
            toast.error('Erreur lors de la sauvegarde');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const getCategoryForKey = (key: string): string => {
        if (key.includes('phone') || key.includes('address') || key.includes('email') || key.includes('name')) return 'contact';
        if (key.includes('facebook') || key.includes('instagram') || key.includes('google')) return 'social';
        if (key.includes('hero')) return 'hero';
        if (key.includes('delivery') || key.includes('order') || key.includes('min')) return 'delivery';
        return 'messages';
    };

    const updateSetting = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Globe className="w-6 h-6 text-amber-500" />
                    Contenu du Site
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchSettings}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualiser
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder tout'}
                    </Button>
                </div>
            </div>

            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
                <p className="text-sm">
                    💡 <strong>Astuce:</strong> Modifiez le contenu ici et cliquez sur "Sauvegarder tout".
                    Les changements apparaîtront sur le site immédiatement, sans besoin de déployer.
                </p>
            </Card>

            <Tabs defaultValue="contact" className="space-y-4">
                <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="contact">
                        <Phone className="w-4 h-4 mr-2" />
                        Contact
                    </TabsTrigger>
                    <TabsTrigger value="hero">
                        <Image className="w-4 h-4 mr-2" />
                        Accueil
                    </TabsTrigger>
                    <TabsTrigger value="delivery">
                        <MapPin className="w-4 h-4 mr-2" />
                        Livraison
                    </TabsTrigger>
                    <TabsTrigger value="social">
                        <Globe className="w-4 h-4 mr-2" />
                        Réseaux
                    </TabsTrigger>
                    <TabsTrigger value="messages">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Messages
                    </TabsTrigger>
                </TabsList>

                {/* Contact Tab */}
                <TabsContent value="contact" className="space-y-4">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold">Informations de contact</h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nom du restaurant</Label>
                                <Input
                                    value={settings.restaurant_name}
                                    onChange={(e) => updateSetting('restaurant_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Numéro de téléphone</Label>
                                <Input
                                    value={settings.phone_number}
                                    onChange={(e) => updateSetting('phone_number', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Numéro WhatsApp (format: 33612345678)</Label>
                                <Input
                                    value={settings.whatsapp_number}
                                    onChange={(e) => updateSetting('whatsapp_number', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => updateSetting('email', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Adresse complète</Label>
                            <Textarea
                                value={settings.address}
                                onChange={(e) => updateSetting('address', e.target.value)}
                                rows={2}
                            />
                        </div>
                    </Card>
                </TabsContent>

                {/* Hero Tab */}
                <TabsContent value="hero" className="space-y-4">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold">Section d'accueil (Hero)</h3>

                        <div className="space-y-2">
                            <Label>Titre principal</Label>
                            <Input
                                value={settings.hero_title}
                                onChange={(e) => updateSetting('hero_title', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Sous-titre / Description</Label>
                            <Textarea
                                value={settings.hero_subtitle}
                                onChange={(e) => updateSetting('hero_subtitle', e.target.value)}
                                rows={3}
                            />
                        </div>
                    </Card>
                </TabsContent>

                {/* Delivery Tab */}
                <TabsContent value="delivery" className="space-y-4">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold">Paramètres de livraison</h3>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Commande minimum (€)</Label>
                                <Input
                                    type="number"
                                    value={settings.min_order_delivery}
                                    onChange={(e) => updateSetting('min_order_delivery', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Temps de livraison</Label>
                                <Input
                                    value={settings.delivery_time}
                                    onChange={(e) => updateSetting('delivery_time', e.target.value)}
                                    placeholder="ex: 20-35 min"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Livraison gratuite à partir de (€)</Label>
                                <Input
                                    type="number"
                                    value={settings.free_delivery_min}
                                    onChange={(e) => updateSetting('free_delivery_min', e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Social Tab */}
                <TabsContent value="social" className="space-y-4">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold">Réseaux sociaux</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Lien Facebook</Label>
                                <Input
                                    value={settings.facebook_url}
                                    onChange={(e) => updateSetting('facebook_url', e.target.value)}
                                    placeholder="https://facebook.com/twinpizza"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lien Instagram</Label>
                                <Input
                                    value={settings.instagram_url}
                                    onChange={(e) => updateSetting('instagram_url', e.target.value)}
                                    placeholder="https://instagram.com/twinpizza"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lien Google Maps</Label>
                                <Input
                                    value={settings.google_maps_url}
                                    onChange={(e) => updateSetting('google_maps_url', e.target.value)}
                                    placeholder="https://maps.google.com/..."
                                />
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* Messages Tab */}
                <TabsContent value="messages" className="space-y-4">
                    <Card className="p-4 space-y-4">
                        <h3 className="font-semibold">Messages personnalisés</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Message quand fermé</Label>
                                <Textarea
                                    value={settings.closed_message}
                                    onChange={(e) => updateSetting('closed_message', e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Message après commande</Label>
                                <Textarea
                                    value={settings.order_success_message}
                                    onChange={(e) => updateSetting('order_success_message', e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
