/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash, 
  Loader2, 
  ArrowLeft,
  X,
  PlusCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { slugify, sanitizeSlugInput } from '@/lib/slugify';

const NovelEditor = dynamic(() => import('@/components/editor/NovelEditor'), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full animate-pulse bg-muted rounded-md" />
});

const productSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  slug: z.string().min(3, 'Slug is required'),
  description: z.string().min(10, 'Description is required'),
  tags: z.array(z.string()).default([]),
  price: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  purchasePrice: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  discountRate: z.union([z.coerce.number().min(0).max(100), z.literal('')]).optional(),
  salePrice: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  sku: z.string().optional(),
  stock: z.union([z.coerce.number().int().min(0, 'Stock must be at least 0'), z.literal('')]),
  categories: z.array(z.string()).min(1, 'Select at least one category'),
  images: z.array(z.string()).default([]),
  isFeatured: z.boolean(),
  isNewArrival: z.boolean(),
  isFlashSale: z.boolean().optional(),
  isPublished: z.boolean(),
  isShared: z.boolean(),
  attributes: z.array(z.object({
    key: z.string(),
    value: z.string()
  })),
  variants: z.array(z.object({
    color: z.string().optional(),
    images: z.array(z.string()).default([]),
    sizes: z.array(z.object({
      size: z.string().optional(),
      price: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
      purchasePrice: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
      discountRate: z.union([z.coerce.number().min(0).max(100), z.literal('')]).optional(),
      salePrice: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
      stock: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
      sku: z.string().optional(),
    })).default([]),
  })).default([]),
}).superRefine((data, ctx) => {
  const hasVariants = data.variants && data.variants.length > 0;

  const hasMainImages = data.images && data.images.length > 0;
  const hasVariantImages = data.variants && data.variants.some(v => v.images && v.images.length > 0);
  if (!hasMainImages && !hasVariantImages) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Upload at least one image (either in Gallery Images or in a color variant)',
      path: ['images'],
    });
  }

  if (!hasVariants) {
    const priceVal = data.price === '' || data.price === undefined ? 0 : Number(data.price);
    if (!priceVal || priceVal <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price is required and must be greater than zero',
        path: ['price'],
      });
    }
    if (!data.sku || data.sku.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SKU is required and must be at least 3 characters',
        path: ['sku'],
      });
    }
  } else {
    data.variants.forEach((variant, vIdx) => {
      if (!variant.images || variant.images.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Upload at least one image for this color variant',
          path: ['variants', vIdx, 'images'],
        });
      }
      (variant.sizes || []).forEach((size, sIdx) => {
        const sizePrice = size.price === '' || size.price === undefined ? 0 : Number(size.price);
        if (!sizePrice || sizePrice <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Price is required for each variant size',
            path: ['variants', vIdx, 'sizes', sIdx, 'price'],
          });
        }
        if (!size.sku || size.sku.trim().length < 3) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'SKU is required (min 3 chars)',
            path: ['variants', vIdx, 'sizes', sIdx, 'sku'],
          });
        }
      });
    });
  }
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ResellerProductFormProps {
  initialData?: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ResellerProductForm({ initialData, onCancel, onSuccess }: ResellerProductFormProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const generateDescriptionWithAI = async () => {
    const name = form.getValues('name');
    if (!name || name.trim().length < 3) {
      toast.error('Please enter a product name first');
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const res = await fetch('/api/admin/products/ai-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.description) {
        const plain = data.description.replace(/<[^>]*>/g, '').trim();
        const doc = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: plain }]
            }
          ]
        };
        form.setValue('description', JSON.stringify(doc), { shouldValidate: true, shouldDirty: true });
        toast.success('AI description generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate description');
      }
    } catch {
      toast.error('Failed to generate description');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateSEOTagsWithAI = async () => {
    const name = form.getValues('name');
    const descValue = form.getValues('description');
    let plainTextDesc = '';
    try {
      if (descValue) {
        const parsed = JSON.parse(descValue);
        plainTextDesc = parsed.content?.[0]?.content?.[0]?.text || '';
      }
    } catch {
      plainTextDesc = descValue || '';
    }

    if (!name || name.trim().length < 3) {
      toast.error('Please enter a product name first');
      return;
    }
    setIsGeneratingSEO(true);
    try {
      const res = await fetch('/api/admin/products/ai-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, descriptionText: plainTextDesc }),
      });
      const data = await res.json();
      if (res.ok && data.tags) {
        form.setValue('tags', data.tags, { shouldValidate: true, shouldDirty: true });
        toast.success('AI SEO keywords generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate SEO parameters');
      }
    } catch {
      toast.error('Failed to generate SEO parameters');
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const calculateDiscount = (price: number, salePrice?: number) => {
    if (!price || !salePrice || salePrice >= price) return 0;
    return Math.round((1 - salePrice / price) * 100);
  };

  const defaultValues: ProductFormValues = {
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    tags: initialData?.tags || [],
    price: initialData?.price ?? '',
    purchasePrice: initialData?.purchasePrice ?? '',
    discountRate: calculateDiscount(initialData?.price, initialData?.salePrice) || '',
    salePrice: initialData?.salePrice ?? '',
    sku: initialData?.sku || '',
    stock: initialData?.stock ?? '',
    categories: initialData?.categories?.map((c: any) => typeof c === 'object' ? c._id : c) || [],
    images: (() => {
      const mainImages = initialData?.images || [];
      if (mainImages.length === 1 && initialData?.variants && initialData.variants.length > 0) {
        const variantImages: string[] = [];
        initialData.variants.forEach((v: any) => {
          if (v.images && Array.isArray(v.images) && v.images.length > 0) {
            variantImages.push(v.images[0]);
          } else if (v.image) {
            variantImages.push(v.image);
          }
        });
        if (variantImages.length > 0 && variantImages[0] === mainImages[0]) {
          return [];
        }
      }
      return mainImages;
    })(),
    isPublished: initialData?.isPublished ?? true,
    isFeatured: initialData?.isFeatured ?? false,
    isNewArrival: initialData?.isNewArrival ?? false,
    isFlashSale: initialData?.isFlashSale ?? false,
    isShared: initialData?.isShared ?? false,
    attributes: initialData?.attributes || [],
    variants: (() => {
      if (!initialData?.variants) return [];
      const colorGroups: Record<string, { color: string; images: string[]; sizes: any[] }> = {};
      initialData.variants.forEach((v: any) => {
        const colorKey = v.color || '';
        if (!colorGroups[colorKey]) {
          const variantImages: string[] = [];
          if (v.images && Array.isArray(v.images)) {
            variantImages.push(...v.images);
          } else if (v.image) {
            variantImages.push(v.image);
          }
          colorGroups[colorKey] = {
            color: v.color || '',
            images: variantImages,
            sizes: []
          };
        } else {
          if (v.images && Array.isArray(v.images)) {
            v.images.forEach((img: string) => {
              if (!colorGroups[colorKey].images.includes(img)) {
                colorGroups[colorKey].images.push(img);
              }
            });
          } else if (v.image && !colorGroups[colorKey].images.includes(v.image)) {
            colorGroups[colorKey].images.push(v.image);
          }
        }
        colorGroups[colorKey].sizes.push({
          size: v.size || '',
          price: v.price ?? '',
          purchasePrice: v.purchasePrice ?? '',
          stock: v.stock ?? '',
          discountRate: calculateDiscount(v.price, v.salePrice) || '',
          salePrice: v.salePrice ?? '',
          sku: v.sku || ''
        });
      });
      return Object.values(colorGroups);
    })() || [],
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attributes"
  });
  
  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants"
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
        toast.error('Failed to load categories');
      }
    }
    fetchCategories();
  }, []);

  const nameValue = form.watch('name');
  useEffect(() => {
    if (nameValue && !initialData) {
      form.setValue('slug', slugify(nameValue));
    }
  }, [nameValue, form, initialData]);

  const onSubmit = async (values: ProductFormValues) => {
    setLoading(true);
    const flatVariants: any[] = [];
    (values.variants || []).forEach((cGroup: any) => {
      (cGroup.sizes || []).forEach((sizeInfo: any) => {
        flatVariants.push({
          color: cGroup.color || '',
          images: cGroup.images || [],
          image: cGroup.images?.[0] || '',
          size: sizeInfo.size || '',
          price: sizeInfo.price === '' ? 0 : Number(sizeInfo.price),
          purchasePrice: sizeInfo.purchasePrice === '' ? undefined : Number(sizeInfo.purchasePrice),
          salePrice: sizeInfo.salePrice === '' ? undefined : Number(sizeInfo.salePrice),
          discountRate: sizeInfo.discountRate === '' || isNaN(Number(sizeInfo.discountRate)) ? undefined : Number(sizeInfo.discountRate),
          stock: sizeInfo.stock === '' ? 0 : Number(sizeInfo.stock),
          sku: sizeInfo.sku || '',
        });
      });
    });

    let finalImages = values.images || [];
    if (finalImages.length === 0) {
      const firstVariantWithImages = (values.variants || []).find((v: any) => v.images && v.images.length > 0);
      if (firstVariantWithImages && firstVariantWithImages.images?.[0]) {
        finalImages = [firstVariantWithImages.images[0]];
      }
    }

    const cleanValues = {
      ...values,
      images: finalImages,
      price: values.price === '' ? 0 : Number(values.price),
      purchasePrice: values.purchasePrice === '' ? undefined : Number(values.purchasePrice),
      salePrice: values.salePrice === '' ? undefined : Number(values.salePrice),
      discountRate: values.discountRate === '' || isNaN(Number(values.discountRate)) ? undefined : Number(values.discountRate),
      stock: values.stock === '' ? 0 : Number(values.stock),
      variants: flatVariants,
    };

    try {
      const url = '/api/reseller/products/personal';
      const method = initialData ? 'PATCH' : 'POST';
      const bodyPayload = initialData ? { ...cleanValues, productId: initialData._id } : cleanValues;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (response.ok) {
        toast.success(`Product ${initialData ? 'updated' : 'created'} successfully`);
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.error || error.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const addImage = (url: string) => {
    const currentImages = form.getValues('images');
    form.setValue('images', [...currentImages, url], {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const removeImage = (url: string) => {
    const currentImages = form.getValues('images');
    form.setValue('images', currentImages.filter(i => i !== url), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const toggleCategory = (catId: string) => {
    const currentCats = form.getValues('categories');
    const category = categories.find(c => c._id === catId);
    if (!category) return;

    if (currentCats.includes(catId)) {
      let newCats = currentCats.filter(id => id !== catId);
      if (!category.parentCategory) {
        newCats = newCats.filter(id => {
          const sub = categories.find(c => c._id === id);
          const parentId = sub?.parentCategory?._id || sub?.parentCategory;
          return parentId !== catId;
        });
      }
      form.setValue('categories', newCats, {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else {
      form.setValue('categories', [...currentCats, catId], {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const selectedCats = form.watch('categories');
  const mainCategories = categories.filter((cat) => !cat.parentCategory);
  const selectedMainCategoryIds = mainCategories
    .filter(mc => selectedCats.includes(mc._id))
    .map(mc => mc._id);

  const hasMainCategory = selectedMainCategoryIds.length > 0;

  return (
    <Form {...form}>
      <form
          onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.error('Form validation errors:', errors);
            const hasVariants = (form.getValues('variants') || []).length > 0;
            if (hasVariants) {
              toast.error('Please fill in all mandatory variant details (Price and SKU for each size).');
            } else {
              toast.error('Please fix the form errors before saving.');
            }
          })}
          className="space-y-8 pb-10"
      >
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-4">
            <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={onCancel}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {initialData ? 'ব্যক্তিগত পণ্য সম্পাদনা করুন' : 'নতুন ব্যক্তিগত পণ্য তৈরি করুন'}
              </h1>
              <p className="text-sm text-muted-foreground">আপনার স্টোরের জন্য প্রিমিয়াম পণ্য যুক্ত করুন</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>বাতিল</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              সংরক্ষণ করুন
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>পণ্যের নাম *</FormLabel>
                      <FormControl>
                        <Input placeholder="প্রিমিয়াম পাঞ্জাবি" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>স্লাগ (Slug)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="product-slug" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(sanitizeSlugInput(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          SKU (কোড)
                          {variantFields.length > 0
                            ? <span className="ml-1 text-xs font-normal text-muted-foreground">(ঐচ্ছিক)</span>
                            : <span className="ml-1 text-xs font-normal text-destructive">*</span>
                          }
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="STK-001" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1">
                        <FormLabel>পণ্যের বিবরণ *</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-primary/20 text-xs font-semibold"
                          onClick={generateDescriptionWithAI}
                          disabled={isGeneratingDescription}
                        >
                          {isGeneratingDescription ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
                          )}
                          AI দিয়ে বিবরণ লিখুন
                        </Button>
                      </div>
                      <FormControl>
                        <div className="min-h-[300px] border rounded-md overflow-hidden bg-background prose-sm max-w-none">
                          <NovelEditor 
                            initialValue={(() => {
                              try {
                                return field.value ? JSON.parse(field.value) : undefined;
                              } catch (e) {
                                return {
                                  type: 'doc',
                                  content: [{ type: 'paragraph', content: [{ type: 'text', text: field.value }] }]
                                };
                              }
                            })()} 
                            onChange={field.onChange} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Gallery Images */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Label className="text-base font-bold">পণ্যের গ্যালারি ইমেজসমূহ</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {form.watch('images').map((url, index) => (
                    <div key={`${url}-${index}`} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                      <Image 
                        src={url} 
                        alt={`Product image ${index + 1}`} 
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <ImageUpload onUpload={addImage} compact />
                </div>
                {form.formState.errors.images?.message && (
                  <p className="text-[0.8rem] font-medium text-destructive">
                    {form.formState.errors.images.message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Variations Card */}
            <Card className="border-primary/20 shadow-sm overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" /> 
                    ভ্যারিয়েশন ম্যানেজার (সাইজ ও কালার)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">প্রতিটি কালার ভ্যারিয়েন্টের জন্য ছবি এবং সাইজ সেট করুন।</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="bg-background hover:bg-primary hover:text-white transition-all border-primary/20"
                  onClick={() => appendVariant({ color: '', images: [], sizes: [{ size: '', price: form.getValues('price') || '', stock: '', sku: '' }] })}
                >
                  <Plus className="mr-2 h-4 w-4" /> কালার ভ্যারিয়েন্ট যোগ করুন
                </Button>
              </div>
              <CardContent className="p-6">
                {variantFields.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-muted rounded-xl text-muted-foreground italic text-sm">
                    কোনো ভ্যারিয়েশন যোগ করা হয়নি। শুরু করতে "কালার ভ্যারিয়েন্ট যোগ করুন" ক্লিক করুন।
                  </div>
                ) : (
                  <div className="space-y-6">
                    {variantFields.map((field, colorIndex) => {
                      const colorImages = form.watch(`variants.${colorIndex}.images`) || [];
                      
                      return (
                        <div key={field.id} className="border border-muted rounded-xl p-4 md:p-6 bg-muted/10 relative space-y-6">
                          <button
                            type="button"
                            onClick={() => removeVariant(colorIndex)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash className="h-5 w-5" />
                          </button>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-bold">কালার নাম</Label>
                              <Input 
                                {...form.register(`variants.${colorIndex}.color` as const)} 
                                placeholder="যেমন: লাল" 
                                className="h-10 bg-background"
                              />
                            </div>

                            <div className="lg:col-span-2 space-y-2">
                              <Label className="text-sm font-bold">কালার ইমেজসমূহ</Label>
                              <div className="flex flex-wrap gap-2 items-center">
                                {colorImages.map((imgUrl: string, imgIdx: number) => (
                                  <div key={imgIdx} className="relative h-16 w-16 rounded-lg overflow-hidden border bg-background group">
                                    <Image 
                                      src={imgUrl} 
                                      alt="" 
                                      fill 
                                      className="object-cover" 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedImages = [...colorImages];
                                        updatedImages.splice(imgIdx, 1);
                                        form.setValue(`variants.${colorIndex}.images`, updatedImages);
                                      }}
                                      className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                <ImageUpload 
                                  onUpload={(url) => {
                                    form.setValue(`variants.${colorIndex}.images`, [...colorImages, url]);
                                    form.trigger(`variants.${colorIndex}.images` as any);
                                  }} 
                                  compact 
                                  className="h-16 w-16"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-muted/50">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">সাইজ ও মূল্য তালিকা</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentSizes = form.getValues(`variants.${colorIndex}.sizes`) || [];
                                  form.setValue(`variants.${colorIndex}.sizes`, [
                                    ...currentSizes,
                                    { size: '', price: form.getValues('price') || '', stock: '', sku: '' }
                                  ]);
                                }}
                              >
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> সাইজ যোগ করুন
                              </Button>
                            </div>

                            <div className="space-y-4">
                              {((form.watch(`variants.${colorIndex}.sizes`) as any[]) || []).map((sizeField, sizeIndex) => {
                                return (
                                  <div key={sizeIndex} className="border border-muted/40 rounded-lg p-4 bg-background relative space-y-4">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentSizes = form.getValues(`variants.${colorIndex}.sizes`) || [];
                                        const updatedSizes = [...currentSizes];
                                        updatedSizes.splice(sizeIndex, 1);
                                        form.setValue(`variants.${colorIndex}.sizes`, updatedSizes);
                                      }}
                                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors p-1"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>

                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">সাইজ</Label>
                                        <Input
                                          {...form.register(`variants.${colorIndex}.sizes.${sizeIndex}.size` as const)}
                                          placeholder="যেমন: XL"
                                          className="h-9 mt-1"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                          বিক্রয় মূল্য <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                          type="number"
                                          value={form.watch(`variants.${colorIndex}.sizes.${sizeIndex}.price`) ?? ''}
                                          className="h-9 mt-1"
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                                            form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.price`, val, { shouldValidate: form.formState.isSubmitted });
                                            const disc = form.getValues(`variants.${colorIndex}.sizes.${sizeIndex}.discountRate`) || 0;
                                            if (disc > 0 && val !== '') {
                                              form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.salePrice`, Math.round(val * (1 - disc / 100)));
                                            }
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">ক্রয় মূল্য</Label>
                                        <Input
                                          type="number"
                                          value={form.watch(`variants.${colorIndex}.sizes.${sizeIndex}.purchasePrice`) ?? ''}
                                          className="h-9 mt-1"
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                                            form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.purchasePrice`, val);
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">স্টক</Label>
                                        <Input
                                          type="number"
                                          value={form.watch(`variants.${colorIndex}.sizes.${sizeIndex}.stock`) ?? ''}
                                          className="h-9 mt-1"
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                            form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.stock`, val);
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">
                                          SKU (কোড) *
                                        </Label>
                                        <Input
                                          {...form.register(`variants.${colorIndex}.sizes.${sizeIndex}.sku` as const)}
                                          placeholder="SKU"
                                          className="h-9 mt-1"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">ডিসকাউন্ট (%)</Label>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          value={form.watch(`variants.${colorIndex}.sizes.${sizeIndex}.discountRate`) ?? ''}
                                          className="h-9 mt-1"
                                          onChange={(e) => {
                                            const disc = e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0);
                                            form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.discountRate`, disc);
                                            const prc = form.getValues(`variants.${colorIndex}.sizes.${sizeIndex}.price`) || 0;
                                            if (prc > 0 && disc !== undefined) {
                                              form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.salePrice`, Math.round(prc * (1 - disc / 100)));
                                            } else {
                                              form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.salePrice`, undefined);
                                            }
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">অফার মূল্য</Label>
                                        <Input
                                          type="number"
                                          placeholder="ঐচ্ছিক"
                                          value={form.watch(`variants.${colorIndex}.sizes.${sizeIndex}.salePrice`) ?? ''}
                                          className="h-9 mt-1"
                                          onChange={(e) => {
                                            const sale = e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0);
                                            form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.salePrice`, sale);
                                            const prc = form.getValues(`variants.${colorIndex}.sizes.${sizeIndex}.price`) || 0;
                                            if (prc > 0 && sale !== undefined && sale > 0 && sale < prc) {
                                              form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.discountRate`, Math.round((1 - sale / prc) * 100));
                                            } else {
                                              form.setValue(`variants.${colorIndex}.sizes.${sizeIndex}.discountRate`, undefined);
                                            }
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Base Pricing & Stock */}
            <Card>
              <CardContent className="pt-6">
                {variantFields.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 rounded-md bg-muted/60 border border-muted px-4 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-primary">ℹ️ ভ্যারিয়েন্ট পাওয়া গেছে:</span>
                    নিচের প্রাইস এবং স্টক অপশনাল, কাস্টমার কেনার সময় ভ্যারিয়েন্ট অনুযায়ী মূল্য কার্যকর হবে।
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          নিয়মিত মূল্য (Tk)
                          {variantFields.length > 0
                            ? <span className="ml-1 text-xs font-normal text-muted-foreground">(ঐচ্ছিক)</span>
                            : <span className="ml-1 text-xs font-normal text-destructive">*</span>
                          }
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                              field.onChange(value);
                              const prc = value === '' ? 0 : value;
                              const discount = form.getValues('discountRate') || 0;
                              if (discount > 0 && prc > 0) {
                                const newSale = prc * (1 - discount / 100);
                                form.setValue('salePrice', Math.round(newSale));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ক্রয় মূল্য/খরচ (Tk)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ডিসকাউন্ট (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0"
                            {...field} 
                            value={field.value || ''}
                            onChange={(e) => {
                              const discount = e.target.value === '' ? undefined : (parseFloat(e.target.value) || 0);
                              field.onChange(discount);
                              const price = form.getValues('price') || 0;
                              if (price > 0 && discount !== undefined) {
                                const newSale = price * (1 - discount / 100);
                                form.setValue('salePrice', Math.round(newSale));
                              } else {
                                form.setValue('salePrice', undefined);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>অফার মূল্য (Tk)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00"
                            {...field} 
                            value={field.value || ''}
                            onChange={(e) => {
                              const sale = parseFloat(e.target.value) || 0;
                              field.onChange(sale);
                              const price = form.getValues('price') || 0;
                              if (price > 0 && sale > 0 && sale < price) {
                                const newDiscount = Math.round((1 - sale / price) * 100);
                                form.setValue('discountRate', newDiscount);
                              } else {
                                form.setValue('discountRate', undefined);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>স্টক পরিমাণ</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Category Select */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">পণ্য ক্যাটাগরি *</Label>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {mainCategories.map((mainCat) => (
                    <Badge
                      key={mainCat._id}
                      variant={selectedCats.includes(mainCat._id) ? 'default' : 'outline'}
                      className="cursor-pointer py-1.5 px-4 text-sm"
                      onClick={() => toggleCategory(mainCat._id)}
                    >
                      {mainCat.name}
                    </Badge>
                  ))}
                </div>
                {!hasMainCategory && form.formState.isSubmitted && (
                  <p className="text-[0.8rem] font-medium text-destructive">
                    অন্তত একটি ক্যাটাগরি সিলেক্ট করুন
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Subcategory Select */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">সাব-ক্যাটাগরি</Label>
                </div>
                <div className="space-y-4 pt-2">
                  {selectedMainCategoryIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {categories
                        .filter((sub) => {
                          const parentId = sub.parentCategory?._id || sub.parentCategory;
                          return selectedMainCategoryIds.includes(parentId);
                        })
                        .map((subCat) => (
                          <Badge
                            key={subCat._id}
                            variant={selectedCats.includes(subCat._id) ? 'default' : 'outline'}
                            className="cursor-pointer py-1 px-3 text-xs"
                            onClick={() => toggleCategory(subCat._id)}
                          >
                            {subCat.name}
                          </Badge>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      সাব-ক্যাটাগরি দেখতে আগে ক্যাটাগরি সিলেক্ট করুন
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SEO & Tags */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-bold">SEO ট্যাগ ও কিওয়ার্ডস</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-primary/20 text-xs font-semibold"
                    onClick={generateSEOTagsWithAI}
                    disabled={isGeneratingSEO}
                  >
                    {isGeneratingSEO ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
                    )}
                    AI দিয়ে ট্যাগ জেনারেট করুন
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="ট্যাগ লিখে এন্টার চাপুন"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = tagInput.trim();
                        if (val) {
                          const currentTags = form.getValues('tags') || [];
                          if (!currentTags.includes(val)) {
                            form.setValue('tags', [...currentTags, val], { shouldDirty: true });
                          }
                          setTagInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const val = tagInput.trim();
                      if (val) {
                        const currentTags = form.getValues('tags') || [];
                        if (!currentTags.includes(val)) {
                          form.setValue('tags', [...currentTags, val], { shouldDirty: true });
                        }
                        setTagInput('');
                      }
                    }}
                  >
                    যোগ
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(form.watch('tags') || []).map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {t}
                      <button
                        type="button"
                        onClick={() => {
                          const currentTags = form.getValues('tags') || [];
                          form.setValue('tags', currentTags.filter(item => item !== t), { shouldDirty: true });
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Visibility Settings */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="featured">ফিচার্ড প্রোডাক্ট</Label>
                    <input 
                        type="checkbox" 
                        id="featured"
                        {...form.register('isFeatured')} 
                        className="h-4 w-4 accent-primary cursor-pointer hover:scale-110 transition-transform" 
                    />
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="new-arrival">নতুন আগমন (New Arrival)</Label>
                    <input 
                        type="checkbox" 
                        id="new-arrival"
                        {...form.register('isNewArrival')} 
                        className="h-4 w-4 accent-primary cursor-pointer hover:scale-110 transition-transform" 
                    />
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="flash-sale">ফ্ল্যাশ সেল (Flash Sale)</Label>
                    <input 
                        type="checkbox" 
                        id="flash-sale"
                        {...form.register('isFlashSale')} 
                        className="h-4 w-4 accent-primary cursor-pointer hover:scale-110 transition-transform" 
                    />
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="published">পাবলিশ করুন (স্টোরে লাইভ দেখাবে)</Label>
                    <input 
                        type="checkbox" 
                        id="published"
                        {...form.register('isPublished')} 
                        className="h-4 w-4" 
                    />
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                    <Label htmlFor="isShared" className="font-bold text-primary">অন্যান্য রিসেলারদের বিক্রয়ের জন্য শেয়ার করুন</Label>
                    <input 
                        type="checkbox" 
                        id="isShared"
                        {...form.register('isShared')} 
                        className="h-5 w-5 accent-primary cursor-pointer hover:scale-110 transition-transform" 
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
