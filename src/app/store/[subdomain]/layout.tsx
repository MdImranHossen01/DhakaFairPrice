import type { Metadata } from 'next';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';

interface Props {
  params: Promise<{ subdomain: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
  const { subdomain } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain }).select('storeName logoUrl faviconUrl description').lean();
  if (!reseller) return { title: 'Store Not Found' };

  const favicon = reseller.faviconUrl || reseller.logoUrl || '/favicon.ico';

  return {
    title: {
      default: reseller.storeName,
      template: `%s | ${reseller.storeName}`,
    },
    description: reseller.description || `Shop at ${reseller.storeName}`,
    icons: {
      icon: [
        { url: favicon },
        { url: favicon, sizes: '32x32' },
        { url: favicon, sizes: '16x16' },
      ],
      shortcut: favicon,
      apple: reseller.logoUrl || favicon,
    },
    openGraph: {
      title: reseller.storeName,
      description: reseller.description || `Shop at ${reseller.storeName}`,
      images: reseller.logoUrl ? [{ url: reseller.logoUrl }] : [],
    },
  };
}

export default function ResellerStoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
