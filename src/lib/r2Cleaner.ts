import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL, deleteMultipleFromR2 } from '@/lib/r2';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Brand from '@/models/Brand';
import Banner from '@/models/Banner';
import Slider from '@/models/Slider';
import Blog from '@/models/Blog';
import User from '@/models/User';
import Reseller from '@/models/Reseller';
import GlobalSettings from '@/models/GlobalSettings';
import LandingPage from '@/models/LandingPage';

export interface OrphanImageItem {
  key: string;
  filename: string;
  size: number;
  formattedSize: string;
  lastModified: string;
  url: string;
}

export interface ScanResult {
  prefix: string;
  totalObjects: number;
  totalSize: number;
  formattedTotalSize: string;
  orphanCount: number;
  orphanSize: number;
  formattedOrphanSize: string;
  orphans: OrphanImageItem[];
  scannedAt: string;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Returns the default platform storage prefix (e.g. "swapnobaz/", "dhakafairprice/", or "jiapixel/")
 */
export function getPlatformStoragePrefix(): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
  const platform = rootDomain.split('.')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'swapnobaz';
  return `${platform}/`;
}

/**
 * Scans Cloudflare R2 bucket for unused (orphaned) images.
 * Only flags images that are NOT referenced anywhere in the MongoDB database
 * and are older than minAgeMinutes (default: 60 minutes) to avoid race conditions with active drafting.
 */
export async function scanOrphanR2Images(options?: {
  prefix?: string;
  minAgeMinutes?: number;
}): Promise<ScanResult> {
  const targetPrefix = options?.prefix ?? getPlatformStoragePrefix();
  const minAgeMinutes = options?.minAgeMinutes ?? 60;
  const cutoffTime = Date.now() - minAgeMinutes * 60 * 1000;

  // 1. Fetch all objects from R2 under targetPrefix
  const r2Objects: Array<{ Key: string; Size: number; LastModified: Date }> = [];
  let continuationToken: string | undefined = undefined;

  do {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: targetPrefix,
      ContinuationToken: continuationToken,
    });

    const response = await r2Client.send(listCommand);
    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key && typeof obj.Size === 'number') {
          r2Objects.push({
            Key: obj.Key,
            Size: obj.Size,
            LastModified: obj.LastModified ? new Date(obj.LastModified) : new Date(),
          });
        }
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  const totalObjects = r2Objects.length;
  const totalSize = r2Objects.reduce((acc, curr) => acc + curr.Size, 0);

  // 2. Fetch all image-containing documents from MongoDB
  await connectToDatabase();

  const [
    products,
    categories,
    brands,
    banners,
    sliders,
    blogs,
    users,
    resellers,
    settings,
    landingPages,
  ] = await Promise.all([
    Product.find({}, { images: 1, featuredImage: 1, thumbnail: 1, description: 1 }).lean().catch(() => []),
    Category.find({}, { image: 1, banner: 1 }).lean().catch(() => []),
    Brand.find({}, { logo: 1 }).lean().catch(() => []),
    Banner.find({}, { imageUrl: 1, mobileImageUrl: 1 }).lean().catch(() => []),
    Slider.find({}, { image: 1, mobileImage: 1 }).lean().catch(() => []),
    Blog.find({}, { featuredImage: 1, content: 1 }).lean().catch(() => []),
    User.find({}, { image: 1, avatar: 1 }).lean().catch(() => []),
    Reseller.find({}, { logo: 1, banner: 1, nidImages: 1 }).lean().catch(() => []),
    GlobalSettings.find({}).lean().catch(() => []),
    LandingPage.find({}).lean().catch(() => []),
  ]);

  // Aggregate all database JSON text for instant filename search
  const combinedDbText = JSON.stringify({
    products,
    categories,
    brands,
    banners,
    sliders,
    blogs,
    users,
    resellers,
    settings,
    landingPages,
  });

  // 3. Find orphaned files (files not found in database and older than cutoffTime)
  const orphans: OrphanImageItem[] = [];
  let orphanSize = 0;

  for (const obj of r2Objects) {
    // Filename component (e.g. 1793593494459-8be59971-4ef4-4b98-a1ea-5d34b684b47a.webp)
    const filename = obj.Key.split('/').pop();
    if (!filename) continue;

    // Skip recently uploaded files (within minAgeMinutes)
    if (obj.LastModified.getTime() > cutoffTime) {
      continue;
    }

    // Check if filename appears anywhere in the database text
    const isReferenced = combinedDbText.includes(filename);

    if (!isReferenced) {
      orphanSize += obj.Size;
      orphans.push({
        key: obj.Key,
        filename,
        size: obj.Size,
        formattedSize: formatBytes(obj.Size),
        lastModified: obj.LastModified.toISOString(),
        url: `${R2_PUBLIC_URL}/${obj.Key}`,
      });
    }
  }

  return {
    prefix: targetPrefix,
    totalObjects,
    totalSize,
    formattedTotalSize: formatBytes(totalSize),
    orphanCount: orphans.length,
    orphanSize,
    formattedOrphanSize: formatBytes(orphanSize),
    orphans,
    scannedAt: new Date().toISOString(),
  };
}

/**
 * Deletes specified orphaned keys from Cloudflare R2
 */
export async function purgeOrphanR2Images(keys: string[]): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  if (!keys || keys.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  const deletedCount = await deleteMultipleFromR2(keys);
  return {
    success: true,
    deletedCount,
  };
}
