"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Search, Star, ZoomIn, ZoomOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MovieOutput } from '@/ai/schemas/movie-schemas';
import TransitionLink from '@/components/TransitionLink';

interface InfiniteMovieWallProps {
  movies: MovieOutput[];
}

const POSTER_SIZE = 160; // Square posters
const GAP = 12;
const GRID_SIZE = 18; // 18x18 = 324 slots for 312 movies

export default function InfiniteMovieWall({ movies }: InfiniteMovieWallProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Sort movies alphabetically and create square grid
  const sortedMovies = useMemo(() => {
    const filtered = movies.filter(movie =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.genres.some(genre => genre.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [movies, searchQuery]);

  const gridDimensions = useMemo(() => {
    return { rows: GRID_SIZE, cols: GRID_SIZE };
  }, []);

  // Center the grid on initial load
  useEffect(() => {
    const centerX = -(GRID_SIZE * (POSTER_SIZE + GAP)) / 2 + window.innerWidth / 2;
    const centerY = -(GRID_SIZE * (POSTER_SIZE + GAP)) / 2 + window.innerHeight / 2;
    setScrollPos({ x: centerX, y: centerY });
  }, []);



  // Handle touch and mouse events
  const handleStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - scrollPos.x, y: clientY - scrollPos.y });
  }, [scrollPos]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    requestAnimationFrame(() => {
      setScrollPos({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y
      });
    });
  }, [isDragging, dragStart]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.3));
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{ zIndex: 9999 }}>
      {/* Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
      </div>

      {/* Zoom Controls */}
      <div className="fixed bottom-3 md:bottom-6 left-3 md:left-6 z-40 flex flex-col gap-1 md:gap-2">
        <Button
          onClick={handleZoomIn}
          size="icon"
          className="h-8 w-8 md:h-10 md:w-10 bg-black/20 backdrop-blur-md border-white/20 hover:bg-white/10"
          disabled={zoomLevel >= 2}
        >
          <ZoomIn className="h-3 w-3 md:h-4 md:w-4 text-white" />
        </Button>
        <Button
          onClick={handleZoomOut}
          size="icon"
          className="h-8 w-8 md:h-10 md:w-10 bg-black/20 backdrop-blur-md border-white/20 hover:bg-white/10"
          disabled={zoomLevel <= 0.3}
        >
          <ZoomOut className="h-3 w-3 md:h-4 md:w-4 text-white" />
        </Button>
      </div>

      {/* Grid Info */}
      <div className="fixed bottom-3 md:bottom-6 right-3 md:right-6 z-40 bg-black/20 backdrop-blur-md rounded-lg px-2 md:px-4 py-1 md:py-2 text-white/80 text-xs md:text-sm">
        <div className="md:block hidden">Total: {sortedMovies.length} movies</div>
        <div className="md:block hidden">Grid: {GRID_SIZE} × {GRID_SIZE}</div>
        <div>{Math.round(zoomLevel * 100)}%</div>
      </div>

      {/* Floating Navbar */}
      <nav className="fixed top-3 left-1/2 transform -translate-x-1/2 z-50 bg-black/20 backdrop-blur-md rounded-xl px-3 md:px-6 py-2 md:py-3 shadow-2xl border border-white/10 max-w-[95vw]">
        <div className="flex items-center gap-2 md:gap-6">
          <TransitionLink href="/" className="text-primary font-bold text-lg md:text-xl">
            MovieVerse
          </TransitionLink>
          
          <div className="relative flex-1 max-w-xs md:max-w-none">
            <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 md:h-4 md:w-4 text-white/60" />
            <Input
              type="search"
              placeholder={`Search ${sortedMovies.length} movies...`}
              className="w-full md:w-80 pl-7 md:pl-10 pr-2 py-1 md:py-2 text-xs md:text-sm bg-white/10 border-white/20 text-white placeholder:text-white/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="hidden md:flex items-center gap-4 text-white/80 text-sm">
            <span className="text-primary font-semibold">{GRID_SIZE}×{GRID_SIZE}</span>
            <TransitionLink href="/" className="hover:text-primary transition-colors">Home</TransitionLink>
            <TransitionLink href="/movies" className="hover:text-primary transition-colors">Movies</TransitionLink>
            <TransitionLink href="/series" className="hover:text-primary transition-colors">Series</TransitionLink>
          </div>
        </div>
      </nav>

      {/* Infinite Movie Grid */}
      <div 
        className="h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDragStart={(e) => e.preventDefault()}
        style={{ userSelect: 'none', touchAction: 'none', WebkitUserSelect: 'none' }}
      >
        <div 
          className="relative will-change-transform"
          style={{
            width: GRID_SIZE * (POSTER_SIZE + GAP),
            height: GRID_SIZE * (POSTER_SIZE + GAP),
            transform: `translate3d(${scrollPos.x}px, ${scrollPos.y}px, 0) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            backfaceVisibility: 'hidden',
            perspective: 1000
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
            const movie = sortedMovies[index];
            const row = Math.floor(index / GRID_SIZE);
            const col = index % GRID_SIZE;
            return (
              <div
                key={index}
                className="absolute"
                style={{
                  top: row * (POSTER_SIZE + GAP),
                  left: col * (POSTER_SIZE + GAP)
                }}
              >
                {movie && <MoviePoster movie={movie} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MoviePosterProps {
  movie: MovieOutput;
}

function MoviePoster({ movie }: MoviePosterProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const imageUrl = useMemo(() => {
    const url = movie.posterUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || !url.startsWith('http')) {
      return `https://placehold.co/600x900.png?text=${encodeURIComponent(movie.title)}`;
    }
    return url;
  }, [movie.posterUrl, movie.title]);

  return (
    <TransitionLink href={`/movies/${movie.id}`}>
      <div
        className={cn(
          "relative group cursor-pointer transition-all duration-300 transform-gpu",
          isHovered ? "scale-110 z-20" : "scale-100",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          width: POSTER_SIZE,
          height: POSTER_SIZE
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Poster Image */}
        <div className="relative w-full h-full rounded-lg overflow-hidden shadow-2xl">
          <Image
            src={imageUrl}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-300"
            onLoad={() => setIsLoaded(true)}
            sizes="160px"
          />
          
          {/* Hover Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2">
                {movie.title}
              </h3>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span className="text-white/80 text-xs">{movie.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Depth Shadow */}
        <div className="absolute inset-0 rounded-lg shadow-xl opacity-50 transform translate-y-1 -z-10" />
      </div>
    </TransitionLink>
  );
}