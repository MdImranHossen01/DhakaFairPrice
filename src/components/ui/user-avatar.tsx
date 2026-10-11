'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  imageClassName?: string;
}

export function UserAvatar({
  src,
  name,
  size = 32,
  className,
  imageClassName,
}: UserAvatarProps) {
  const [errorCount, setErrorCount] = useState(0);

  // Reset error counter if src changes
  useEffect(() => {
    setErrorCount(0);
  }, [src]);

  const cleanSrc = src && src !== 'null' && src !== 'undefined' && src.trim() !== '' ? src.trim() : null;
  const displayName = name?.trim() || 'User';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0D8ABC&color=fff`;

  // Determine current image source to attempt
  let activeSrc: string | null = null;
  if (errorCount === 0) {
    activeSrc = cleanSrc || defaultAvatar;
  } else if (errorCount === 1 && cleanSrc && cleanSrc !== defaultAvatar) {
    activeSrc = defaultAvatar;
  } else {
    activeSrc = null; // Display initials / icon fallback
  }

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold select-none shrink-0",
        className
      )}
      style={{ width: size, height: size }}
    >
      {activeSrc ? (
        <Image
          src={activeSrc}
          alt={displayName}
          width={size}
          height={size}
          className={cn("h-full w-full object-cover", imageClassName)}
          referrerPolicy="no-referrer"
          unoptimized
          onError={() => setErrorCount((prev) => prev + 1)}
        />
      ) : (
        <span
          className="font-bold flex items-center justify-center leading-none"
          style={{ fontSize: Math.max(10, Math.floor(size * 0.42)) }}
        >
          {initial || <User className="h-4 w-4" />}
        </span>
      )}
    </div>
  );
}
