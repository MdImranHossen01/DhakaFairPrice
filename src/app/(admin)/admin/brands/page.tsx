'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Plus, Edit, Trash, Loader2, Sparkles, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import { Badge } from '@/components/ui/badge';
import Swal from 'sweetalert2';
import { slugify, sanitizeSlugInput } from '@/lib/slugify';

const brandSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  slug: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
});

type BrandFormValues = z.infer<typeof brandSchema>;

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema) as any,
    defaultValues: {
      name: '',
      slug: '',
      image: '',
      isActive: true,
    },
  });

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/brands?all=true');
      if (res.ok) {
        const data = await res.json();
        setBrands(data);
      }
    } catch (error) {
      console.error('Failed to fetch brands', error);
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const onSubmit = async (values: BrandFormValues) => {
    try {
      setSubmitting(true);
      const url = editingBrand ? `/api/brands/${editingBrand._id}` : '/api/brands';
      const method = editingBrand ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        toast.success(editingBrand ? 'Brand updated successfully' : 'Brand created successfully');
        setOpen(false);
        setEditingBrand(null);
        form.reset();
        fetchBrands();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Operation failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (brand: any) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      slug: brand.slug || '',
      image: brand.image || '',
      isActive: brand.isActive,
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this brand delete!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Brand deleted successfully');
          fetchBrands();
        } else {
          const err = await res.json();
          toast.error(err.message || 'Failed to delete');
        }
      } catch (error) {
        toast.error('Failed to delete brand');
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Brands
          </h1>
          <p className="text-sm text-muted-foreground">Manage your store product brands and manufacturers</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditingBrand(null);
              form.reset({ name: '', slug: '', image: '', isActive: true });
            }
          }}
        >
          <DialogTrigger render={<Button className="rounded-xl shadow-md gap-1" />}>
            <Plus className="h-4 w-4 mr-1" /> Add Brand
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingBrand ? 'Edit Brand' : 'Add New Brand'}
              </DialogTitle>
              <DialogDescription>
                Fill in the brand details below.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Brand Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Nike, Apex, Aarong"
                          {...field}
                          className="h-10 rounded-xl"
                          onChange={(e) => {
                            field.onChange(e);
                            if (!editingBrand) {
                              form.setValue('slug', slugify(e.target.value));
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
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="brand-slug"
                          {...field}
                          className="h-10 rounded-xl font-mono text-xs"
                          onChange={(e) => field.onChange(sanitizeSlugInput(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider">Brand Logo / Image</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={field.value}
                          onUpload={(url) => field.onChange(url)}
                          aspect="square"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={submitting} className="w-full rounded-xl">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingBrand ? 'Update Brand' : 'Create Brand'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[80px]">Logo</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-xl" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : brands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No brands found. Click "Add Brand" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                brands.map((brand) => (
                  <TableRow key={brand._id} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="h-10 w-10 overflow-hidden rounded-xl border bg-muted flex items-center justify-center relative">
                        {brand.image ? (
                          <Image src={brand.image} alt={brand.name} fill sizes="40px" className="object-contain p-1" />
                        ) : (
                          <Tag className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-sm">{brand.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{brand.slug}</TableCell>
                    <TableCell>
                      <Badge variant={brand.isActive ? 'default' : 'secondary'} className="rounded-md">
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-muted"
                          onClick={() => handleEdit(brand)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(brand._id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-2xl bg-card shadow-sm space-y-2">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : brands.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border">
            No brands found.
          </div>
        ) : (
          brands.map((brand) => (
            <div key={brand._id} className="p-4 border rounded-2xl bg-card shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl border bg-muted shrink-0 relative flex items-center justify-center">
                  {brand.image ? (
                    <Image src={brand.image} alt={brand.name} fill sizes="48px" className="object-contain p-1" />
                  ) : (
                    <Tag className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{brand.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{brand.slug}</div>
                </div>
                <Badge variant={brand.isActive ? 'default' : 'secondary'} className="rounded-md shrink-0">
                  {brand.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-end gap-2 border-t pt-2">
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs" onClick={() => handleEdit(brand)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(brand._id)}>
                  <Trash className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
