'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

interface CategoryShowcaseProps {
  categories: Category[];
}

export default function CategoryAarong({ categories }: CategoryShowcaseProps) {
  // Reverse main categories to display them in chronological order (Women to Wedding)
  const displayCategories = categories && categories.length > 0 ? [...categories].reverse() : [];

  return (
    <section className="bg-background">
      <div className="w-full px-4 lg:px-6">
        
        {/* Aarong style Grid with minimal padding & gap */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3 pt-2 pb-4">
          {displayCategories.map((category) => (
            <Link
              key={category._id}
              href={`/shop?category=${encodeURIComponent(category.slug)}`}
              className="group block overflow-hidden transition-all duration-300"
            >
              {/* Image Container */}
              <div className="relative aspect-square overflow-hidden bg-muted">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/40 text-muted-foreground uppercase tracking-widest text-[10px] font-bold">
                    No Image
                  </div>
                )}
              </div>

              {/* Title Strip underneath */}
              <div className="bg-background py-3 text-center">
                <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-[0.15em] transition-colors group-hover:text-primary">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
        
      </div>
    </section>
  );
}
