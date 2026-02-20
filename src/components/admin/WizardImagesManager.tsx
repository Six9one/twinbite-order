import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Image, Upload, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAllWizardImages, WizardProductType } from '@/hooks/useWizardImages';
import { useUpdateAdminSetting } from '@/hooks/useAdminSettings';
import { useQueryClient } from '@tanstack/react-query';

interface ProductInfo {
    type: WizardProductType;
    label: string;
    emoji: string;
}

const products: ProductInfo[] = [
    { type: 'soufflet', label: 'Soufflet', emoji: '🥟' },
    { type: 'tacos', label: 'Tacos', emoji: '🌮' },
    { type: 'makloub', label: 'Makloub', emoji: '🌯' },
    { type: 'mlawi', label: 'Mlawi', emoji: '🫓' },
    { type: 'panini', label: 'Panini', emoji: '🥪' },
];

export function WizardImagesManager() {
    const { data: images, isLoading, refetch } = useAllWizardImages();
    const updateSetting = useUpdateAdminSetting();
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState<WizardProductType | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedProduct, setSelectedProduct] = useState<WizardProductType | null>(null);

    const handleImageUpload = async (productType: WizardProductType, file: File) => {
        setUploading(productType);

        try {
            const { uploadToCloudinary } = await import('@/utils/cloudinary');
            const imageUrl = await uploadToCloudinary(file);

            if (!imageUrl) {
                toast.error('Erreur upload image');
                setUploading(null);
                return;
            }

            // Save image URL to admin_settings
            await updateSetting.mutateAsync({
                key: `wizard_image_${productType}`,
                value: { image_url: imageUrl },
            });

            // Invalidate wizard images cache
            queryClient.invalidateQueries({ queryKey: ['wizard_image', productType] });
            queryClient.invalidateQueries({ queryKey: ['wizard_images', 'all'] });

            toast.success('Image mise à jour');
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la mise à jour');
        }

        setUploading(null);
    };

    const handleRemoveImage = async (productType: WizardProductType) => {
        try {
            await updateSetting.mutateAsync({
                key: `wizard_image_${productType}`,
                value: { image_url: null },
            });

            // Invalidate wizard images cache
            queryClient.invalidateQueries({ queryKey: ['wizard_image', productType] });
            queryClient.invalidateQueries({ queryKey: ['wizard_images', 'all'] });

            toast.success('Image supprimée');
            refetch();
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de la suppression');
        }
    };

    const triggerUpload = (productType: WizardProductType) => {
        setSelectedProduct(productType);
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedProduct) {
            handleImageUpload(selectedProduct, file);
        }
        e.target.value = '';
    };

    if (isLoading) {
        return <div className="text-center py-12">Chargement...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Image className="w-6 h-6 text-amber-500" />
                    Images des Produits (Wizard)
                </h2>
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                </Button>
            </div>

            <Card className="p-4 bg-amber-500/10 border-amber-500/20">
                <p className="text-sm">
                    💡 <strong>Astuce:</strong> Ces images apparaissent dans l'étape de personnalisation
                    (choix de taille) pour chaque produit. Utilisez des images portrait ou carrées
                    (ex: 400x500px) pour un meilleur rendu.
                </p>
            </Card>

            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                    const imageUrl = images?.[product.type];
                    const isUploading = uploading === product.type;

                    return (
                        <Card key={product.type} className="p-4">
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">{product.emoji}</span>
                                <h3 className="font-semibold text-lg">{product.label}</h3>
                            </div>

                            {/* Image Preview */}
                            <div className="relative aspect-[4/5] mb-4 rounded-lg overflow-hidden bg-muted">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={product.label}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                        <Image className="w-12 h-12 mb-2 opacity-30" />
                                        <span className="text-sm">Aucune image</span>
                                    </div>
                                )}

                                {/* Upload indicator */}
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    onClick={() => triggerUpload(product.type)}
                                    disabled={isUploading}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {imageUrl ? 'Remplacer' : 'Ajouter'}
                                </Button>
                                {imageUrl && (
                                    <Button
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleRemoveImage(product.type)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
