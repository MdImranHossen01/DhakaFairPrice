import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import { SettingsProvider } from '@/components/SettingsProvider';
import { NavbarSelector } from '@/components/templates/Registry';
import { FooterSelector } from '@/components/templates/ServerRegistry';
import DashboardLayout from '@/app/(public)/dashboard/layout';
import { ResellerPixels } from '@/components/reseller/ResellerPixels';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subdomain: string }>;
  children: React.ReactNode;
}

export default async function StoreDashboardLayout({ params, children }: Props) {
  const { subdomain } = await params;
  await dbConnect();

  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) notFound();

  const storeName = reseller.storeName || 'Online Shop';
  const logo = reseller.logoUrl || '';

  const settingsData = {
    isReseller: true,
    brandName: storeName,
    logoUrl: logo,
    contact: {
      email: reseller.contact?.email,
      phone: reseller.contact?.phone,
      address: reseller.contact?.address,
    },
    socialLinks: {
      facebook: reseller.socialLinks?.facebook,
      whatsapp: reseller.socialLinks?.whatsapp,
    },
    uiTemplates: (reseller as any).uiTemplates || {
      navbar: 'v1',
      footer: 'v1',
    }
  };

  const navStyle = (reseller as any).uiTemplates?.navbar || 'v1';
  const footerStyle = (reseller as any).uiTemplates?.footer || 'v1';

  return (
    <SettingsProvider settings={settingsData}>
      <div className="min-h-screen bg-background font-sans flex flex-col">
        <ResellerPixels 
          subdomain={subdomain} 
          metaPixelId={reseller.seoConfig?.metaPixelId} 
          tiktokPixelId={reseller.seoConfig?.tiktokPixelId} 
        />
        <NavbarSelector style={navStyle} />
        <main className="flex-1 py-4 md:py-8">
          <DashboardLayout>{children}</DashboardLayout>
        </main>
        <FooterSelector style={footerStyle} />
      </div>
    </SettingsProvider>
  );
}
