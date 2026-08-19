import { supabase } from '@/integrations/supabase/client';
import { compressImage } from './imageCompressor';

/**
 * Upload an image file to Supabase Storage (product-images bucket)
 * Stub replacement for missing Cloudinary integration
 */
export async function uploadBlobToSupabaseStorage(blob: Blob, prefix: string = 'product'): Promise<string> {
    const timestamp = Date.now();
    const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('png') ? 'png' : 'jpg';
    const filePath = `uploads/${prefix}_${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, blob, { contentType: blob.type, cacheControl: '31536000', upsert: true });

    if (error) {
        console.warn('Supabase storage upload failed, converting to data URL fallback:', error);
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    }

    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return publicUrl;
}

export async function uploadToCloudinary(file: File): Promise<string> {
    const compressedFile = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
    return uploadBlobToSupabaseStorage(compressedFile, 'product');
}
