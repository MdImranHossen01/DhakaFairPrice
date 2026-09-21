'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  ArrowLeft,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

const urlSchema = z.string().optional().refine((val) => {
  if (!val) return true;
  return val.startsWith('http://') || val.startsWith('https://');
}, {
  message: "Must be a full URL starting with http:// or https://"
});

const bannerSchema = z.object({
  title: z.string().optional(),
  image: z.string().min(1, 'Banner image is required'),
  link: urlSchema,
  order: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface BannerFormProps {
  initialData?: any;
  apiBase?: string;
  redirectPath?: string;
}

export function BannerForm({ 
  initialData, 
  apiBase = '/api/admin/banners', 
  redirectPath = '/admin/cms/banners' 
}: BannerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema) as any,
    defaultValues: {
      title: initialData?.title || 'Banner',
      image: initialData?.image || '',
      link: initialData?.link || initialData?.primaryBtnLink || '',
      order: initialData?.order || 0,
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = async (values: BannerFormValues) => {
    setLoading(true);
    try {
      const isResellerApi = apiBase.includes('/api/reseller/');
      const url = initialData 
        ? (isResellerApi ? apiBase : `${apiBase}/${initialData._id}`) 
        : apiBase;
      const method = initialData ? (isResellerApi ? 'PATCH' : 'PUT') : 'POST';
      const payloadData = {
        ...values,
        title: values.title || 'Promotional Banner',
        primaryBtnLink: values.link || '',
      };
      const payload = initialData && isResellerApi ? { ...payloadData, id: initialData._id } : payloadData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`Banner ${initialData ? 'updated' : 'created'} successfully`);
        router.push(redirectPath);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Failed to save banner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {initialData ? 'Edit' : 'Add'} Banner
              </h1>
              <p className="text-sm text-muted-foreground">Upload banner image and optional destination link</p>
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Banner
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Banner Image Upload */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Label className="text-base font-semibold">Banner Image <span className="text-destructive">*</span></Label>
                <div className="w-full">
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onUpload={(url) => field.onChange(url)}
                            className="aspect-[21/9] w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <p className="text-[0.8rem] text-muted-foreground italic">
                  Recommended aspect ratio: 21:9 or 1920x800px for best display across all devices.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Banner Settings (Link, Order & Status) */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-5">
                <FormField
                  control={form.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Banner Click / Destination Link (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourstore.com/shop or https://..." {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        When a customer clicks the banner, they will be redirected to this link.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Display Order</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-7">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium cursor-pointer">Active Status</FormLabel>
                        </div>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}

