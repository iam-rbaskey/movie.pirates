"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/TransitionLink';
import { Button } from '@/components/ui/button';
import StarRating from '@/components/StarRating';
import { Play, Info, Film, Download } from 'lucide-react';
import type { MovieOutput } from '@/ai/schemas/movie-schemas';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeroCarousel({ items }: { items: MovieOutput[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isMobile, setIsMobile] = useState(false);

  // Monitor size to disable resource-intensive animations on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSlideChange = useCallback((newIndex: number) => {
    if (newIndex === currentIndex) return;
    setDirection(newIndex > currentIndex ? 1 : -1);
    setCurrentIndex(newIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (items.length <= 1) return;

    const intervalId = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 9000); // 9 seconds for slow-zoom background visibility

    return () => clearInterval(intervalId);
  }, [items.length]);

  if (!items || items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  const sanitizedSrc = useMemo(() => {
    if (!currentItem) return undefined;
    const url = currentItem.backdropUrl || currentItem.posterUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || (!url.startsWith('http') && !url.startsWith('data:'))) {
      return `https://placehold.co/1200x800.png?text=${encodeURIComponent(currentItem.title)}`;
    }
    return url;
  }, [currentItem]);

  const [imgSrc, setImgSrc] = useState<string | undefined>(sanitizedSrc);

  useEffect(() => {
    setImgSrc(sanitizedSrc);
  }, [sanitizedSrc]);

  // Helper helper to bypass animations on mobile
  const animVariants = (delay: number, yOffset = 15) => {
    if (isMobile) {
      return {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0 }
      };
    }
    return {
      initial: { opacity: 0, y: yOffset },
      animate: { opacity: 1, y: 0 },
      transition: { delay, duration: 0.5 }
    };
  };

  return (
    <div className="relative w-full h-[65vh] md:h-[88vh] rounded-[32px] overflow-hidden text-white flex items-end shadow-2xl border border-white/5 bg-black">
      {/* Background Image Carousel with Ken Burns / Slow Zoom effect */}
      <div className="absolute inset-0 overflow-hidden select-none">
        <AnimatePresence mode="wait">
          {imgSrc && (
            <motion.div
              key={`${currentItem.id}-${currentIndex}`}
              initial={isMobile ? { opacity: 1 } : { scale: 1.05, opacity: 0 }}
              animate={isMobile ? { opacity: 1 } : { scale: 1.15, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={isMobile ? { duration: 0.1 } : { duration: 7, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full"
            >
              <Image
                src={imgSrc}
                alt={`Backdrop for ${currentItem.title}`}
                fill
                priority
                className="object-cover object-top filter brightness-95 contrast-105"
                sizes="100vw"
                referrerPolicy="no-referrer"
                onError={() => {
                  setImgSrc(`https://placehold.co/1200x800.png?text=${encodeURIComponent(currentItem.title)}`);
                }}
                data-ai-hint="hero backdrop"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cinematic Overlays (Vignette + Side Gradient Overlay for readability) */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-black/30 z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-10" />

      {/* Hero Content Panel */}
      <div className="relative z-20 p-6 md:p-16 lg:p-20 w-full flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="w-full md:w-3/4 lg:w-3/5 space-y-4 md:space-y-6 text-left">
          
          {/* Genres & Tag Line */}
          <motion.div 
            {...animVariants(0.2, 10)}
            className="flex flex-wrap gap-2 items-center"
          >
            <span className="px-3 py-1 text-[10px] md:text-xs font-bold tracking-widest uppercase rounded-full bg-primary text-white shadow-[0_2px_10px_rgba(139,0,0,0.3)]">
              FEATURED {currentItem.type === 'series' ? 'TV SERIES' : 'MOVIE'}
            </span>
            {currentItem.genres && currentItem.genres.slice(0, 3).map((genre) => (
              <span 
                key={genre}
                className="px-3 py-1 text-[10px] md:text-xs font-semibold tracking-wider rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-white/80"
              >
                {genre}
              </span>
            ))}
          </motion.div>

          {/* Featured Title */}
          <motion.h1 
            {...animVariants(0.3, 20)}
            className="text-4xl sm:text-6xl md:text-7xl font-bold font-headline tracking-wider uppercase leading-none drop-shadow-xl text-white break-words"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
          >
            {currentItem.title}
          </motion.h1>

          {/* Rating */}
          <motion.div 
            {...animVariants(0.4, 10)}
            className="flex items-center space-x-3 bg-black/35 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/5 w-fit"
          >
            <StarRating initialRating={currentItem.rating} readOnly size={16} totalStars={10} />
            <span className="font-bold text-sm tracking-wide text-white">{currentItem.rating.toFixed(1)}/10</span>
          </motion.div>

          {/* Description */}
          <motion.p 
            {...animVariants(0.5, 15)}
            className="text-white/80 text-sm md:text-base leading-relaxed line-clamp-3 md:line-clamp-4 max-w-2xl drop-shadow-md font-body font-normal"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
          >
            {currentItem.overview || "No overview available for this title."}
          </motion.p>

          {/* Call to Action Buttons */}
          <motion.div 
            {...animVariants(0.6, 15)}
            className="flex flex-wrap gap-4 pt-3"
          >
            {currentItem.watchUrl ? (
              <Button 
                size="lg" 
                asChild 
                className="bg-primary hover:bg-[#A40000] text-white h-12 md:h-14 px-8 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300 shadow-[0_5px_20px_rgba(139,0,0,0.45)] hover:shadow-[0_5px_25px_rgba(139,0,0,0.65)] hover:-translate-y-0.5"
              >
                <a href={currentItem.watchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <Play className="mr-2.5 h-4 w-4 fill-white" /> Watch Now
                </a>
              </Button>
            ) : (
              <Button 
                size="lg" 
                asChild 
                className="bg-primary hover:bg-[#A40000] text-white h-12 md:h-14 px-8 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300 shadow-[0_5px_20px_rgba(139,0,0,0.45)] hover:shadow-[0_5px_25px_rgba(139,0,0,0.65)] hover:-translate-y-0.5"
              >
                <TransitionLink href={`/movies/${currentItem.id}`}>
                  <Play className="mr-2.5 h-4 w-4 fill-white" /> Watch Now
                </TransitionLink>
              </Button>
            )}

            {currentItem.trailerUrl ? (
              <Button 
                asChild 
                size="lg" 
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:border dark:border-emerald-500/20 dark:text-emerald-400 text-white h-12 md:h-14 px-8 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:-translate-y-0.5 shadow-md dark:shadow-[0_4px_12px_rgba(16,185,129,0.1)]"
              >
                <a href={currentItem.trailerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  <Download className="mr-2.5 h-4 w-4" /> Download
                </a>
              </Button>
            ) : (
              <Button 
                asChild 
                size="lg" 
                className="bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-white h-12 md:h-14 px-8 rounded-full text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:-translate-y-0.5"
              >
                <TransitionLink href={`/movies/${currentItem.id}`}>
                  <Info className="mr-2.5 h-4 w-4" /> More Info
                </TransitionLink>
              </Button>
            )}
          </motion.div>
        </div>

        {/* Carousel Indicators / Slider dots */}
        {items.length > 1 && (
          <motion.div 
            {...(isMobile ? { initial: { opacity: 1 }, animate: { opacity: 1 } } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.8 } })}
            className="flex md:flex-col items-center justify-center gap-3 bg-black/40 border border-white/5 backdrop-blur-md p-3.5 rounded-full self-center md:self-end"
          >
            {items.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSlideChange(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  currentIndex === index 
                    ? 'w-6 bg-primary shadow-[0_0_8px_rgba(139,0,0,0.8)]' 
                    : 'w-2 bg-white/40 hover:bg-white/70'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
