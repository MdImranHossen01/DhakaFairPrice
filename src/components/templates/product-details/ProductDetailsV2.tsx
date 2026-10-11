/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProductDetailsV2Client from './ProductDetailsV2Client';
import Script from 'next/script';
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo';
import { notFound } from 'next/navigation';

const sanitizeForScript = (json: any) => {
  return JSON.stringify(json).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
};

export default async function ProductDetailsV2({ product }: { product: any }) {
  if (!product) {
    notFound();
  }

  const productSchema = await generateProductSchema(product);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', item: '/' },
    { name: 'Shop', item: '/shop' },
    { name: product.name || 'Product', item: `/product/${product.slug || 'unknown-product'}` }
  ]);

  return (
    <div className="w-full px-4 lg:px-8 mx-auto py-4 md:py-6">
      {productSchema && (
        <Script
          id="product-schema-v2"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeForScript(productSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-v2"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeForScript(breadcrumbSchema) }}
        />
      )}

      {/* Aarong Style Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground/80 px-1 lg:px-2">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{product.name}</span>
      </div>

      <div className="p-0">
        <ProductDetailsV2Client product={product} />
      </div>
    </div>
  );
}
