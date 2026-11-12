import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2';
import crypto from 'crypto';

/**
 * Determines a strictly partitioned, multi-tenant storage folder path:
 * e.g.:
 * - {platform}/mother/products/uuid.webp (Mother shop admin)
 * - {platform}/resellers/{resellerSlug}/products/uuid.webp (Reseller personal product)
 * - {platform}/users/avatars/uuid.webp (Customer uploads)
 */
async function resolveStoragePrefix(session: any, folder: string): Promise<string> {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
  const platform = rootDomain.split('.')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'swapnobaz';
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'products';

  const user = session?.user;
  const role = user?.role;

  if (role === 'reseller') {
    try {
      const connectToDatabase = (await import('@/lib/db')).default;
      const Reseller = (await import('@/models/Reseller')).default;
      await connectToDatabase();
      const reseller = await Reseller.findOne({ userId: user.id }).select('subdomain storeName').lean();
      const slug = reseller?.subdomain || reseller?.storeName?.toLowerCase().replace(/[^a-z0-9_-]/g, '') || user.id;
      return `${platform}/resellers/${slug}/${safeFolder}`;
    } catch (err) {
      console.warn('Could not resolve reseller subdomain for storage prefix:', err);
      return `${platform}/resellers/${user?.id || 'unknown'}/${safeFolder}`;
    }
  }

  if (['admin', 'super_admin', 'manager', 'moderator'].includes(role)) {
    return `${platform}/mother/${safeFolder}`;
  }

  return `${platform}/users/${safeFolder}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { filename, contentType, folder = 'products', fileSize } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { message: 'filename and contentType are required' },
        { status: 400 }
      );
    }

    // Strict size & format guard for direct presigned uploads:
    // Only pre-compressed WebP (or SVG/GIF) within target size may bypass server-side Sharp.
    const isBanner = folder === 'banners' || folder.includes('banner') || folder.includes('hero');
    const maxAllowedBytes = isBanner ? 400 * 1024 : 150 * 1024;
    if (typeof fileSize !== 'number' || fileSize <= 0 || fileSize > maxAllowedBytes) {
      return NextResponse.json(
        { message: 'File requires server-side Sharp optimization.' },
        { status: 400 }
      );
    }

    // Allowed image types for direct presigned upload
    const allowedTypes = [
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(contentType.toLowerCase())) {
      return NextResponse.json(
        { message: 'Only optimized WebP, GIF, or SVG files can use direct presigned upload.' },
        { status: 400 }
      );
    }

    // Safe extension extraction
    const rawExt = filename.split('.').pop()?.toLowerCase() || 'webp';
    const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'webp';

    // Multi-tenant partitioned folder
    const storagePrefix = await resolveStoragePrefix(session, folder);
    const fileKey = `${storagePrefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: Number(fileSize),
    });

    // 5-minute expiry for client direct upload
    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl,
      fileKey,
    });
  } catch (error: any) {
    console.error('Error generating presigned URL for R2:', error);
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
