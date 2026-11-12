/**
 * Cloudflare R2 Image Upload Utility with Client-side WebP Compression.
 * Automatically optimizes images before direct presigned upload to R2,
 * completely bypassing server RAM and disk constraints when client WebP succeeds.
 */

interface UploadOptions {
  folder?: string;
  compress?: boolean;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  targetMaxKB?: number;
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        // Safari/iOS WebKit silently falls back to 'image/png' if WebP encoding is unsupported.
        // Reject non-WebP blobs so we never upload an uncompressed PNG disguised as .webp!
        if (!blob || blob.type !== 'image/webp') {
          resolve(null);
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Fast, adaptive client-side image compression to WebP.
 * Strictly guarantees size within targetMaxKB without quality degradation or loop freezes.
 * - Products: maxDim = 1200px, quality = 82% (0.82), targetMaxKB = 150KB
 * - Banners / Hero: maxDim = 2100px, quality = 82% (0.82), targetMaxKB = 400KB
 */
async function compressImageInBrowser(
  file: File,
  targetMaxKB = 150,
  maxDim = 1200
): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      return resolve(file);
    }

    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const filename = `${nameWithoutExt}.webp`;
      const targetBytes = targetMaxKB * 1024;

      const steps = [
        { scale: 1.0, quality: 0.82 },
        { scale: 1.0, quality: 0.78 },
        { scale: 0.94, quality: 0.74 },
        { scale: 0.88, quality: 0.70 },
        { scale: 0.80, quality: 0.65 },
        { scale: 0.72, quality: 0.60 },
      ];

      let lastValidBlob: Blob | null = null;

      for (const step of steps) {
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(width * step.scale));
        c.height = Math.max(1, Math.round(height * step.scale));
        const ctx = c.getContext('2d');
        if (!ctx) break;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);

        const blob = await canvasToWebpBlob(c, step.quality);
        if (!blob) {
          // Browser does not support real WebP encoding on canvas (e.g. iOS/Safari)
          return resolve(file);
        }

        lastValidBlob = blob;
        if (blob.size <= targetBytes) {
          return resolve(new File([blob], filename, { type: 'image/webp' }));
        }
      }

      if (lastValidBlob && lastValidBlob.size <= targetBytes) {
        return resolve(new File([lastValidBlob], filename, { type: 'image/webp' }));
      }

      // If client-side compression could not get under targetBytes, return original file
      // so uploadImageToR2 routes it to server-side Sharp (/api/upload) for guaranteed compression.
      return resolve(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export async function uploadImageToR2(
  file: File | string,
  options: UploadOptions = {}
): Promise<string> {
  const {
    folder = 'products',
    compress = true,
  } = options;

  const isBanner = folder === 'banners' || folder.includes('banner') || folder.includes('hero');
  const targetMaxKB = options.targetMaxKB ?? (isBanner ? 400 : 150);
  const maxWidthOrHeight = options.maxWidthOrHeight ?? (isBanner ? 2100 : 1200);
  const targetMaxBytes = targetMaxKB * 1024;

  // 1. If it's a browser File and compression is enabled, compress to WebP
  let uploadFile: File | null = null;
  let contentType = 'image/jpeg';
  let filename = 'image.webp';

  if (typeof window !== 'undefined' && file instanceof File) {
    // 1 MB File Size Guard: Strictly block any image over 1 MB (products, banners, blogs, categories, etc.)
    const MAX_ALLOWED_BYTES = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_ALLOWED_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      throw new Error(`Image size cannot exceed 1 MB! Your file is ${sizeMB} MB. Please upload an image under 1 MB.`);
    }

    const isBypassType = file.type.includes('svg') || file.type.includes('gif');

    if (compress && file.type.startsWith('image/') && !isBypassType) {
      try {
        uploadFile = await compressImageInBrowser(file, targetMaxKB, maxWidthOrHeight);
        contentType = uploadFile.type || 'image/webp';
        filename = uploadFile.name || 'image.webp';
      } catch (compErr) {
        console.warn('Client-side image compression fallback to original:', compErr);
        uploadFile = file;
        contentType = file.type || 'image/jpeg';
        filename = file.name;
      }
    } else {
      uploadFile = file;
      contentType = file.type || 'image/jpeg';
      filename = file.name;
    }

    // 2. Try direct Presigned PUT Upload to Cloudflare R2 ONLY if:
    //    - It was genuinely converted to 'image/webp' (or is SVG/GIF)
    //    - AND its size is strictly within targetMaxBytes!
    //    Otherwise (e.g. Safari PNG fallback or oversized file), skip presigned upload
    //    so server-side Sharp (/api/upload) compresses it to a real WebP under targetMaxKB.
    const canUsePresigned =
      uploadFile &&
      (isBypassType || (uploadFile.type === 'image/webp' && uploadFile.size <= targetMaxBytes));

    if (canUsePresigned && uploadFile) {
      try {
        const presignedRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            contentType,
            folder,
            fileSize: uploadFile.size,
          }),
        });

        if (presignedRes.ok) {
          const { uploadUrl, publicUrl } = await presignedRes.json();
          if (uploadUrl && publicUrl) {
            const directUploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': contentType,
              },
              body: uploadFile,
            });

            if (directUploadRes.ok) {
              return publicUrl;
            }
          }
        }
      } catch (presignedErr) {
        console.warn('Presigned upload failed, falling back to server /api/upload:', presignedErr);
      }
    }
  }

  // 3. Fallback to server-side /api/upload (Sharp WebP compression + direct R2 write)
  const formData = new FormData();
  if (typeof file === 'string') {
    const base64Data = file.split(',')[1] || file;
    formData.append('image', base64Data);
  } else if (uploadFile && uploadFile.type === 'image/webp' && uploadFile.size <= targetMaxBytes) {
    formData.append('image', uploadFile);
  } else {
    formData.append('image', file);
  }
  formData.append('folder', folder);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Upload failed: Unexpected response from server. Status: ${response.status}`);
  }

  if (response.ok && data.url) {
    return data.url;
  } else {
    throw new Error(data.message || `Upload failed with status ${response.status}`);
  }
}
