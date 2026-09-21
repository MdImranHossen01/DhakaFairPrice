import { notFound } from 'next/navigation';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import { SettingsProvider } from '@/components/SettingsProvider';
import { ResellerTrackOrder } from '@/components/reseller/ResellerTrackOrder';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subdomain: string }>;
}

export default async function ResellerTrackOrderPage({ params }: Props) {
  const { subdomain } = await params;
  await dbConnect();

  const reseller = await Reseller.findOne({ subdomain, status: 'active' }).lean();
  if (!reseller) notFound();

  const storeName = reseller.storeName || 'Online Shop';
  const logo = reseller.logoUrl || '';

  const settingsData = {
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
    }
  };

  return (
    <SettingsProvider settings={settingsData}>
      <div className="min-h-screen bg-background font-sans">
        {/* Minimal Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="text-sm font-semibold text-primary hover:underline">← {storeName}</Link>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">অর্ডার ট্র্যাকিং</span>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-3xl font-black tracking-tight">{storeName} - অর্ডার ট্র্যাকার</h1>
            <p className="text-sm text-muted-foreground">আপনার অর্ডার ট্র্যাকিং আইডি দিয়ে রিয়েল-টাইম শিপমেন্ট স্ট্যাটাস চেক করুন।</p>
          </div>

          <ResellerTrackOrder subdomain={subdomain} storeName={storeName} />
        </div>
      </div>
    </SettingsProvider>
  );
}
