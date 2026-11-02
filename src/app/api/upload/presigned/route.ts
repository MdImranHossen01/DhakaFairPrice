import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { filename, contentType, folder = 'products' } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { message: 'filename and contentType are required' },
        { status: 400 }
      );
    }

    // Allowed image types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(contentType.toLowerCase())) {
      return NextResponse.json(
        { message: 'Invalid file type. Only image files are allowed.' },
        { status: 400 }
      );
    }

    // Safe extension extraction
    const rawExt = filename.split('.').pop()?.toLowerCase() || 'webp';
    const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'webp';

    // Sanitize folder
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'products';
    const fileKey = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
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
