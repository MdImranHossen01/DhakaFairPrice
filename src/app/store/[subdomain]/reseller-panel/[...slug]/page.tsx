/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const Fallback = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground font-bold">Loading...</p>
    </div>
  </div>
);

// Map slug path → existing reseller page component
const PAGE_MAP: Record<string, React.ComponentType<any>> = {
  'dashboard': dynamic(() => import('@/app/(reseller)/reseller/dashboard/page'), { loading: Fallback }),
  'wallet': dynamic(() => import('@/app/(reseller)/reseller/wallet/page'), { loading: Fallback }),
  'orders': dynamic(() => import('@/app/(reseller)/reseller/orders/page'), { loading: Fallback }),
  'products': dynamic(() => import('@/app/(reseller)/reseller/products/page'), { loading: Fallback }),
  'products/new': dynamic(() => import('@/app/(reseller)/reseller/products/new/page'), { loading: Fallback }),
  'products/source': dynamic(() => import('@/app/(reseller)/reseller/products/source/page'), { loading: Fallback }),
  'abandoned-carts': dynamic(() => import('@/app/(reseller)/reseller/abandoned-carts/page'), { loading: Fallback }),
  'expenses-incomes': dynamic(() => import('@/app/(reseller)/reseller/expenses-incomes/page'), { loading: Fallback }),
  'ledger': dynamic(() => import('@/app/(reseller)/reseller/ledger/page'), { loading: Fallback }),
  'low-stock': dynamic(() => import('@/app/(reseller)/reseller/low-stock/page'), { loading: Fallback }),
  'upcoming-expiry': dynamic(() => import('@/app/(reseller)/reseller/upcoming-expiry/page'), { loading: Fallback }),
  'users': dynamic(() => import('@/app/(reseller)/reseller/users/page'), { loading: Fallback }),
  'cms/banners': dynamic(() => import('@/app/(reseller)/reseller/cms/banners/page'), { loading: Fallback }),
  'cms/banners/new': dynamic(() => import('@/app/(reseller)/reseller/cms/banners/new/page'), { loading: Fallback }),
  'cms/faqs': dynamic(() => import('@/app/(reseller)/reseller/cms/faqs/page'), { loading: Fallback }),
  'cms/testimonials': dynamic(() => import('@/app/(reseller)/reseller/cms/testimonials/page'), { loading: Fallback }),
  'coupons': dynamic(() => import('@/app/(reseller)/reseller/coupons/page'), { loading: Fallback }),
  'settings': dynamic(() => import('@/app/(reseller)/reseller/settings/page'), { loading: Fallback }),
  'marketing': dynamic(() => import('@/app/(reseller)/reseller/marketing/page'), { loading: Fallback }),
};

const DynamicEditProduct = dynamic(() => import('@/app/(reseller)/reseller/products/[id]/edit/page'), { loading: Fallback });
const DynamicEditBanner = dynamic(() => import('@/app/(reseller)/reseller/cms/banners/[id]/edit/page'), { loading: Fallback });

export default function ResellerPanelSubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  const key = slug.join('/');

  // Handle static page mapping
  const Page = PAGE_MAP[key];
  if (Page) {
    return <Page />;
  }

  // Handle dynamic products/[id]/edit
  if (slug.length === 3 && slug[0] === 'products' && slug[2] === 'edit') {
    return <DynamicEditProduct />;
  }

  // Handle dynamic cms/banners/[id]/edit
  if (slug.length === 4 && slug[0] === 'cms' && slug[1] === 'banners' && slug[3] === 'edit') {
    return <DynamicEditBanner />;
  }

  return notFound();
}
