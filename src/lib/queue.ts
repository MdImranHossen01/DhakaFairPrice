import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let queue: Queue | null = null;
let isQueueActive = false;
let redisConnection: IORedis | null = null;

try {
  redisConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    showFriendlyErrorStack: true,
  });

  redisConnection.on('error', (err) => {
    console.warn('[Queue] Redis connection failed, background queue is disabled:', err.message);
    isQueueActive = false;
  });

  redisConnection.on('connect', () => {
    console.log('[Queue] Connected to Redis successfully. Background queue active.');
    isQueueActive = true;
  });

  redisConnection.on('close', () => {
    console.log('[Queue] Redis connection closed.');
    isQueueActive = false;
  });

  redisConnection.on('end', () => {
    console.log('[Queue] Redis connection ended.');
    isQueueActive = false;
  });

  queue = new Queue('product-sync-queue', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  });
} catch (e: any) {
  console.warn('[Queue] Failed to initialize BullMQ queue:', e.message);
}

export async function enqueueProductSync(productId: string): Promise<boolean> {
  if (!queue || !isQueueActive) {
    return false;
  }
  try {
    const enqueuePromise = queue.add('sync-product', { productId });
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error('Queue operation timed out')), 5000)
    );
    await Promise.race([enqueuePromise, timeoutPromise]);
    console.log(`[Queue] Enqueued sync job for product: ${productId}`);
    return true;
  } catch (error: any) {
    console.error(`[Queue] Failed to enqueue sync job for product ${productId}:`, error.message);
    return false;
  }
}

export { queue, isQueueActive, redisConnection };
