import { supabase } from '@/integrations/supabase/client';

/**
 * Upload an image file to Supabase Storage (product-images bucket)
 * Stub replacement for missing Cloudinary integration
 */
export async function uploadToCloudinary(file: File): Promise<string> {
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `uploads/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (error) {
        console.error('Upload error:', error);
        throw new Error('Upload failed');
    }

    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return publicUrl;
}
