import { removeBackground, Config } from '@imgly/background-removal';

export interface ProgressCallback {
  (stage: string, progress: number): void;
}

/**
 * Remove background using client-side AI (WASM / ONNX)
 * and compress to optimized square WebP (600x600, ~50-80 KB)
 */
export async function removeBackgroundAndOptimize(
  imageSource: File | Blob | string,
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.('Chargement du modèle IA...', 10);

  const config: Config = {
    progress: (key: string, current: number, total: number) => {
      if (total > 0) {
        const percent = Math.round((current / total) * 100);
        onProgress?.(`Détourage IA (${key}): ${percent}%`, Math.min(85, 10 + Math.round(percent * 0.75)));
      }
    },
    output: {
      format: 'image/png',
      quality: 0.9,
    },
  };

  const transparentBlob = await removeBackground(imageSource, config);
  onProgress?.('Optimisation et centrage...', 90);

  // Load transparent blob into an Image to center & fit within a 600x600 square WebP
  return new Promise<Blob>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(transparentBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const targetSize = 600;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(transparentBlob);
        }

        // Clean transparent canvas
        ctx.clearRect(0, 0, targetSize, targetSize);

        // Calculate aspect-ratio fit with 20px padding
        const maxContentSize = targetSize - 40;
        const scale = Math.min(maxContentSize / img.width, maxContentSize / img.height);
        const drawW = Math.round(img.width * scale);
        const drawH = Math.round(img.height * scale);
        const dx = Math.round((targetSize - drawW) / 2);
        const dy = Math.round((targetSize - drawH) / 2);

        ctx.drawImage(img, dx, dy, drawW, drawH);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              onProgress?.('Terminé !', 100);
              resolve(blob);
            } else {
              resolve(transparentBlob);
            }
          },
          'image/webp',
          0.9
        );
      } catch (err) {
        console.error('Error optimizing canvas:', err);
        resolve(transparentBlob);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      console.error('Error loading transparent image:', e);
      resolve(transparentBlob);
    };

    img.src = url;
  });
}
