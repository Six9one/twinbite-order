import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'en';

interface Translations {
    [key: string]: string;
}

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = {
    fr: {
        // Navigation & General
        'app.name': 'Twin Pizza',
        'app.tagline': 'Pizzeria & Fast Food',
        'nav.menu': 'Menu',
        'nav.cart': 'Panier',
        'nav.account': 'Compte',
        'nav.loyalty': 'Fidélité',

        // Order Types
        'order.takeaway': 'À emporter',
        'order.delivery': 'Livraison',
        'order.dineIn': 'Sur place',
        'order.selectType': 'Comment souhaitez-vous commander ?',

        // Categories
        'category.pizzas': 'Pizzas',
        'category.tacos': 'Tacos',
        'category.soufflets': 'Soufflets',
        'category.makloub': 'Makloub',
        'category.mlawi': 'Mlawi',
        'category.panini': 'Panini',
        'category.croques': 'Croques',
        'category.texmex': 'Tex-Mex',
        'category.frites': 'Frites',
        'category.boissons': 'Boissons',
        'category.milkshakes': 'Milkshakes',
        'category.crepes': 'Crêpes',
        'category.gaufres': 'Gaufres',
        'category.salades': 'Salades',

        // Cart
        'cart.empty': 'Votre panier est vide',
        'cart.total': 'Total',
        'cart.subtotal': 'Sous-total',
        'cart.tva': 'TVA (10%)',
        'cart.checkout': 'Commander',
        'cart.continue': 'Continuer les achats',
        'cart.remove': 'Supprimer',
        'cart.add': 'Ajouter au panier',

        // Checkout
        'checkout.title': 'Finaliser la commande',
        'checkout.info': 'Vos informations',
        'checkout.payment': 'Paiement',
        'checkout.confirm': 'Confirmation',
        'checkout.name': 'Nom',
        'checkout.phone': 'Téléphone',
        'checkout.address': 'Adresse de livraison',
        'checkout.notes': 'Notes (optionnel)',
        'checkout.paymentMethod': 'Mode de paiement',
        'checkout.card': 'Carte Bancaire',
        'checkout.cash': 'Espèces',
        'checkout.online': 'Payer maintenant',
        'checkout.confirmOrder': 'Confirmer la commande',
        'checkout.success': 'Commande Confirmée!',
        'checkout.thankYou': 'Merci pour votre commande!',

        // Loyalty
        'loyalty.title': 'Programme Fidélité',
        'loyalty.points': 'Points',
        'loyalty.earn': 'Gagnez 1 point par euro dépensé',
        'loyalty.redeem': 'Échanger mes points',
        'loyalty.history': 'Historique',
        'loyalty.rewards': 'Récompenses',
        'loyalty.free_pizza': 'Pizza Gratuite',
        'loyalty.free_drink': 'Boisson Gratuite',
        'loyalty.discount_5': 'Réduction 5€',
        'loyalty.discount_10': 'Réduction 10€',


        // Common
        'common.loading': 'Chargement...',
        'common.error': 'Erreur',
        'common.success': 'Succès',
        'common.cancel': 'Annuler',
        'common.save': 'Enregistrer',
        'common.close': 'Fermer',
        'common.back': 'Retour',
        'common.next': 'Suivant',
        'common.search': 'Rechercher...',

        // PWA
        'pwa.install': 'Installer l\'application',
        'pwa.installDesc': 'Installez Twin Pizza pour un accès rapide!',
        'pwa.installBtn': 'Installer',
        'pwa.notNow': 'Plus tard',
    },

    en: {
        // Navigation & General
        'app.name': 'Twin Pizza',
        'app.tagline': 'Pizzeria & Fast Food',
        'nav.menu': 'Menu',
        'nav.cart': 'Cart',
        'nav.account': 'Account',
        'nav.loyalty': 'Loyalty',

        // Order Types
        'order.takeaway': 'Takeaway',
        'order.delivery': 'Delivery',
        'order.dineIn': 'Dine In',
        'order.selectType': 'How would you like to order?',

        // Categories
        'category.pizzas': 'Pizzas',
        'category.tacos': 'Tacos',
        'category.soufflets': 'Soufflets',
        'category.makloub': 'Makloub',
        'category.mlawi': 'Mlawi',
        'category.panini': 'Panini',
        'category.croques': 'Croques',
        'category.texmex': 'Tex-Mex',
        'category.frites': 'Fries',
        'category.boissons': 'Drinks',
        'category.milkshakes': 'Milkshakes',
        'category.crepes': 'Crepes',
        'category.gaufres': 'Waffles',
        'category.salades': 'Salads',

        // Cart
        'cart.empty': 'Your cart is empty',
        'cart.total': 'Total',
        'cart.subtotal': 'Subtotal',
        'cart.tva': 'VAT (10%)',
        'cart.checkout': 'Checkout',
        'cart.continue': 'Continue Shopping',
        'cart.remove': 'Remove',
        'cart.add': 'Add to Cart',

        // Checkout
        'checkout.title': 'Complete Order',
        'checkout.info': 'Your Information',
        'checkout.payment': 'Payment',
        'checkout.confirm': 'Confirmation',
        'checkout.name': 'Name',
        'checkout.phone': 'Phone',
        'checkout.address': 'Delivery Address',
        'checkout.notes': 'Notes (optional)',
        'checkout.paymentMethod': 'Payment Method',
        'checkout.card': 'Credit Card',
        'checkout.cash': 'Cash',
        'checkout.online': 'Pay Now',
        'checkout.confirmOrder': 'Confirm Order',
        'checkout.success': 'Order Confirmed!',
        'checkout.thankYou': 'Thank you for your order!',

        // Loyalty
        'loyalty.title': 'Loyalty Program',
        'loyalty.points': 'Points',
        'loyalty.earn': 'Earn 1 point per euro spent',
        'loyalty.redeem': 'Redeem Points',
        'loyalty.history': 'History',
        'loyalty.rewards': 'Rewards',
        'loyalty.free_pizza': 'Free Pizza',
        'loyalty.free_drink': 'Free Drink',
        'loyalty.discount_5': '5€ Discount',
        'loyalty.discount_10': '10€ Discount',


        // Common
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.close': 'Close',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.search': 'Search...',

        // PWA
        'pwa.install': 'Install App',
        'pwa.installDesc': 'Install Twin Pizza for quick access!',
        'pwa.installBtn': 'Install',
        'pwa.notNow': 'Not Now',
    },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('twinpizza-language') as Language;
            if (saved === 'en' || saved === 'fr') return saved;
        }
        return 'fr';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('twinpizza-language', lang);
        document.documentElement.lang = lang;
    };

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const t = (key: string, params?: Record<string, string | number>): string => {
        let text = translations[language][key] || translations['fr'][key] || key;

        // Replace parameters like {name}
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(value));
            });
        }

        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
