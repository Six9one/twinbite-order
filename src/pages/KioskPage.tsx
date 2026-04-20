import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { useLoyalty } from '@/context/LoyaltyContext';
import { useCreateOrder, generateOrderNumber } from '@/hooks/useSupabaseData';
import { useIminPrinter, KioskOrderData } from '@/hooks/useIminPrinter';
import { useNetworkPrinter } from '@/hooks/useNetworkPrinter';
import { supabase } from '@/integrations/supabase/client';


// Kiosk screens
import { KioskWelcome } from '@/components/kiosk/KioskWelcome';
import { KioskOrderType } from '@/components/kiosk/KioskOrderType';
import { KioskNameInput } from '@/components/kiosk/KioskNameInput';
import { KioskCategories } from '@/components/kiosk/KioskCategories';
import { KioskCart } from '@/components/kiosk/KioskCart';
import { KioskUpsell } from '@/components/kiosk/KioskUpsell';
import { KioskLoyalty } from '@/components/kiosk/KioskLoyalty';
import { KioskSuccess } from '@/components/kiosk/KioskSuccess';

// Existing wizards — reused as-is
import { PizzaWizard } from '@/components/wizards/PizzaWizard';
import { SandwichWizard } from '@/components/wizards/SandwichWizard';
import { TacosWizard } from '@/components/wizards/TacosWizard';
import { TexMexWizard } from '@/components/wizards/TexMexWizard';
import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';
import { SimpleProductWizard } from '@/components/wizards/SimpleProductWizard';
import { MilkshakeWizard } from '@/components/wizards/MilkshakeWizard';

// Data
import { crepes, gaufres, boissons, frites as staticFrites } from '@/data/menu';
import { useProductsByCategory } from '@/hooks/useProducts';
import { calculateTVA } from '@/utils/promotions';

type KioskScreen = 'welcome' | 'orderType' | 'name' | 'menu' | 'wizard' | 'upsell' | 'loyalty' | 'processing' | 'success';

