import { supabase } from '@/integrations/supabase/client';
import { compressImage } from './imageCompressor';

/**
 * Upload an image file to Supabase Storage (product-images bucket)
 * Stub replacement for missing Cloudinary integration
 */
export async function uploadToCloudinary(file: File): Promise<string> {
    const compressedFile = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
    const timestamp = Date.now();
    const ext = compressedFile.name.split('.').pop() || 'jpg';
    const filePath = `uploads/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedFile, { cacheControl: '31536000', upsert: true });

    if (error) {
        console.error('Upload error details:', error);
        throw new Error(`Upload failed: ${error.message || 'Unknown storage error'}`);
    }

    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return publicUrl;
}
