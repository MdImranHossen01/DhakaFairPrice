'use client';

import React from 'react';
import { Video } from 'lucide-react';

const YoutubeIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

/**
 * Extracts a clean YouTube embed URL from various YouTube link formats
 * (e.g. watch?v=..., youtu.be/..., /embed/..., /shorts/...)
 */
export function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1`;
  }
  return null;
}

interface ProductVideoCardProps {
  videoUrl?: string;
  className?: string;
}

export function ProductVideoCard({ videoUrl, className = '' }: ProductVideoCardProps) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  if (!embedUrl) return null;

  return (
    <div className={`mt-4 w-full rounded-2xl border border-border/70 bg-card p-3 sm:p-4 shadow-xs ${className}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 text-red-600">
          <YoutubeIcon className="h-3.5 w-3.5 text-red-600" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
          Product Video
        </span>
      </div>
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/5 border border-border/40 shadow-inner">
        <iframe
          src={embedUrl}
          title="Product Video"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default ProductVideoCard;
