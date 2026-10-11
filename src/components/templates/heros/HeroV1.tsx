/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

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

export default function HeroV1({ banners }: HeroSliderProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = banners && banners.length > 0 ? banners : null;

  // Fallback slides if DB is empty
  const defaultSlides: Banner[] = [
    {
      _id: 'default-1',
      title: 'Summer reset',
      subtitle: 'Summer/26 collection',
      image: '/placeholder.png',
      link: '/shop',
      primaryBtnText: 'SHOP NOW',
      primaryBtnLink: '/shop'
    },
    {
      _id: 'default-2',
      title: 'Grounded in grace',
      subtitle: 'Summer/26 collection',
      image: '/placeholder.png',
      link: '/shop',
      primaryBtnText: 'SHOP NOW',
      primaryBtnLink: '/shop'
    }
  ];

  const activeSlides = slides || defaultSlides;

  return (
    <div className="relative w-full aspect-[21/9] max-h-[calc(100vh-80px)] overflow-hidden bg-muted group select-none">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        loop={activeSlides.length > 1}
        speed={400}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        onBeforeInit={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.realIndex);
        }}
        className="w-full h-full [&_.swiper-wrapper]:h-full"
      >
        {activeSlides.map((slide, index) => {
          const slideLink = slide.primaryBtnLink || slide.link || '/shop';
          return (
            <SwiperSlide key={slide._id || index} className="w-full h-full relative">
              <Link
                href={slideLink}
                className="block relative w-full h-full cursor-pointer"
              >
                <Image
                  src={slide.image || '/placeholder.png'}
                  alt={slide.title || 'Banner'}
                  fill
                  sizes="100vw"
                  priority={true}
                  loading="eager"
                  className="object-cover w-full h-full object-center pointer-events-none"
                />
              </Link>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Navigation Arrows */}
      {activeSlides.length > 1 && (
        <>
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 outline-none hover:scale-125 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] cursor-pointer"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10 stroke-[1.5]" />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 text-white/80 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 outline-none hover:scale-125 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] cursor-pointer"
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
              onClick={() => swiperRef.current?.slideToLoop(index)}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === index ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
