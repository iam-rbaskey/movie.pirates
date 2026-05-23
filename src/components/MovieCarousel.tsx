"use client";

import React, { useRef, useState, useEffect } from 'react';
import MovieCard from '@/components/MovieCard';
import type { MovieOutput } from '@/ai/schemas/movie-schemas';
import TransitionLink from '@/components/TransitionLink';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MovieCarouselProps = {
  title: string;
  movies: MovieOutput[];
  href?: string;
};

export default function MovieCarousel({ title, movies, href }: MovieCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      // Run once initially
      checkScroll();
      
      // Also observe resize to update arrows
      const observer = new ResizeObserver(() => checkScroll());
      observer.observe(container);
      
      return () => {
        container.removeEventListener('scroll', checkScroll);
        observer.disconnect();
      };
    }
  }, [movies]);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const { clientWidth } = containerRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      containerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (movies.length === 0) return null;

  return (
    <section className="relative py-6 group/carousel">
      {/* Title & View All Link */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl sm:text-2xl font-bold font-headline tracking-widest uppercase text-white flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary rounded-full block" />
          {title}
        </h2>
        {href && (
          <Button variant="link" asChild className="text-primary hover:text-[#A40000] p-0 font-semibold tracking-wider text-xs uppercase">
            <TransitionLink href={href}>
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </TransitionLink>
          </Button>
        )}
      </div>

      {/* Horizontal Carousel Container */}
      <div className="relative w-full">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white shadow-lg hover:bg-primary hover:border-primary transition-all duration-350 opacity-0 group-hover/carousel:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-black/60 backdrop-blur-md text-white shadow-lg hover:bg-primary hover:border-primary transition-all duration-350 opacity-0 group-hover/carousel:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Carousel Content */}
        <div
          ref={containerRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory py-4 px-1"
        >
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="flex-shrink-0 w-[160px] sm:w-[220px] snap-start"
            >
              <MovieCard movie={movie} className="h-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
