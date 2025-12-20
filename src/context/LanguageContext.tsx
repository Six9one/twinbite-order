import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'ar' | 'en';

interface Translations {
    [key: string]: string;
}

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    dir: 'ltr' | 'rtl';
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

        // Group Order
        'group.title': 'Commande de Groupe',
        'group.create': 'Créer une commande groupée',
        'group.join': 'Rejoindre une commande',
        'group.code': 'Code de groupe',
        'group.share': 'Partager le lien',
        'group.participants': 'Participants',
        'group.yourItems': 'Vos articles',
        'group.allItems': 'Tous les articles',
        'group.close': 'Fermer la commande',
        'group.submit': 'Valider la commande groupée',

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

    ar: {
        // Navigation & General
        'app.name': 'توين بيتزا',
        'app.tagline': 'بيتزا ووجبات سريعة',
        'nav.menu': 'القائمة',
        'nav.cart': 'السلة',
        'nav.account': 'الحساب',
        'nav.loyalty': 'نقاط الولاء',

        // Order Types
        'order.takeaway': 'للاستلام',
        'order.delivery': 'توصيل',
        'order.dineIn': 'في المطعم',
        'order.selectType': 'كيف تريد الطلب؟',

        // Categories
        'category.pizzas': 'بيتزا',
        'category.tacos': 'تاكوس',
        'category.soufflets': 'سوفليه',
        'category.makloub': 'مقلوب',
        'category.mlawi': 'ملاوي',
        'category.panini': 'بانيني',
        'category.croques': 'كروك',
        'category.texmex': 'تكس مكس',
        'category.frites': 'بطاطا مقلية',
        'category.boissons': 'مشروبات',
        'category.milkshakes': 'ميلك شيك',
        'category.crepes': 'كريب',
        'category.gaufres': 'وافل',
        'category.salades': 'سلطات',

        // Cart
        'cart.empty': 'سلتك فارغة',
        'cart.total': 'المجموع',
        'cart.subtotal': 'المجموع الفرعي',
        'cart.tva': 'الضريبة (10%)',
        'cart.checkout': 'اطلب',
        'cart.continue': 'متابعة التسوق',
        'cart.remove': 'حذف',
        'cart.add': 'أضف إلى السلة',

        // Checkout
        'checkout.title': 'إتمام الطلب',
        'checkout.info': 'معلوماتك',
        'checkout.payment': 'الدفع',
        'checkout.confirm': 'التأكيد',
        'checkout.name': 'الاسم',
        'checkout.phone': 'الهاتف',
        'checkout.address': 'عنوان التوصيل',
        'checkout.notes': 'ملاحظات (اختياري)',
        'checkout.paymentMethod': 'طريقة الدفع',
        'checkout.card': 'بطاقة بنكية',
        'checkout.cash': 'نقدي',
        'checkout.online': 'ادفع الآن',
        'checkout.confirmOrder': 'تأكيد الطلب',
        'checkout.success': 'تم تأكيد الطلب!',
        'checkout.thankYou': 'شكراً لطلبك!',

        // Loyalty
        'loyalty.title': 'برنامج الولاء',
        'loyalty.points': 'نقاط',
        'loyalty.earn': 'اكسب نقطة واحدة لكل يورو',
        'loyalty.redeem': 'استبدل نقاطك',
        'loyalty.history': 'السجل',
        'loyalty.rewards': 'المكافآت',
        'loyalty.free_pizza': 'بيتزا مجانية',
        'loyalty.free_drink': 'مشروب مجاني',
        'loyalty.discount_5': 'خصم 5€',
        'loyalty.discount_10': 'خصم 10€',

        // Group Order
        'group.title': 'طلب جماعي',
        'group.create': 'إنشاء طلب جماعي',
        'group.join': 'انضم لطلب',
        'group.code': 'رمز المجموعة',
        'group.share': 'شارك الرابط',
        'group.participants': 'المشاركون',
        'group.yourItems': 'طلباتك',
        'group.allItems': 'كل الطلبات',
        'group.close': 'إغلاق الطلب',
        'group.submit': 'تأكيد الطلب الجماعي',

        // Common
        'common.loading': 'جاري التحميل...',
        'common.error': 'خطأ',
        'common.success': 'نجاح',
        'common.cancel': 'إلغاء',
        'common.save': 'حفظ',
        'common.close': 'إغلاق',
        'common.back': 'رجوع',
        'common.next': 'التالي',
        'common.search': 'بحث...',

        // PWA
        'pwa.install': 'تثبيت التطبيق',
        'pwa.installDesc': 'ثبت توين بيتزا للوصول السريع!',
        'pwa.installBtn': 'تثبيت',
        'pwa.notNow': 'لاحقاً',
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

        // Group Order
        'group.title': 'Group Order',
        'group.create': 'Create Group Order',
        'group.join': 'Join Order',
        'group.code': 'Group Code',
        'group.share': 'Share Link',
        'group.participants': 'Participants',
        'group.yourItems': 'Your Items',
        'group.allItems': 'All Items',
        'group.close': 'Close Order',
        'group.submit': 'Submit Group Order',

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
            return (localStorage.getItem('twinpizza-language') as Language) || 'fr';
        }
        return 'fr';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('twinpizza-language', lang);
        // Update document direction for RTL languages
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    };

    useEffect(() => {
        // Set initial direction
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
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

    const dir = language === 'ar' ? 'rtl' : 'ltr';

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
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