function KioskContent() {
    const [screen, setScreen] = useState<KioskScreen>('welcome');
    const [orderType, setOrderTypeState] = useState<'surplace' | 'emporter'>('surplace');
    const [customerName, setCustomerName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [orderNumber, setOrderNumber] = useState('');
    const [loyaltyPhone, setLoyaltyPhone] = useState<string | null>(null);
    const [stampsEarned, setStampsEarned] = useState(0);
    const [totalStamps, setTotalStamps] = useState(0);
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [showUpsellAfterWizard, setShowUpsellAfterWizard] = useState(false);

    const { setOrderType, cart, clearCart, getTotal, getItemCount } = useOrder();
    const { findOrCreateCustomer, addStamps: loyaltyAddStamps } = useLoyalty();
    const createOrder = useCreateOrder();
    const { initPrinter, printKioskTicket } = useIminPrinter();
    const { printOrder: networkPrintOrder } = useNetworkPrinter();

    // Fetch product data for simple wizards
    const { data: dbFrites } = useProductsByCategory('frites');
    const { data: dbCrepes } = useProductsByCategory('crepes');
    const { data: dbGaufres } = useProductsByCategory('gaufres');
    const { data: dbBoissons } = useProductsByCategory('boissons');

    // Convert DB products to MenuItem format
    const toMenuItems = (products: any[] | undefined, fallback: any[]) => {
        if (products && products.length > 0) {
            return products.filter(p => p.is_active).map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                price: p.base_price,
                category: p.category_slug,
                imageUrl: p.image_url,
            }));
        }
        return fallback;
    };

    // Initialize kiosk mode on mount: fullscreen, hide cursor, swap manifest, init printer
    useEffect(() => {
        initPrinter();

        // Swap PWA manifest to kiosk-specific one (fullscreen + landscape)
        const existingManifest = document.querySelector('link[rel="manifest"]');
        if (existingManifest) {
            existingManifest.setAttribute('href', '/kiosk-manifest.json');
        } else {
            const link = document.createElement('link');
            link.rel = 'manifest';
            link.href = '/kiosk-manifest.json';
            document.head.appendChild(link);
        }

        // Set meta tags for fullscreen kiosk
        const setMeta = (name: string, content: string) => {
            let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = name;
                document.head.appendChild(meta);
            }
            meta.content = content;
        };
        setMeta('apple-mobile-web-app-capable', 'yes');
        setMeta('mobile-web-app-capable', 'yes');
        setMeta('apple-mobile-web-app-status-bar-style', 'black');

        // Hide cursor after 3 seconds of no movement (kiosk mode)
        let cursorTimeout: NodeJS.Timeout;
        const hideCursor = () => {
            document.body.style.cursor = 'none';
        };
        const showCursor = () => {
            document.body.style.cursor = 'default';
            clearTimeout(cursorTimeout);
            cursorTimeout = setTimeout(hideCursor, 3000);
        };
        window.addEventListener('mousemove', showCursor);
        cursorTimeout = setTimeout(hideCursor, 3000);

        // Request fullscreen automatically on first touch
        const requestFullscreen = () => {
            const el = document.documentElement;
            if (el.requestFullscreen && !document.fullscreenElement) {
                el.requestFullscreen().catch(() => {});
            } else if ((el as any).webkitRequestFullscreen && !(document as any).webkitFullscreenElement) {
                (el as any).webkitRequestFullscreen();
            }
            // Only try once
            window.removeEventListener('touchstart', requestFullscreen);
            window.removeEventListener('click', requestFullscreen);
        };
        window.addEventListener('touchstart', requestFullscreen, { once: true });
        window.addEventListener('click', requestFullscreen, { once: true });

        // Prevent pull-to-refresh and zoom gestures on mobile
        document.body.style.overscrollBehavior = 'none';
        document.body.style.touchAction = 'manipulation';

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', showCursor);
            window.removeEventListener('touchstart', requestFullscreen);
            window.removeEventListener('click', requestFullscreen);
            clearTimeout(cursorTimeout);
            document.body.style.cursor = 'default';
            document.body.style.overscrollBehavior = '';
            document.body.style.touchAction = '';
            // Restore original manifest
            if (existingManifest) {
                existingManifest.setAttribute('href', '/manifest.json');
            }
        };
    }, []);

    // Inactivity timeout — reset to welcome after 90s of no interaction on menu/wizard screens
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        if (screen !== 'welcome' && screen !== 'success' && screen !== 'processing') {
            inactivityTimerRef.current = setTimeout(() => {
                handleFullReset();
            }, 90000); // 90 seconds
        }
    }, [screen]);

    useEffect(() => {
        resetInactivityTimer();

        const handleActivity = () => resetInactivityTimer();
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('click', handleActivity);

        return () => {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('click', handleActivity);
        };
    }, [resetInactivityTimer]);

    const handleFullReset = () => {
        clearCart();
        setScreen('welcome');
        setOrderTypeState('surplace');
        setCustomerName('');
        setSelectedCategory(null);
        setOrderNumber('');
        setLoyaltyPhone(null);
        setStampsEarned(0);
        setTotalStamps(0);
        setShowUpsellAfterWizard(false);
    };

    // --- Flow handlers ---

    const handleStart = () => {
        setScreen('orderType');
    };

    const handleOrderTypeSelect = (type: 'surplace' | 'emporter') => {
        setOrderTypeState(type);
        setOrderType(type);
        setScreen('name');
    };

    const handleNameSubmit = (name: string) => {
        setCustomerName(name);
        setScreen('menu');
    };

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setScreen('wizard');
    };

    const handleWizardClose = () => {
        setSelectedCategory(null);
        // Show upsell after adding first item, then back to menu
        if (getItemCount() > 0 && showUpsellAfterWizard) {
            setScreen('upsell');
            setShowUpsellAfterWizard(false);
        } else {
            setScreen('menu');
        }
    };

    // After wizard adds an item, trigger upsell next time
    const handleWizardCloseWithUpsell = () => {
        setSelectedCategory(null);
        setShowUpsellAfterWizard(false);
        setScreen('upsell');
    };

    const handleUpsellAdd = (category: string) => {
        setSelectedCategory(category);
        setScreen('wizard');
    };

    const handleUpsellSkip = () => {
        setScreen('menu');
    };

    const handleConfirmOrder = () => {
        setScreen('loyalty');
    };

    const handleLoyaltyComplete = async (phone: string | null, stamps: number, total: number) => {
        setLoyaltyPhone(phone);
        setStampsEarned(stamps);
        setTotalStamps(total);
        await processOrder(phone, stamps, total);
    };

    const handleLoyaltySkip = async () => {
        await processOrder(null, 0, 0);
    };

    const processOrder = async (phone: string | null, stamps: number, totalStampsVal: number) => {
        setScreen('processing');

        try {
            // Generate order number
            const newOrderNumber = await generateOrderNumber();
            setOrderNumber(newOrderNumber);

            // Calculate totals
            const total = getTotal();
            const { ht, tva } = calculateTVA(total);

            // Create order in database
            await createOrder.mutateAsync({
                order_number: newOrderNumber,
                order_type: orderType,
                items: cart as any,
                customer_name: customerName.trim(),
                customer_phone: phone || 'borne',
                customer_address: null,
                customer_notes: `[BORNE] ${orderType === 'surplace' ? 'Sur Place' : 'À Emporter'}`,
                payment_method: 'especes' as any, // Pays at caisse
                subtotal: ht,
                tva: tva,
                total: total,
                delivery_fee: 0,
                status: 'pending',
                is_scheduled: false,
                scheduled_for: null,
            });

            // Send Telegram notification
            try {
                await supabase.functions.invoke('send-telegram-notification', {
                    body: {
                        orderNumber: newOrderNumber,
                        customerName: customerName.trim(),
                        customerPhone: phone || 'Borne',
                        customerAddress: null,
                        customerNotes: `[BORNE] ${orderType === 'surplace' ? 'Sur Place' : 'À Emporter'}`,
                        orderType: orderType,
                        paymentMethod: 'A la caisse',
                        total: total,
                        subtotal: ht,
                        tva: tva,
                        deliveryFee: 0,
                        items: cart.map(item => ({
                            name: item.item.name,
                            quantity: item.quantity,
                            price: item.calculatedPrice || item.item.price,
                            customization: item.customization,
                        })),
                        isScheduled: false,
                        scheduledFor: null,
                        stampsEarned: stamps,
                        totalStamps: totalStampsVal,
                        freeItemsAvailable: Math.floor(totalStampsVal / 10),
                        isKiosk: true,
                    },
                });
            } catch (telegramError) {
                console.error('[KIOSK] Telegram notification failed:', telegramError);
            }

            // Send WhatsApp if loyalty phone provided
            if (phone) {
                try {
                    const itemsList = cart.map(item =>
                        `${item.quantity}x ${item.item.name} - ${((item.calculatedPrice || item.item.price) * item.quantity).toFixed(2)}€`
                    ).join('\n');

                    const whatsappText = encodeURIComponent(
                        `🍕 *Twin Pizza - Commande Borne #${newOrderNumber}*\n\n` +
                        `${itemsList}\n\n` +
                        `💰 *Total: ${total.toFixed(2)}€*\n\n` +
                        (stamps > 0 ? `🎁 Fidélité: +${stamps} tampon${stamps > 1 ? 's' : ''}\n` : '') +
                        `\nMerci ${customerName} et bon appétit! 🍕`
                    );

                    // Use WhatsApp API
                    const cleanPhone = phone.replace(/\s/g, '').replace(/^0/, '33');
                    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappText}`;

                    // For kiosk, we send via server-side/API if available, or just log
                    console.log('[KIOSK] WhatsApp URL:', whatsappUrl);
                } catch (waError) {
                    console.error('[KIOSK] WhatsApp failed:', waError);
                }
            }

            // Print ticket
            const printData: KioskOrderData = {
                orderNumber: newOrderNumber,
                customerName: customerName.trim(),
                orderType: orderType,
                items: cart.map(item => ({
                    name: item.item.name,
                    quantity: item.quantity,
                    price: item.calculatedPrice || item.item.price,
                    customization: item.customization,
                })),
                total: total,
                subtotal: ht,
                tva: tva,
                loyaltyPhone: phone || undefined,
                stampsEarned: stamps,
                totalStamps: totalStampsVal,
            };
            printKioskTicket(printData);

            // Also trigger the network print server (electron app auto-prints via Supabase realtime,
            // but we also explicitly call print-order edge function as backup)
            try {
                await supabase.functions.invoke('print-order', {
                    body: {
                        order: {
                            id: `kiosk-${Date.now()}`,
                            order_number: newOrderNumber,
                            order_type: orderType,
                            status: 'pending',
                            customer_name: customerName.trim(),
                            customer_phone: phone || 'Borne',
                            customer_notes: `[BORNE] ${orderType === 'surplace' ? 'Sur Place' : 'À Emporter'}`,
                            items: cart.map(item => ({
                                name: item.item.name,
                                quantity: item.quantity,
                                totalPrice: (item.calculatedPrice || item.item.price) * item.quantity,
                                customization: item.customization,
                            })),
                            subtotal: ht,
                            tva: tva,
                            delivery_fee: 0,
                            total: total,
                            payment_method: 'especes',
                            created_at: new Date().toISOString(),
                            stampsEarned: stamps,
                            totalStamps: totalStampsVal,
                            isKiosk: true,
                        },
                    },
                });
                console.log('[KIOSK] Print server notified via edge function');
            } catch (printServerError) {
                console.warn('[KIOSK] Print server edge function failed (order still in DB for auto-print):', printServerError);
            }

            clearCart();
            setScreen('success');

        } catch (error) {
            console.error('[KIOSK] Order processing failed:', error);
            // Still show success if we got an order number
            if (orderNumber) {
                setScreen('success');
            } else {
                // Critical failure - reset
                handleFullReset();
            }
        }
    };

    // --- Wizard rendering ---
    const renderWizard = () => {
        if (!selectedCategory) return null;

        const wizardOnClose = () => {
            // If items were added (cart changed), go to upsell
            const currentCount = getItemCount();
            setSelectedCategory(null);
            if (currentCount > 0) {
                setScreen('upsell');
            } else {
                setScreen('menu');
            }
        };

        switch (selectedCategory) {
            case 'pizzas':
                return <PizzaWizard onClose={wizardOnClose} />;
            case 'sandwiches':
                return <SandwichWizard onClose={wizardOnClose} />;
            case 'tacos':
                return <TacosWizard onClose={wizardOnClose} />;
            case 'texmex':
                return <TexMexWizard onClose={wizardOnClose} />;
            case 'soufflets':
                return <UnifiedProductWizard productType="soufflet" onClose={wizardOnClose} />;
            case 'makloub':
                return <UnifiedProductWizard productType="makloub" onClose={wizardOnClose} />;
            case 'mlawi':
                return <UnifiedProductWizard productType="mlawi" onClose={wizardOnClose} />;
            case 'panini':
                return <UnifiedProductWizard productType="panini" onClose={wizardOnClose} />;
            case 'milkshakes':
                return <MilkshakeWizard onClose={wizardOnClose} />;
            case 'frites':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbFrites, staticFrites)}
                        title="🍟 Frites"
                        onClose={wizardOnClose}
                    />
                );
            case 'crepes':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbCrepes, crepes)}
                        title="🥞 Crêpes"
                        onClose={wizardOnClose}
                    />
                );
            case 'gaufres':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbGaufres, gaufres)}
                        title="🧇 Gaufres"
                        onClose={wizardOnClose}
                    />
                );
            case 'boissons':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbBoissons, boissons)}
                        title="🥤 Boissons"
                        onClose={wizardOnClose}
                    />
                );
            case 'croques':
                return <UnifiedProductWizard productType="croques" onClose={wizardOnClose} />;
            default:
                // Fallback: go back to menu
                setScreen('menu');
                return null;
        }
    };

    // --- Screen rendering ---

    // Full-screen screens (no cart sidebar)
    if (screen === 'welcome') {
        return <KioskWelcome onStart={handleStart} />;
    }

    if (screen === 'orderType') {
        return <KioskOrderType onSelect={handleOrderTypeSelect} onBack={() => setScreen('welcome')} />;
    }

    if (screen === 'name') {
        return <KioskNameInput onSubmit={handleNameSubmit} onBack={() => setScreen('orderType')} />;
    }

    if (screen === 'loyalty') {
        return (
            <KioskLoyalty
                onComplete={handleLoyaltyComplete}
                onSkip={handleLoyaltySkip}
                cartItems={cart}
            />
        );
    }

    if (screen === 'processing') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="w-20 h-20 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-6" />
                <p className="text-2xl text-white font-medium">Préparation de votre ticket...</p>
                <p className="text-lg text-white/50 mt-2">🖨️ Impression en cours</p>
            </div>
        );
    }

    if (screen === 'success') {
        return (
            <KioskSuccess
                orderNumber={orderNumber}
                customerName={customerName}
                stampsEarned={stampsEarned}
                totalStamps={totalStamps}
                onReset={handleFullReset}
            />
        );
    }

    // Landscape split layout: left = content, right = cart
    return (
        <div className="h-screen flex bg-gradient-to-br from-slate-900 to-slate-800 overflow-hidden">
            {/* Left panel: content */}
            <div className="flex-1 overflow-y-auto">
                {screen === 'menu' && (
                    <KioskCategories
                        onSelectCategory={handleCategorySelect}
                        onBack={() => setScreen('name')}
                    />
                )}
                {screen === 'wizard' && renderWizard()}
                {screen === 'upsell' && (
                    <KioskUpsell
                        onAddItem={handleUpsellAdd}
                        onSkip={handleUpsellSkip}
                    />
                )}
            </div>

            {/* Right panel: cart sidebar */}
            <div className="w-80 xl:w-96 flex-shrink-0">
                <KioskCart
                    customerName={customerName}
                    orderType={orderType}
                    onConfirm={handleConfirmOrder}
                />
            </div>
        </div>
    );
}

// Main page with providers
export default function KioskPage() {
    return (
        <OrderProvider>
            <KioskContent />
        </OrderProvider>
    );
}
