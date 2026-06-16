import { uploadToExternalStorage } from './externalStorageClient';

/**
 * Compresses an image client-side using Canvas to keep size around 100KB-200KB.
 */
export const compressImage = (file: File, maxW = 1200, maxH = 1200, quality = 0.7): Promise<Blob | File> => {
  return new Promise((resolve) => {
    // Only compress image files
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale aspect ratio if it exceeds maximum bounds
        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
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
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        resolve(file);
      };
    };
    reader.onerror = () => {
      resolve(file);
    };
  });
};

/**
 * Compresses and uploads an image to the Supabase Storage bucket 'discussion-attachments'
 */
export const uploadDiscussionImage = async (file: File, sessionId: string): Promise<string | null> => {
  try {
    const compressedBlob = await compressImage(file);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `${sessionId}/${timestamp}_${randomStr}.${extension}`;

    const publicUrl = await uploadToExternalStorage(
      compressedBlob,
      fileName,
      'discussion-attachments'
    );
    return publicUrl;
  } catch (error) {
    console.error("Error compressing/uploading discussion image:", error);
    return null;
  }
};
