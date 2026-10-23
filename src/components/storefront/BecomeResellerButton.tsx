'use client';

import React from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';

interface BecomeResellerButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

/**
 * Animated electric rounded "Become a Reseller" button.
 * Uses theme CSS variables only (primary / primary-foreground).
 */
export function BecomeResellerButton({
  href = '/reseller-program',
  label = 'Become a Reseller',
  className = 'px-7 py-3 text-sm sm:text-base',
}: BecomeResellerButtonProps) {
  return (
    <>
      <Link
        href={href}
        className={`electric-btn group relative inline-flex items-center justify-center gap-2 rounded-full font-extrabold text-primary-foreground bg-primary ${className}`}
      >
        <span className="electric-btn__shine" aria-hidden="true" />
        <Zap className="electric-btn__bolt relative z-10 h-4 w-4 fill-current" />
        <span className="relative z-10">{label}</span>
      </Link>

      <style jsx global>{`
        .electric-btn {
          isolation: isolate;
          overflow: visible;
          box-shadow: 0 0 14px var(--primary), 0 0 32px color-mix(in srgb, var(--primary) 50%, transparent);
          animation: electric-pulse 1.8s ease-in-out infinite;
          transition: transform 0.2s ease;
        }
        .electric-btn:hover {
          transform: scale(1.06);
        }
        .electric-btn:active {
          transform: scale(0.97);
        }
        .electric-btn__shine {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          overflow: hidden;
          pointer-events: none;
        }
        .electric-btn__shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            120deg,
            transparent,
            color-mix(in srgb, var(--primary-foreground) 55%, transparent),
            transparent
          );
          transform: skewX(-20deg);
          animation: electric-shine 2.4s ease-in-out infinite;
        }
        .electric-btn__bolt {
          animation: electric-flicker 1.2s steps(1) infinite;
        }
        @keyframes electric-shine {
          0% {
            left: -60%;
          }
          60%,
          100% {
            left: 130%;
          }
        }
        @keyframes electric-pulse {
          0%,
          100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.15);
          }
        }
        @keyframes electric-flicker {
          0%,
          100% {
            opacity: 1;
          }
          10% {
            opacity: 0.4;
          }
          20% {
            opacity: 1;
          }
          55% {
            opacity: 0.6;
          }
          60% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
