import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import { ResellerCheckout } from '@/components/reseller/ResellerCheckout';
import { NavbarSelector } from '@/components/templates/Registry';
import { FooterSelector } from '@/components/templates/ServerRegistry';
import { SettingsProvider } from '@/components/SettingsProvider';
import { FreeDeliveryBanner } from '@/components/storefront/FreeDeliveryBanner';
import { ResellerPixels } from '@/components/reseller/ResellerPixels';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean() as any;
  if (!reseller) return { title: 'Checkout' };
  return {
    title: `Checkout — ${reseller.storeName}`,
    description: `Complete your order at ${reseller.storeName}`,
  };
}

export default async function ResellerCheckoutPage({ params }: Props) {
  const { subdomain } = await params;
  await dbConnect();

  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean() as any;
  if (!reseller) notFound();

  const GlobalSettings = (await import('@/models/GlobalSettings')).default;
  const globalSettings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean() as any;
  const stripeActive = globalSettings?.paymentConfig?.activeMethod === 'stripe';

  const freeDeliveryThreshold = reseller.deliveryConfig?.freeDeliveryThreshold || 0;

  const storeInfo = {
    storeName: reseller.storeName,
    deliveryInside: reseller.deliveryConfig?.insideDhaka ?? 60,
    deliveryOutside: reseller.deliveryConfig?.outsideDhaka ?? 120,
    freeDeliveryThreshold,
    loyaltyConfig: reseller.loyaltyConfig || { isEnabled: false, activationThreshold: 5000, rewardPercentage: 5 },
    paymentConfig: reseller.paymentConfig as any,
    stripeActive,
    // Pass pixel IDs so ResellerCheckout can fire Purchase events
    metaPixelId: reseller.seoConfig?.metaPixelId,
    tiktokPixelId: reseller.seoConfig?.tiktokPixelId,
  };

  const themeOverrides = (reseller.themeOverrides as any) || {};
  const navStyle = themeOverrides.navbar || 'v1';
  const footerStyle = themeOverrides.footer || 'v1';

  const settingsData = {
    brandName: reseller.storeName,
    logoUrl: reseller.logoUrl,
    freeDeliveryThreshold,
    contact: {
      email: reseller.contact?.email,
      phone: reseller.contact?.phone,
      address: reseller.contact?.address,
    },
    socialLinks: {
      facebook: reseller.socialLinks?.facebook,
      whatsapp: reseller.socialLinks?.whatsapp,
    }
  };

  return (
    <SettingsProvider settings={settingsData}>
      <div className="min-h-screen bg-background font-sans flex flex-col">
        <FreeDeliveryBanner settings={settingsData} />
        <ResellerPixels
          subdomain={subdomain}
          metaPixelId={reseller.seoConfig?.metaPixelId}
          tiktokPixelId={reseller.seoConfig?.tiktokPixelId}
        />
        <NavbarSelector style={navStyle} />
        <main className="flex-1">
          <ResellerCheckout
            subdomain={subdomain}
            storeInfo={storeInfo}
            resellerId={reseller._id.toString()}
          />
        </main>
        <FooterSelector style={footerStyle} />
      </div>
    </SettingsProvider>
  );
}
