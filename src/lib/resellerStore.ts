import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import GlobalSettings from '@/models/GlobalSettings';

/**
 * Helper: look up a reseller by subdomain and return their merged settings.
 * Returns null if the subdomain is invalid or reseller is not active.
 */
export async function getResellerBySubdomain(subdomain: string) {
  await dbConnect();

  const reseller = await Reseller.findOne({
    subdomain: subdomain.toLowerCase().trim(),
    status: 'active',
  }).lean();

  if (!reseller) return null;

  // Load Mother settings to fill in any gaps
  const motherSettings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean();

  return { reseller, motherSettings };
}

/**
 * Returns the subdomain from a request using the x-reseller-subdomain header
 * set by the middleware rewrite.
 */
export function getSubdomainFromRequest(req: NextRequest): string | null {
  return req.headers.get('x-reseller-subdomain') || null;
}
