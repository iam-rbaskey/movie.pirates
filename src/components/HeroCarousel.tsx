"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/TransitionLink';
import { Button } from '@/components/ui/button';
import StarRating from '@/components/StarRating';
import { PlayIcon } from 'lucide-react';
import type { MovieOutput } from '@/ai/schemas/movie-schemas';
import { cn } from '@/lib/utils';

export default function HeroCarousel({ items }: { items: MovieOutput[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const handleSlideChange = useCallback((newIndex: number) => {
    if (newIndex === currentIndex) return;
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setIsFading(false);
    }, 400); // Match this with CSS transition duration
  }, [currentIndex]);

  useEffect(() => {
    if (items.length <= 1) return;

    const intervalId = setInterval(() => {
      handleSlideChange((currentIndex + 1) % items.length);
    }, 7000); // Change slide every 7 seconds

    return () => clearInterval(intervalId);
  }, [items.length, currentIndex, handleSlideChange]);

  if (!items || items.length === 0) {
    return null;
  }
  
  const currentItem = items[currentIndex];

  const sanitizedSrc = React.useMemo(() => {
    if (!currentItem) return undefined;
    const url = currentItem.backdropUrl || currentItem.posterUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || !url.startsWith('http')) {
      return `https://placehold.co/1200x800.png?text=${encodeURIComponent(currentItem.title)}`;
    }
    return url;
  }, [currentItem]);

  if (!currentItem) {
    return null;
  }
  
  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] rounded-2xl overflow-hidden text-white flex items-end">
      {/* Background Image */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-in-out",
          isFading ? 'opacity-0' : 'opacity-100'
        )}
      >
        {sanitizedSrc && (
          <Image
            src={sanitizedSrc}
            alt={`Backdrop for ${currentItem.title}`}
            fill
            priority={currentIndex === 0}
            className="object-cover"
            data-ai-hint={currentItem.dataAiHint || "movie background"}
            key={currentItem.id}
          />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      
      <div className="relative z-10 p-6 md:p-12 w-full flex justify-between items-end">
        <div
          className={cn(
            "w-full md:w-2/3 lg:w-1/2 space-y-4 transition-all duration-500 ease-in-out",
            isFading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          )}
        >
            <h1 className="text-4xl md:text-6xl font-black font-headline" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
              {currentItem.title.toUpperCase()}
            </h1>
            <div className="flex items-center space-x-2">
              <StarRating initialRating={currentItem.rating} readOnly size={20} totalStars={10} />
              <span className="font-semibold text-lg">{currentItem.rating.toFixed(1)}</span>
            </div>
            <p className="mb-2 line-clamp-3 text-white/80" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.7)' }}>
              {currentItem.overview}
            </p>
            <div className="flex items-center gap-4 pt-2">
               {currentItem.watchUrl && (
                  <Button size="lg" asChild className="bg-primary text-primary-foreground h-12 px-8 text-lg hover:bg-primary/80">
                    <a href={currentItem.watchUrl} target="_blank" rel="noopener noreferrer">
                      <PlayIcon className="mr-2 h-6 w-6"/> Watch Now
                    </a>
                  </Button>
               )}
              <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 h-12 px-8 text-lg">
                 <TransitionLink href={`/movies/${currentItem.id}`}>
                    More Info
                 </TransitionLink>
              </Button>
            </div>
        </div>

        {/* Carousel Dots */}
        {items.length > 1 && (
            <div className="absolute bottom-6 right-6 md:static flex flex-col items-center gap-2.5">
            {items.map((_, index) => (
                <button
                key={index}
                onClick={() => handleSlideChange(index)}
                className={cn(
                    "h-2 w-2 rounded-full transition-all duration-300",
                    currentIndex === index ? 'bg-primary scale-150' : 'bg-white/50 hover:bg-white'
                )}
                aria-label={`Go to slide ${index + 1}`}
                />
            ))}
            </div>
        )}
      </div>
    </div>
  );
}
