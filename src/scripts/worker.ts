import fs from 'fs';
import path from 'path';

// Load .env.local manually if running in standalone mode
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const match = line.trim().match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value.trim();
      }
    });
    console.log('[Worker] Environment variables loaded from .env.local');
  }
} catch (e) {
  console.warn('[Worker] Could not load .env.local config:', e);
}

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dbConnect from '../lib/db';
import { syncProductToResellers } from '../lib/syncEngine';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log('[Worker] Starting Queue Worker...');

async function startWorker() {
  try {
    await dbConnect();
    console.log('[Worker] Database connected successfully.');

    const connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    const worker = new Worker(
      'product-sync-queue',
      async (job) => {
        const { productId } = job.data;
        console.log(`[Worker] Processing product sync job ${job.id} for product ${productId}`);
        const result = await syncProductToResellers(productId);
        console.log(`[Worker] Completed job ${job.id}. Resellers updated: ${result.resellersUpdated}. Errors: ${result.errors.length}`);
        if (result.errors.length > 0) {
          throw new Error(result.errors.join(' | '));
        }
        return result;
      },
      {
        connection,
        concurrency: 2,
      }
    );

    worker.on('active', (job) => {
      console.log(`[Worker] Job ${job.id} is now active`);
    });

    worker.on('completed', (job) => {
      console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
    });

    console.log('[Worker] Queue worker listening for jobs...');
  } catch (error) {
    console.error('[Worker] Fatal error starting worker:', error);
    process.exit(1);
  }
}

startWorker();
