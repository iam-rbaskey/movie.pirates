"use client";

import * as React from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/TransitionLink';
import { Card, CardContent } from '@/components/ui/card';
import type { MovieOutput } from '@/ai/schemas/movie-schemas';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

type MovieCardProps = {
  movie: MovieOutput;
  className?: string;
};

const MovieCard = React.memo(function MovieCard({ movie, className }: MovieCardProps) {
  const imageUrl = React.useMemo(() => {
    const url = movie.posterUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || (!url.startsWith('http') && !url.startsWith('data:'))) {
      return `https://placehold.co/600x900.png?text=${encodeURIComponent(movie.title)}`;
    }
    return url;
  }, [movie.posterUrl, movie.title]);

  const [imgSrc, setImgSrc] = React.useState(imageUrl);

  React.useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  const year = React.useMemo(() => {
    if (!movie.releaseDate) return null;
    try {
      return new Date(movie.releaseDate).getFullYear();
    } catch {
      return null;
    }
  }, [movie.releaseDate]);

  return (
    <TransitionLink href={`/movies/${movie.id}`} className={cn("block group relative", className)}>
      <Card className="overflow-hidden rounded-[24px] transition-all duration-500 ease-out md:group-hover:-translate-y-2 md:group-hover:shadow-[0_12px_35px_rgba(139,0,0,0.45)] border border-white/10 dark:border-white/5 glassmorphism-card h-full flex flex-col relative bg-card">
        
        {/* Rating Badge Top Right */}
        {movie.rating > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span>{movie.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Poster Wrapper with Zoom Effect */}
        <div className="aspect-[2/3] relative w-full overflow-hidden rounded-t-[24px]">
          <Image
            src={imgSrc}
            alt={`Poster for ${movie.title}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
            className="rounded-t-[24px] object-cover transition-transform duration-700 ease-out md:group-hover:scale-110"
            referrerPolicy="no-referrer"
            onError={() => {
              setImgSrc(`https://placehold.co/600x900.png?text=${encodeURIComponent(movie.title)}`);
            }}
            data-ai-hint="movie poster"
          />
          {/* Subtle reflection overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>

        {/* Info Content Section */}
        <CardContent className="p-4 flex-1 flex flex-col justify-between bg-black/20 dark:bg-black/40 backdrop-blur-sm">
          <div>
            <h3 className="text-xs sm:text-sm font-bold tracking-wider text-foreground truncate md:group-hover:text-primary transition-colors uppercase font-headline">
              {movie.title}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5 uppercase font-medium tracking-wider">
              {year && <span>{year}</span>}
              {year && <span>&middot;</span>}
              <span className="text-primary font-bold">{movie.type === 'series' ? 'TV Show' : 'Movie'}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </TransitionLink>
  );
});

export default MovieCard;
