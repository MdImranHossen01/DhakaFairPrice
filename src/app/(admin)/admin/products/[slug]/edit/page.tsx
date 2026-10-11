'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/components/admin/ProductForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditProductPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${slug}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Product not found');
        const data = await res.json();
        setProduct(data);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching product:', error);
          toast.error('Failed to load product');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchProduct();

    return () => controller.abort();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Product not found.</p>
      </div>
    );
  }

  if ((product as any).uploadedBy) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-card border rounded-2xl shadow-sm text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xl">
          ⚠️
        </div>
        <h3 className="text-lg font-bold text-foreground">Reseller-Owned Product</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This product is managed by reseller store <strong>{(product as any).uploadedBy?.storeName || 'Reseller'}</strong>.
          Mother Store Admin cannot edit, restock, or delete reseller-uploaded products.
        </p>
        <div className="pt-2">
          <a
            href="/admin/products"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90"
          >
            Back to Products List
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <ProductForm initialData={product} />
    </div>
  );
}

