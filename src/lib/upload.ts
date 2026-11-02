/**
 * Cloudflare R2 Image Upload Utility with Client-side WebP Compression.
 * Automatically optimizes images before direct presigned upload to R2,
 * completely bypassing server RAM and disk constraints.
 */

interface UploadOptions {
  folder?: string;
  compress?: boolean;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
}

export async function uploadImageToR2(
  file: File | string,
  options: UploadOptions = {}
): Promise<string> {
  const {
    folder = 'products',
    compress = true,
    maxSizeMB = 0.35, // ~350 KB target
    maxWidthOrHeight = 1200,
  } = options;

  // 1. If it's a browser File and compression is enabled, compress to WebP
  let uploadFile: File | null = null;
  let contentType = 'image/jpeg';
  let filename = 'image.webp';

  if (typeof window !== 'undefined' && file instanceof File) {
    if (compress && file.type.startsWith('image/') && !file.type.includes('svg') && !file.type.includes('gif')) {
      try {
        const imageCompression = (await import('browser-image-compression')).default;
        const compressionOptions = {
          maxSizeMB,
          maxWidthOrHeight,
          useWebWorker: false,
          fileType: 'image/webp',
          initialQuality: 0.82,
        };

        const compressedBlob = await imageCompression(file, compressionOptions);
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        filename = `${nameWithoutExt}.webp`;
        contentType = 'image/webp';
        uploadFile = new File([compressedBlob], filename, { type: 'image/webp' });
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

    // 2. Try direct Presigned PUT Upload to Cloudflare R2
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          contentType,
          folder,
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

  // 3. Fallback to server-side /api/upload (which also writes directly to Cloudflare R2)
  const formData = new FormData();
  if (typeof file === 'string') {
    const base64Data = file.split(',')[1] || file;
    formData.append('image', base64Data);
  } else if (uploadFile) {
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
