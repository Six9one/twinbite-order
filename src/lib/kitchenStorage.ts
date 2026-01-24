import { supabase } from '@/integrations/supabase/client';

// Storage bucket names for kitchen SCP
export const KITCHEN_BUCKETS = {
    TRACEABILITY_LABELS: 'traceability-labels',
    INVOICES_FACTURES: 'invoices-factures',
    DELIVERY_PROOFS: 'delivery-proofs',
    CLEANING_PROOFS: 'cleaning-proofs',
} as const;

export type KitchenBucket = typeof KITCHEN_BUCKETS[keyof typeof KITCHEN_BUCKETS];

/**
 * Upload a file to a kitchen storage bucket
 */
export async function uploadToKitchenStorage(
    bucket: KitchenBucket,
    file: File | string,
    fileName?: string
): Promise<string | null> {
    try {
        const timestamp = Date.now();
        const name = fileName || `${timestamp}_${Math.random().toString(36).substring(7)}`;

        let uploadData: File | Blob;
        let extension = 'jpg';

        if (typeof file === 'string') {
            const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);

            if (file.includes('image/png')) extension = 'png';
            else if (file.includes('image/webp')) extension = 'webp';

            uploadData = new Blob([byteArray], { type: `image/${extension}` });
        } else {
            uploadData = file;
            extension = file.name.split('.').pop() || 'jpg';
        }

        const filePath = `${name}.${extension}`;

        const { error } = await supabase.storage
            .from(bucket)
            .upload(filePath, uploadData, { cacheControl: '3600', upsert: true });

        if (error) {
            console.error(`Error uploading to ${bucket}:`, error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return publicUrl;
    } catch (error) {
        console.error('Upload error:', error);
        return null;
    }
}

/**
 * Delete a file from a kitchen storage bucket
 */
export async function deleteFromKitchenStorage(
    bucket: KitchenBucket,
    filePath: string
): Promise<boolean> {
    try {
        const fileName = filePath.includes('/') ? filePath.split('/').pop() : filePath;
        if (!fileName) return false;

        const { error } = await supabase.storage.from(bucket).remove([fileName]);
        if (error) {
            console.error(`Error deleting from ${bucket}:`, error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        return false;
    }
}
