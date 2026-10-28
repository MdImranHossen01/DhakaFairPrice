'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Play, X } from 'lucide-react';

interface ProductVideoThumbnailModalProps {
  videoUrl?: string | null;
  thumbnailImage?: string | null;
  className?: string;
  title?: string;
}

export function ProductVideoThumbnailModal({
  videoUrl,
  thumbnailImage,
  className = 'relative h-20 w-20 flex-shrink-0 rounded-md border-2 overflow-hidden cursor-pointer group',
  title = 'Product Video',
}: ProductVideoThumbnailModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');

  const trimmed = videoUrl?.trim();

  // Extract YouTube ID if applicable
  const ytMatch = trimmed?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  const ytId = ytMatch ? ytMatch[1] : null;

  useEffect(() => {
    if (ytId) {
      setImgSrc(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
    } else if (thumbnailImage) {
      setImgSrc(thumbnailImage);
    } else {
      setImgSrc('/placeholder.png');
    }
  }, [ytId, thumbnailImage]);

  // Lock body scroll and listen for Escape key when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  if (!trimmed) return null;

  return (
    <>
      {/* Thumbnail Card placed first in row */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`relative border-2 border-primary/40 hover:border-primary transition-all group cursor-pointer ${className}`}
        aria-label="Play product video"
        title="Play product video"
      >
        <Image
          src={imgSrc || thumbnailImage || '/placeholder.png'}
          alt={title}
          fill
          sizes="80px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => {
            if (thumbnailImage && imgSrc !== thumbnailImage) {
              setImgSrc(thumbnailImage);
            }
          }}
        />

        {/* Video Overlay with Play Button */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-colors group-hover:bg-black/25">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
            <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* Small "VIDEO" indicator badge */}
        <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white px-1.5 py-0.2 rounded">
          VIDEO
        </div>
      </button>

      {/* Video Modal Popup */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & Close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/70 text-white">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white">
                  <Play className="h-3 w-3 fill-white ml-0.5" />
                </div>
                <span className="text-sm font-semibold truncate max-w-[280px] sm:max-w-md">{title}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close video"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Body */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center">
              {ytId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video
                  src={trimmed}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductVideoThumbnailModal;
