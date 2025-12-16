import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StoreStatus {
    isOpen: boolean;
    isPause: boolean;
    pauseMessage: string;
    isTempClosed: boolean;
    tempClosedUntil: string;
    tempClosedMessage: string;
    showBanner: boolean;
    bannerMessage: string;
    bannerType: 'info' | 'warning' | 'error';
}

interface SiteSettings {
    restaurantName: string;
    phoneNumber: string;
    whatsappNumber: string;
    address: string;
    email: string;
    heroTitle: string;
    heroSubtitle: string;
    minOrderDelivery: number;
    deliveryTime: string;
    freeDeliveryMin: number;
    closedMessage: string;
    orderSuccessMessage: string;
    facebookUrl: string;
    instagramUrl: string;
    googleMapsUrl: string;
}

const defaultStatus: StoreStatus = {
    isOpen: true,
    isPause: false,
    pauseMessage: 'Nous sommes en pause. Retour dans quelques minutes!',
    isTempClosed: false,
    tempClosedUntil: '',
    tempClosedMessage: 'Fermé exceptionnellement. Réouverture bientôt!',
    showBanner: false,
    bannerMessage: '',
    bannerType: 'info',
};

const defaultSettings: SiteSettings = {
    restaurantName: 'Twin Pizza',
    phoneNumber: '02 35 67 89 00',
    whatsappNumber: '33612345678',
    address: '60 Rue Georges Clemenceau, 76530 Grand-Couronne',
    email: 'contact@twinpizza.fr',
    heroTitle: 'Les Meilleures Pizzas de Grand-Couronne',
    heroSubtitle: 'Pizzas artisanales, tacos, soufflés et bien plus encore. Livraison rapide et gratuite!',
    minOrderDelivery: 12,
    deliveryTime: '20-35 min',
    freeDeliveryMin: 15,
    closedMessage: "Nous sommes actuellement fermés. Revenez pendant nos heures d'ouverture!",
    orderSuccessMessage: 'Merci pour votre commande! Nous vous contacterons bientôt.',
    facebookUrl: '',
    instagramUrl: '',
    googleMapsUrl: '',
};

export function useStoreStatus() {
    const [status, setStatus] = useState<StoreStatus>(defaultStatus);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatus();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('store-status-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'site_settings' },
                () => {
                    fetchStatus();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchStatus = async () => {
        try {
            const { data } = await supabase
                .from('site_settings' as any)
                .select('*')
                .like('key', 'store_%');

            if (data) {
                const settings = data as unknown as { key: string; value: string }[];
                const newStatus: Partial<StoreStatus> = {};

                settings.forEach(s => {
                    if (s.key === 'store_is_open') newStatus.isOpen = s.value === 'true';
                    if (s.key === 'store_is_pause') newStatus.isPause = s.value === 'true';
                    if (s.key === 'store_pause_message') newStatus.pauseMessage = s.value;
                    if (s.key === 'store_is_temp_closed') newStatus.isTempClosed = s.value === 'true';
                    if (s.key === 'store_temp_closed_until') newStatus.tempClosedUntil = s.value;
                    if (s.key === 'store_temp_closed_message') newStatus.tempClosedMessage = s.value;
                    if (s.key === 'store_show_banner') newStatus.showBanner = s.value === 'true';
                    if (s.key === 'store_banner_message') newStatus.bannerMessage = s.value;
                    if (s.key === 'store_banner_type') newStatus.bannerType = s.value as any;
                });

                setStatus({ ...defaultStatus, ...newStatus });
            }
        } catch (error) {
            console.error('Error fetching store status:', error);
        } finally {
            setLoading(false);
        }
    };

    // Check if store should be shown as closed
    const isStoreClosed = () => {
        if (status.isTempClosed) return true;
        if (!status.isOpen) return true;
        if (status.isPause) return true;
        return false;
    };

    // Get the appropriate closed message
    const getClosedMessage = () => {
        if (status.isTempClosed) {
            return status.tempClosedMessage || 'Fermé exceptionnellement';
        }
        if (status.isPause) {
            return status.pauseMessage || 'En pause';
        }
        return 'Nous sommes fermés';
    };

    return {
        status,
        loading,
        isStoreClosed: isStoreClosed(),
        closedMessage: getClosedMessage(),
        refetch: fetchStatus,
    };
}

export function useSiteSettings() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('site-settings-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'site_settings' },
                () => {
                    fetchSettings();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase
                .from('site_settings' as any)
                .select('*');

            if (data) {
                const rawSettings = data as unknown as { key: string; value: string }[];
                const newSettings: Partial<SiteSettings> = {};

                rawSettings.forEach(s => {
                    if (s.key === 'restaurant_name') newSettings.restaurantName = s.value;
                    if (s.key === 'phone_number') newSettings.phoneNumber = s.value;
                    if (s.key === 'whatsapp_number') newSettings.whatsappNumber = s.value;
                    if (s.key === 'address') newSettings.address = s.value;
                    if (s.key === 'email') newSettings.email = s.value;
                    if (s.key === 'hero_title') newSettings.heroTitle = s.value;
                    if (s.key === 'hero_subtitle') newSettings.heroSubtitle = s.value;
                    if (s.key === 'min_order_delivery') newSettings.minOrderDelivery = parseFloat(s.value) || 12;
                    if (s.key === 'delivery_time') newSettings.deliveryTime = s.value;
                    if (s.key === 'free_delivery_min') newSettings.freeDeliveryMin = parseFloat(s.value) || 15;
                    if (s.key === 'closed_message') newSettings.closedMessage = s.value;
                    if (s.key === 'order_success_message') newSettings.orderSuccessMessage = s.value;
                    if (s.key === 'facebook_url') newSettings.facebookUrl = s.value;
                    if (s.key === 'instagram_url') newSettings.instagramUrl = s.value;
                    if (s.key === 'google_maps_url') newSettings.googleMapsUrl = s.value;
                });

                setSettings({ ...defaultSettings, ...newSettings });
            }
        } catch (error) {
            console.error('Error fetching site settings:', error);
        } finally {
            setLoading(false);
        }
    };

    return {
        settings,
        loading,
        refetch: fetchSettings,
    };
}
