'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BannerForm } from '@/components/admin/BannerForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResellerEditBannerPage() {
  const params = useParams();
  const id = ((params as any)?.id || (Array.isArray((params as any)?.slug) && (params as any).slug[0] === 'cms' && (params as any).slug[1] === 'banners' ? (params as any).slug[2] : undefined)) as string;
  const [banner, setBanner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBanner() {
      try {
        const response = await fetch('/api/reseller/cms/banners');
        if (response.ok) {
          const data = await response.json();
          const found = (data.banners || []).find((b: any) => b._id === id);
          if (found) {
            setBanner(found);
          } else {
            toast.error('Banner not found');
          }
        }
      } catch (error) {
        toast.error('Failed to load banner');
      } finally {
        setLoading(false);
      }
    }
    fetchBanner();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!banner) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Banner not found or could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <BannerForm 
        initialData={banner} 
        apiBase="/api/reseller/cms/banners" 
        redirectPath="/reseller/cms/banners" 
      />
    </div>
  );
}
