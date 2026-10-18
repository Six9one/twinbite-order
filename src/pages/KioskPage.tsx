import { useState, useEffect, useCallback, useRef } from 'react';
import { OrderProvider, useOrder } from '@/context/OrderContext';
import { useCreateOrder, generateOrderNumber, useDrinks } from '@/hooks/useSupabaseData';
import { useIminPrinter, KioskOrderData } from '@/hooks/useIminPrinter';
import { supabase } from '@/integrations/supabase/client';


// Kiosk screens
import { KioskWelcome } from '@/components/kiosk/KioskWelcome';
import { KioskOrderType } from '@/components/kiosk/KioskOrderType';
import { KioskNameInput } from '@/components/kiosk/KioskNameInput';
import { KioskCategories } from '@/components/kiosk/KioskCategories';
import { KioskCart } from '@/components/kiosk/KioskCart';
import { KioskUpsell } from '@/components/kiosk/KioskUpsell';
import { KioskSuccess } from '@/components/kiosk/KioskSuccess';
import { KioskPreloader } from '@/components/kiosk/KioskPreloader';

// Existing wizards — reused as-is
import { PizzaWizard } from '@/components/wizards/PizzaWizard';
import { SandwichWizard } from '@/components/wizards/SandwichWizard';
import { TacosWizard } from '@/components/wizards/TacosWizard';
import { TexMexWizard } from '@/components/wizards/TexMexWizard';
import { UnifiedProductWizard } from '@/components/wizards/UnifiedProductWizard';
import { SimpleProductWizard } from '@/components/wizards/SimpleProductWizard';
import { MilkshakeWizard } from '@/components/wizards/MilkshakeWizard';

// Data
import { crepes, gaufres, boissons, frites as staticFrites, croques as staticCroques } from '@/data/menu';
import { useProductsByCategory } from '@/hooks/useProducts';
import { calculateTVA, applyPizzaPromotions } from '@/utils/promotions';

type KioskScreen = 'welcome' | 'orderType' | 'name' | 'menu' | 'wizard' | 'processing' | 'success' | 'error';

