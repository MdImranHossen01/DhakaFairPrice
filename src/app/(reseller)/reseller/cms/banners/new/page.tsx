import { BannerForm } from '@/components/admin/BannerForm';

export default function ResellerNewBannerPage() {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <BannerForm 
        apiBase="/api/reseller/cms/banners" 
        redirectPath="/reseller/cms/banners" 
      />
    </div>
  );
}
