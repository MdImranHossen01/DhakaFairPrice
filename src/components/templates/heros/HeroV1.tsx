/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface Banner {
  _id?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
  primaryBtnText?: string;
  primaryBtnLink?: string;
  secondaryBtnText?: string;
  secondaryBtnLink?: string;
}

interface HeroSliderProps {
  banners: Banner[];
  layout?: string;
}

const AUTOPLAY_DELAY = 5000;

export default function HeroV1({ banners, layout }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slides = banners && banners.length > 0 ? banners : null;

  // Initialize Embla Carousel
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      duration: 40,
    },
    [Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: false })]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    // Defer the initial selection update to avoid synchronous setState during render/effect phase
    const timeoutId = setTimeout(() => {
      onSelect();
    }, 0);

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      clearTimeout(timeoutId);
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Fallback slides if DB is empty
  const defaultSlides: Banner[] = [
    {
      _id: 'default-1',
      title: 'Summer reset',
      subtitle: 'Summer/26 collection',
      image: '/placeholder.png', // Fallback
      link: '/shop',
      primaryBtnText: 'SHOP NOW',
      primaryBtnLink: '/shop'
    },
    {
      _id: 'default-2',
      title: 'Grounded in grace',
      subtitle: 'Summer/26 collection',
      image: '/placeholder.png', // Fallback
      link: '/shop',
      primaryBtnText: 'SHOP NOW',
      primaryBtnLink: '/shop'
    }
  ];

  const activeSlides = slides || defaultSlides;

  return (
    <div className="relative w-full aspect-[21/9] max-h-[calc(100vh-80px)] overflow-hidden bg-muted group">

      {/* Embla Viewport */}
      <div className="w-full h-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {activeSlides.map((slide, index) => {
            const slideLink = slide.primaryBtnLink || slide.link || '/shop';
            return (
              <div key={slide._id || index} className="relative flex-none w-full h-full select-none">
                <Link
                  href={slideLink}
                  className="block relative w-full h-full cursor-pointer"
                >
                  <Image
                    src={slide.image || '/placeholder.png'}
                    alt={slide.title || 'Aarong Collection'}
                    fill
                    className="object-cover w-full h-full object-center"
                    priority={index === 0}
                  />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Arrows */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 outline-none hover:scale-125 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.5]" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 outline-none hover:scale-125 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            aria-label="Next slide"
          >
            <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.5]" />
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {activeSlides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2.5 z-20">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${activeIndex === index ? 'w-8 bg-white' : 'w-2.5 bg-white/40'
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

    </div>
  );
}
