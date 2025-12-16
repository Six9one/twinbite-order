import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CategoryImage {
    category_slug: string;
    image_url: string | null;
    emoji_fallback: string;
    display_name: string;
}

export function useCategoryImages() {
    const [images, setImages] = useState<Record<string, CategoryImage>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        try {
            const { data, error } = await supabase
                .from('category_images' as any)
                .select('category_slug, image_url, emoji_fallback, display_name')
                .eq('is_active', true);

            if (!error && data) {
                const imagesMap: Record<string, CategoryImage> = {};
                (data as unknown as CategoryImage[]).forEach(img => {
                    imagesMap[img.category_slug] = img;
                });
                setImages(imagesMap);
            }
        } catch (error) {
            console.error('Error fetching category images:', error);
        } finally {
            setLoading(false);
        }
    };

    const getImageOrEmoji = (categorySlug: string): { type: 'image' | 'emoji'; value: string } => {
        const img = images[categorySlug];
        if (img?.image_url) {
            return { type: 'image', value: img.image_url };
        }
        return { type: 'emoji', value: img?.emoji_fallback || '📦' };
    };

    const getDisplayName = (categorySlug: string): string => {
        return images[categorySlug]?.display_name || categorySlug;
    };

    return {
        images,
        loading,
        getImageOrEmoji,
        getDisplayName,
        refetch: fetchImages,
    };
}
