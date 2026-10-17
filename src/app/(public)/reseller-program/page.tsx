import { Metadata } from 'next';
import { getCachedResellerProgram } from '@/lib/data-fetching';
import ResellerProgramClient from './ResellerProgramClient';

// SSG / ISR configuration
export const revalidate = 3600; // Background revalidation fallback (1 hour); updated instantly on-demand via revalidateTag('reseller-program')

export async function generateMetadata(): Promise<Metadata> {
  const data = await getCachedResellerProgram();
  return {
    title: data?.hero?.badgeTitle
      ? `${data.hero.badgeTitle} | রিসেলার প্রোগ্রাম`
      : 'রিসেলার প্রোগ্রাম - নিজের কোনো ইনভেস্টমেন্ট ছাড়াই শুরু করুন ই-কমার্স ব্যবসা',
    description:
      data?.hero?.subtitle ||
      'কোনো ইনভেস্টমেন্ট এবং প্রোডাক্ট স্টক ছাড়া নিজের ইকমার্স ব্যবসা শুরু করুন। ৫০,০০০+ ভেরিফাইড প্রোডাক্ট ও অটো ড্রপশিপিং সিস্টেম।',
  };
}

export default async function ResellerProgramPage() {
  const initialData = await getCachedResellerProgram();

  return <ResellerProgramClient initialData={initialData} />;
}
