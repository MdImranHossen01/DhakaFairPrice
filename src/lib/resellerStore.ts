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

  if (reseller.expiresAt && new Date(reseller.expiresAt) <= new Date()) {
    await Reseller.findByIdAndUpdate(reseller._id, { $set: { status: 'expired' } });
    return null;
  }

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

/**
 * Resolves the active Reseller context from a NextRequest, checking:
 * 1. x-reseller-subdomain header (set by proxy rewrite)
 * 2. Host header subdomain of NEXT_PUBLIC_ROOT_DOMAIN
 * 3. Custom domain matching customDomain field in Reseller collection
 * Returns the active Reseller object or null (Mother Shop context).
 */
export async function getStorefrontReseller(req: NextRequest) {
  try {
    const headerSub = req.headers.get('x-reseller-subdomain');
    await dbConnect();
    if (headerSub) {
      const reseller = await Reseller.findOne({ subdomain: headerSub.toLowerCase().trim(), status: 'active' }).lean();
      if (reseller) return reseller;
    }

    const host = req.headers.get('host') || '';
    const cleanHost = host.split(':')[0].toLowerCase();
    const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase();

    if (cleanHost && cleanHost !== 'localhost' && cleanHost !== '127.0.0.1' && !/^\d+\.\d+\.\d+\.\d+$/.test(cleanHost)) {
      if (rootDomain && cleanHost.endsWith(`.${rootDomain}`)) {
        const sub = cleanHost.replace(`.${rootDomain}`, '');
        if (sub && !['www', 'admin', 'app', 'api', 'static', 'mail'].includes(sub)) {
          return await Reseller.findOne({ subdomain: sub, status: 'active' }).lean();
        }
      } else if (!rootDomain || (cleanHost !== rootDomain && cleanHost !== `www.${rootDomain}`)) {
        const withoutWww = cleanHost.replace(/^www\./, '');
        return await Reseller.findOne({
          $or: [
            { customDomain: cleanHost },
            { customDomain: withoutWww },
            { customDomain: `www.${withoutWww}` }
          ],
          status: 'active'
        }).lean();
      }
    }
  } catch (err) {
    console.error('getStorefrontReseller error:', err);
  }
  return null;
}
