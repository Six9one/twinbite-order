/**
 * Compresses an image file client-side using Canvas.
 * Resizes the image to fit within maxWidth/maxHeight and converts it to jpeg with quality 0.8.
 * Returns the compressed File.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number; mimeType?: string } = {}
): Promise<File> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    mimeType = 'image/jpeg'
  } = options;

  // Skip if not an image or if it's SVG/GIF or tiny (under 100KB)
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size < 100 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const extension = mimeType === 'image/jpeg' ? '.jpg' : '.webp';
            let name = file.name;
            const dotIdx = name.lastIndexOf('.');
            if (dotIdx !== -1) {
              name = name.substring(0, dotIdx) + extension;
            } else {
              name = name + extension;
            }

            resolve(new File([blob], name, { type: mimeType, lastModified: Date.now() }));
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