function KioskContent() {
    const [screen, setScreen] = useState<KioskScreen>('welcome');
    const [orderType, setOrderTypeState] = useState<'surplace' | 'emporter'>('surplace');
    const [customerName, setCustomerName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [orderNumber, setOrderNumber] = useState('');
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    // Guards against a double tap on "Confirmer" creating two orders
    const submittingRef = useRef(false);
    const { setOrderType, cart, clearCart } = useOrder();
    const createOrder = useCreateOrder();
    const { initPrinter, printKioskTicket } = useIminPrinter();

    // Fetch product data for simple wizards
    const { data: dbFrites } = useProductsByCategory('frites');
    const { data: dbCrepes } = useProductsByCategory('crepes');
    const { data: dbGaufres } = useProductsByCategory('gaufres');
    const { data: dbBoissons } = useDrinks();
    const { data: dbCroques } = useProductsByCategory('croques');
    const { data: dbSalades } = useProductsByCategory('salades');

    // Convert DB products to MenuItem format
    const toMenuItems = (products: any[] | undefined, fallback: any[], category: string) => {
        if (products && products.length > 0) {
            return products.filter(p => p.is_active !== false).map((p: any) => {
                const lower = p.name.toLowerCase();
                const drinkHint = category === 'boissons'
                    ? (lower.includes('canette') ? 'Ex: Coca-Cola, Fanta, Sprite…' : lower.includes('bouteille') ? 'Ex: Coca 1.5L, eau gazeuse…' : '')
                    : '';
                return {
                    id: p.id,
                    name: p.name,
                    description: p.description || drinkHint,
                    price: p.base_price !== undefined ? Number(p.base_price) : Number(p.price),
                    category: p.category_slug || category,
                    imageUrl: p.image_url,
                };
            });
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
        if (screen !== 'welcome' && screen !== 'success' && screen !== 'processing' && screen !== 'error') {
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
        submittingRef.current = false;
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



    const handleConfirmOrder = () => {
        processOrder();
    };

    const processOrder = async () => {
        if (submittingRef.current || cart.length === 0) return;
        submittingRef.current = true;
        setScreen('processing');

        let orderSaved = false;
        try {
            // Generate order number
            const newOrderNumber = await generateOrderNumber();
            setOrderNumber(newOrderNumber);

            // Calculate totals with pizza promotion applied
            const pizzaItems = cart.filter(item => item.item.category === 'pizzas');
            const otherItems = cart.filter(item => item.item.category !== 'pizzas');
            const pizzaPromo = applyPizzaPromotions(pizzaItems, orderType);
            const otherTotal = otherItems.reduce((sum, item) =>
                sum + (item.calculatedPrice || item.item.price) * item.quantity, 0);
            const total = pizzaPromo.discountedTotal + otherTotal;
            const { ht, tva } = calculateTVA(total);

            // Create order in database
            await createOrder.mutateAsync({
                order_number: newOrderNumber,
                order_type: orderType,
                items: cart as any,
                customer_name: customerName.trim(),
                customer_phone: 'borne',
                customer_address: null,
                customer_notes: '[BORNE]',
                payment_method: 'especes' as any, // Pays at caisse (the ticket says "à régler en caisse" for kiosk orders)
                subtotal: ht,
                tva: tva,
                total: total,
                delivery_fee: 0,
                status: 'pending',
                is_scheduled: false,
                scheduled_for: null,
            });
            orderSaved = true;

            // Send Telegram notification (non-blocking: never delay the kiosk on a slow/failing function)
            supabase.functions.invoke('send-telegram-notification', {
                    body: {
                        orderNumber: newOrderNumber,
                        customerName: customerName.trim(),
                        customerPhone: 'Borne',
                        customerAddress: null,
                        customerNotes: '[BORNE]',
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
                            category: item.item.category,
                            customization: item.customization,
                        })),
                        isScheduled: false,
                        scheduledFor: null,
                        isKiosk: true,
                    },
                }).catch((telegramError) => {
                    console.error('[KIOSK] Telegram notification failed:', telegramError);
                });


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
            };
            printKioskTicket(printData);

            clearCart();
            setScreen('success');

        } catch (error) {
            console.error('[KIOSK] Order processing failed:', error);
            if (orderSaved) {
                // The order is in the database (it will print): don't lose the customer's number
                clearCart();
                setScreen('success');
            } else {
                // Nothing was saved: keep the cart and tell the customer
                submittingRef.current = false;
                setScreen('error');
            }
        }
    };

    // --- Wizard rendering ---
    const renderWizard = () => {
        if (!selectedCategory) return null;

        const wizardOnClose = () => {
            setSelectedCategory(null);
            setScreen('menu');
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
                        items={toMenuItems(dbFrites, staticFrites, 'frites')}
                        title="🍟 Frites"
                        onClose={wizardOnClose}
                    />
                );
            case 'crepes':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbCrepes, crepes, 'crepes')}
                        title="🥞 Crêpes"
                        onClose={wizardOnClose}
                    />
                );
            case 'gaufres':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbGaufres, gaufres, 'gaufres')}
                        title="🧇 Gaufres"
                        onClose={wizardOnClose}
                    />
                );
            case 'boissons':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbBoissons, boissons, 'boissons')}
                        title="🥤 Boissons"
                        onClose={wizardOnClose}
                    />
                );
            case 'croques':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbCroques, staticCroques, 'croques')}
                        title="🧀 Croques"
                        onClose={wizardOnClose}
                    />
                );
            case 'salades':
                return (
                    <SimpleProductWizard
                        items={toMenuItems(dbSalades, [], 'salades')}
                        title="🥗 Salades"
                        onClose={wizardOnClose}
                    />
                );
            default:
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


    if (screen === 'processing') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="w-20 h-20 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-6" />
                <p className="text-2xl text-white font-medium">Préparation de votre ticket...</p>
                <p className="text-lg text-white/50 mt-2">🖨️ Impression en cours</p>
            </div>
        );
    }

    if (screen === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center">
                <p className="text-5xl mb-6">⚠️</p>
                <p className="text-3xl text-white font-bold mb-3">La commande n'a pas pu être envoyée</p>
                <p className="text-xl text-white/60 mb-10">Votre panier est conservé. Réessayez ou adressez-vous à la caisse.</p>
                <div className="flex gap-4">
                    <button onClick={() => setScreen('menu')} className="px-8 h-14 rounded-2xl bg-white/10 text-white text-lg font-bold">Retour au panier</button>
                    <button onClick={processOrder} className="px-8 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-lg font-bold">Réessayer</button>
                </div>
            </div>
        );
    }

    if (screen === 'success') {
        return (
            <KioskSuccess
                orderNumber={orderNumber}
                customerName={customerName}
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
            <KioskPreloader />
            <KioskContent />
        </OrderProvider>
    );
}
