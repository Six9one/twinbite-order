import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Image, Upload, Trash2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CategoryImage {
    id: string;
    category_slug: string;
    image_url: string | null;
    emoji_fallback: string;
    display_name: string;
    display_order: number;
    is_active: boolean;
}

export function CategoryImagesManager() {
    const [categories, setCategories] = useState<CategoryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('category_images' as any)
            .select('*')
            .order('display_order');

        if (!error && data) {
            setCategories(data as unknown as CategoryImage[]);
        }
        setLoading(false);
    };

    const handleImageUpload = async (categoryId: string, file: File) => {
        setUploading(categoryId);
        const fileExt = file.name.split('.').pop();
        const fileName = `category-${categoryId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file);

        if (uploadError) {
            toast.error('Erreur upload image');
            setUploading(null);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

        const { error: updateError } = await supabase
            .from('category_images' as any)
            .update({ image_url: urlData.publicUrl })
            .eq('id', categoryId);

        if (updateError) {
            toast.error('Erreur mise à jour');
        } else {
            toast.success('Image mise à jour');
            fetchCategories();
        }
        setUploading(null);
    };

    const handleRemoveImage = async (categoryId: string) => {
        const { error } = await supabase
            .from('category_images' as any)
            .update({ image_url: null })
            .eq('id', categoryId);

        if (error) {
            toast.error('Erreur suppression');
        } else {
            toast.success('Image supprimée');
            fetchCategories();
        }
    };

    const triggerUpload = (categoryId: string) => {
        setSelectedCategoryId(categoryId);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedCategoryId) {
            handleImageUpload(selectedCategoryId, file);
        }
        e.target.value = '';
    };

    if (loading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Image className="w-6 h-6 text-amber-500" />
                    Images des Catégories
                </h2>
                <Button variant="outline" onClick={fetchCategories}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                </Button>
            </div>

            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
                <p className="text-sm">
                    💡 <strong>Astuce:</strong> Uploadez des images pour remplacer les emojis par défaut.
                    Les images doivent être carrées (ex: 200x200px) pour un meilleur rendu.
                </p>
            </Card>

            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((category) => (
                    <Card key={category.id} className="p-4 text-center">
                        {/* Image/Emoji Display */}
                        <div className="relative mx-auto w-20 h-20 mb-3">
                            {category.image_url ? (
                                <img
                                    src={category.image_url}
                                    alt={category.display_name}
                                    className="w-full h-full rounded-full object-cover border-4 border-amber-400/30"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-4xl border-4 border-amber-400/30">
                                    {category.emoji_fallback}
                                </div>
                            )}

                            {/* Upload indicator */}
                            {uploading === category.id && (
                                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Category Name */}
                        <h3 className="font-semibold text-sm mb-2">{category.display_name}</h3>
                        <Badge variant="secondary" className="text-xs mb-3">
                            {category.category_slug}
                        </Badge>

                        {/* Actions */}
                        <div className="flex gap-2 justify-center">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => triggerUpload(category.id)}
                                disabled={uploading === category.id}
                            >
                                <Upload className="w-4 h-4" />
                            </Button>
                            {category.image_url && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500"
                                    onClick={() => handleRemoveImage(category.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
