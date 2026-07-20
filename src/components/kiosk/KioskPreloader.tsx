import { useEffect } from 'react';
import { useProductsByCategory, usePizzasByBase } from '@/hooks/useProducts';
import { useDrinks } from '@/hooks/useSupabaseData';
import { useSandwichTypes, useCruditeOptions } from '@/hooks/useSandwiches';
import { useSauceOptions, useSupplementOptions, useMeatOptions, useGarnitureOptions, useCruditesOptions } from '@/hooks/useCustomizationOptions';
import { useMenuOptionImages, usePizzaFormatImages, useWizardImage } from '@/hooks/useWizardImages';
import { useCategoryImages } from '@/hooks/useCategoryImages';

const CATEGORIES = [
    'pizzas', 'sandwiches', 'tacos', 'texmex', 'soufflets',
    'makloub', 'mlawi', 'panini', 'milkshakes', 'frites',
    'crepes', 'gaufres', 'boissons', 'croques'
];

export function KioskPreloader() {
    // 1. Run all category product hooks to preload cache
    const frites = useProductsByCategory('frites');
    const crepes = useProductsByCategory('crepes');
    const gaufres = useProductsByCategory('gaufres');
    const croques = useProductsByCategory('croques');
    const pizzas = useProductsByCategory('pizzas');
    const sandwiches = useProductsByCategory('sandwiches');
    const tacos = useProductsByCategory('tacos');
    const texmex = useProductsByCategory('texmex');
    const soufflets = useProductsByCategory('soufflets');
    const makloub = useProductsByCategory('makloub');
    const mlawi = useProductsByCategory('mlawi');
    const panini = useProductsByCategory('panini');
    const milkshakes = useProductsByCategory('milkshakes');
    const boissons = useDrinks();

    // 2. Pizzas by base
    const pizzasTomate = usePizzasByBase('tomate');
    const pizzasCreme = usePizzasByBase('creme');

    // 3. Customization hooks
    const sandwichTypes = useSandwichTypes();
    const cruditeOptions = useCruditeOptions();
    const sauceOptions = useSauceOptions();
    const supplementOptions = useSupplementOptions();
    const meatOptions = useMeatOptions();
    const garnitureOptions = useGarnitureOptions();
    const cruditesOptions = useCruditesOptions();

    // 4. Wizard images
    const menuOptionImages = useMenuOptionImages();
    const pizzaFormatImages = usePizzaFormatImages();
    const tacosWizardImage = useWizardImage('tacos');
    const souffletWizardImage = useWizardImage('soufflet');
    const makloubWizardImage = useWizardImage('makloub');
    const mlawiWizardImage = useWizardImage('mlawi');
    const paniniWizardImage = useWizardImage('panini');

    // 5. Category images resolver
    const { getImageOrEmoji } = useCategoryImages();

    // 6. Pre-load all image URLs in the background
    useEffect(() => {
        const imageUrls = new Set<string>();

        // Add category images
        CATEGORIES.forEach(slug => {
            const resolved = getImageOrEmoji(slug);
            if (resolved.type === 'image' && resolved.value) {
                imageUrls.add(resolved.value);
            }
        });

        // Add product images from loaded categories
        const categoriesData = [
            frites.data, crepes.data, gaufres.data, croques.data,
            pizzas.data, sandwiches.data, tacos.data, texmex.data,
            soufflets.data, makloub.data, mlawi.data, panini.data,
            milkshakes.data, boissons.data, pizzasTomate.data, pizzasCreme.data
        ];

        categoriesData.forEach(products => {
            if (Array.isArray(products)) {
                products.forEach(p => {
                    if (p.image_url) {
                        imageUrls.add(p.image_url);
                    }
                });
            }
        });

        // Add wizard and option images
        if (pizzaFormatImages.data) {
            Object.values(pizzaFormatImages.data).forEach((url: any) => {
                if (url && typeof url === 'string') imageUrls.add(url);
            });
        }
        if (menuOptionImages.data) {
            Object.values(menuOptionImages.data).forEach((url: any) => {
                if (url && typeof url === 'string') imageUrls.add(url);
            });
        }
        if (tacosWizardImage.data) imageUrls.add(tacosWizardImage.data);
        if (souffletWizardImage.data) imageUrls.add(souffletWizardImage.data);
        if (makloubWizardImage.data) imageUrls.add(makloubWizardImage.data);
        if (mlawiWizardImage.data) imageUrls.add(mlawiWizardImage.data);
        if (paniniWizardImage.data) imageUrls.add(paniniWizardImage.data);

        // Preload all collected images
        imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
        });

        console.log(`[KIOSK PRELOADER] Preloaded ${imageUrls.size} images to browser cache.`);
    }, [
        frites.data, crepes.data, gaufres.data, croques.data,
        pizzas.data, sandwiches.data, tacos.data, texmex.data,
        soufflets.data, makloub.data, mlawi.data, panini.data,
        milkshakes.data, boissons.data, pizzasTomate.data, pizzasCreme.data,
        pizzaFormatImages.data, menuOptionImages.data,
        tacosWizardImage.data, souffletWizardImage.data,
        makloubWizardImage.data, mlawiWizardImage.data, paniniWizardImage.data,
        getImageOrEmoji
    ]);

    return null; // Silent preloader
}
