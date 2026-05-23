import { getMovies } from '@/ai/flows/movie-management-flow';
import { ChevronRight, Sparkles } from 'lucide-react';
import TransitionLink from '@/components/TransitionLink';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import HeroCarousel from '@/components/HeroCarousel';
import MovieCarousel from '@/components/MovieCarousel';
import Image from 'next/image';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function LandingPage() {
  const allContent = await getMovies();

  const sortedContent = [...allContent].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  const heroItems = sortedContent.slice(0, 5);
  
  // Slice 16 movies to use as a lightweight sneak peek in the wall section background
  const sneakPeekMovies = sortedContent.slice(0, 16);

  const moviesOnly = allContent.filter(m => m.type === 'movie');
  const seriesOnly = allContent.filter(m => m.type === 'series');

  if (allContent.length === 0) {
    return (
      <Alert variant="destructive" className="m-auto max-w-md glassmorphism border-red-500/30 text-white rounded-3xl p-6">
        <AlertTitle className="font-headline tracking-widest text-lg text-red-500">NO CONTENT FOUND</AlertTitle>
        <AlertDescription className="text-white/70">There are no movies in the database to display.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-12 py-8">
      {/* Luxury Cinematic Welcome Banner with Sneak Peek Wall Background (Reduced Height) */}
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0B0B0B] text-white p-6 sm:p-8 md:p-10 min-h-[250px] md:min-h-[300px] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
        
        {/* Left Side: Content Text */}
        <div className="relative z-10 max-w-xl text-left space-y-3.5">
          <div className="flex items-center space-x-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full w-fit">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/95">THE ULTIMATE STREAMING EXPERIENCE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-headline tracking-wider uppercase leading-none text-white">
            WELCOME TO <span className="text-primary drop-shadow-[0_2px_10px_rgba(139,0,0,0.5)]">MOVIE PIRATES</span>
          </h1>
          <p className="text-white/70 text-xs sm:text-sm max-w-md font-body leading-relaxed">
            Discover cinematic masterclasses, premium web series, and exclusive collections. Dive into a seamless, high-end visual storytelling universe.
          </p>
          <div className="pt-1">
            <Button size="sm" className="rounded-full px-6 py-5 bg-primary hover:bg-[#A40000] text-white font-semibold tracking-wider text-xs uppercase transition-all duration-300 shadow-[0_4px_15px_rgba(139,0,0,0.4)] hover:shadow-[0_4px_25px_rgba(139,0,0,0.6)] hover:-translate-y-0.5" asChild>
              <TransitionLink href="/explore">
                Explore the Wall <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              </TransitionLink>
            </Button>
          </div>
        </div>

        {/* Sneak Peek of the Movie Wall (Tilted, Faded Grid in Background) */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 overflow-hidden pointer-events-none select-none z-0 opacity-20 dark:opacity-15">
          {/* Gradient Masks to smoothly blend the grid into the theme card */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B] via-transparent to-transparent z-10 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-transparent to-[#0B0B0B] z-10 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-[#0B0B0B] z-10 w-full h-full" />

          {/* Tilted Collage Grid */}
          <div className="grid grid-cols-4 gap-2.5 rotate-[15deg] scale-105 translate-x-14 -translate-y-8 skew-y-2">
            {sneakPeekMovies.map((movie) => {
              const url = movie.posterUrl;
              const imageUrl = (!url || url.includes('/title/') || url.includes('/name/') || !url.startsWith('http'))
                ? `https://placehold.co/150x225.png?text=${encodeURIComponent(movie.title)}`
                : url;
              return (
                <div key={`sneak-${movie.id}`} className="relative aspect-[2/3] w-16 sm:w-20 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                  <Image
                    src={imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="100px"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Ambient Glowing Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      </div>

      {/* Featured Cinematic Hero */}
      <HeroCarousel items={heroItems} />

      {/* Horizontal Carousels */}
      <MovieCarousel title="New Releases" movies={sortedContent.slice(0, 12)} />
      <MovieCarousel title="Popular Movies" movies={moviesOnly.slice(0, 12)} href="/movies" />
      <MovieCarousel title="Popular TV Series" movies={seriesOnly.slice(0, 12)} href="/series" />
    </div>
  );
}
