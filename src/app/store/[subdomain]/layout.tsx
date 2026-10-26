import type { Metadata } from 'next';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import Script from 'next/script';

interface Props {
  params: Promise<{ subdomain: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: { params: Promise<{ subdomain: string }> }): Promise<Metadata> {
  const { subdomain } = await params;
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain }).select('storeName logoUrl faviconUrl description customDomain seoConfig').lean() as any;
  if (!reseller) return { title: 'Store Not Found' };

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
  const rawDomain = reseller.customDomain || `${subdomain}.${rootDomain}`;
  const storeDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const baseUrl = `https://${storeDomain}`;
  const favicon = reseller.faviconUrl || reseller.logoUrl || '/favicon.ico';

  const rawVerification = reseller.seoConfig?.googleSiteVerification?.trim() || '';
  const match = rawVerification.match(/content=["']([^"']+)["']/i);
  const googleVerification = match ? match[1] : rawVerification;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: reseller.storeName,
      template: `%s | ${reseller.storeName}`,
    },
    description: reseller.description || `Shop at ${reseller.storeName}`,
    verification: googleVerification ? { google: googleVerification } : undefined,
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
  await dbConnect();
  const reseller = await Reseller.findOne({ subdomain }).select('seoConfig').lean() as any;

  const gaId = reseller?.seoConfig?.googleAnalyticsId?.trim();
  const gtmId = reseller?.seoConfig?.googleTagManagerId?.trim();

  const isValidGA = gaId && /^(G-[A-Z0-9]+|UA-[0-9-]+)$/i.test(gaId);
  const isValidGTM = gtmId && /^GTM-[A-Z0-9]+$/i.test(gtmId);

  return (
    <>
      <meta name="reseller-subdomain" content={subdomain} />

      {isValidGA && (
        <>
          <Script
            id={`ga-reseller-${subdomain}`}
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <Script
            id={`ga-init-reseller-${subdomain}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `,
            }}
          />
        </>
      )}

      {isValidGTM && (
        <>
          <Script
            id={`gtm-reseller-${subdomain}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'dataLayer','${gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {children}
    </>
  );
}
