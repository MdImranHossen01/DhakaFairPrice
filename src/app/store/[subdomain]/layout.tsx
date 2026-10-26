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
  const reseller = await Reseller.findOne({ subdomain }).select('storeName logoUrl faviconUrl description customDomain').lean() as any;
  if (!reseller) return { title: 'Store Not Found' };

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
  const rawDomain = reseller.customDomain || `${subdomain}.${rootDomain}`;
  const storeDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const baseUrl = `https://${storeDomain}`;
  const favicon = reseller.faviconUrl || reseller.logoUrl || '/favicon.ico';

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: reseller.storeName,
      template: `%s | ${reseller.storeName}`,
    },
    description: reseller.description || `Shop at ${reseller.storeName}`,
    alternates: {
      canonical: baseUrl,
    },
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
      url: baseUrl,
      images: reseller.logoUrl ? [{ url: reseller.logoUrl }] : [],
    },
  };
}

export default async function ResellerStoreLayout({ 
  params, 
  children 
}: { 
  params: Promise<{ subdomain: string }>; 
  children: React.ReactNode; 
}) {
  const { subdomain } = await params;
  return (
    <>
      <meta name="reseller-subdomain" content={subdomain} />
      {children}
    </>
  );
}
