import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Auth check - any authenticated user can upload images (e.g. profile pictures or product/setting images)
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get('image');
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!image) {
      return NextResponse.json({ message: 'No image provided' }, { status: 400 });
    }

    let buffer: Buffer;
    let contentType = 'image/jpeg';
    let originalName = 'image.jpg';

    if (image instanceof File) {
      const bytes = await image.arrayBuffer();
      buffer = Buffer.from(bytes);
      contentType = image.type || 'image/jpeg';
      originalName = image.name || 'image.jpg';
    } else if (typeof image === 'string') {
      // Base64 string
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      const match = image.match(/^data:(image\/\w+);base64,/);
      if (match) contentType = match[1];
    } else {
      return NextResponse.json({ message: 'Unsupported image format' }, { status: 400 });
    }

    // Generate unique key
    const rawExt = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'uploads';
    const fileKey = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // Upload directly to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(command);

    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileKey,
    });
  } catch (error: any) {
    console.error('Error in Cloudflare R2 /api/upload:', error);
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
