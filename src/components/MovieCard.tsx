import * as React from 'react';
import Image from 'next/image';
import TransitionLink from '@/components/TransitionLink';
import { Card, CardContent } from '@/components/ui/card';
import type { MovieOutput } from '@/ai/schemas/movie-schemas';

type MovieCardProps = {
  movie: MovieOutput;
};

const MovieCard = React.memo(function MovieCard({ movie }: MovieCardProps) {
  const imageUrl = React.useMemo(() => {
    const url = movie.posterUrl;
    if (!url || url.includes('/title/') || url.includes('/name/') || !url.startsWith('http')) {
      return `https://placehold.co/600x900.png?text=${encodeURIComponent(movie.title)}`;
    }
    return url;
  }, [movie.posterUrl, movie.title]);

  return (
    <TransitionLink href={`/movies/${movie.id}`} className="block group">
      <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:scale-105 border-0 bg-card h-full flex flex-col">
        <div className="aspect-[2/3] relative w-full">
          <Image
            src={imageUrl}
            alt={`Poster for ${movie.title}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
            className="rounded-lg object-cover"
            data-ai-hint={movie.dataAiHint || "movie poster"}
          />
        </div>
        <CardContent className="p-2 pt-3">
            <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
              {movie.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(movie.releaseDate).getFullYear()} &middot; {movie.type.charAt(0).toUpperCase() + movie.type.slice(1)}
            </p>
        </CardContent>
      </Card>
    </TransitionLink>
  );
});

export default MovieCard;
