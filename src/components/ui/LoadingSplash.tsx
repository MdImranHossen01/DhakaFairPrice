"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import Image from "next/image";

export default function LoadingSplash({
  logoUrl,
  brandName,
}: {
  logoUrl?: string;
  brandName?: string;
}) {
  const activeBrandName = brandName || process.env.NEXT_PUBLIC_STORE_NAME || "Store";
  const letters = useMemo(() => activeBrandName.split(""), [activeBrandName]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground select-none"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading, please wait...</span>

      {/* Main Logo Container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Animated Orbital Rings */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute w-32 h-32 border-2 border-primary-foreground/30 rounded-full"
        />

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="absolute w-24 h-24 border border-primary-foreground/50 rounded-full"
        />

        {/* Central Logo Symbol */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 1,
          }}
          className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl bg-card overflow-hidden p-2 border border-border/20"
        >
          <div className="relative w-full h-full">
            <Image
              src={logoUrl || "/logo.webp"}
              alt={activeBrandName}
              fill
              sizes="96px"
              className="object-contain rounded-full"
              priority
            />
          </div>

          {/* Pulsing Glow Effect */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary-foreground/40 pointer-events-none"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Connecting Dots */}
        <motion.div
          className="absolute top-0 right-0 w-3 h-3 rounded-full bg-primary-foreground"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0] }}
          transition={{ delay: 0.8, duration: 1.5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-primary-foreground"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1, 0] }}
          transition={{ delay: 1, duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Brand Text */}
      <div className="mt-12 text-center max-w-lg px-6">
        {/* BrandName Text with Letter-by-Letter Stagger Animation */}
        <div className="flex flex-wrap justify-center text-3xl md:text-4xl font-black mb-3 tracking-wide text-primary-foreground drop-shadow-md font-logo">
          {letters.map((letter, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 0.4 + i * 0.04,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="inline-block"
              style={{ marginRight: letter === " " ? "0.45rem" : "0px" }}
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-xs sm:text-sm font-medium tracking-[0.25em] uppercase text-primary-foreground/85"
        >
          Quality &bull; Trust &bull; Value
        </motion.p>

        {/* Loading Bar */}
        <div className="w-48 h-1 bg-primary-foreground/20 rounded-full mt-6 mx-auto overflow-hidden relative shadow-inner">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "linear",
            }}
            className="absolute h-full w-1/2 bg-primary-foreground rounded-full"
          />
        </div>
      </div>

      {/* Background Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-2.5 h-2.5 rounded-full bg-primary-foreground/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ delay: 0.5, duration: 2.2, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-2 h-2 rounded-full bg-primary-foreground/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.2, 0.8] }}
          transition={{ delay: 1, duration: 2.2, repeat: Infinity }}
        />
      </div>
    </div>
  );
}

