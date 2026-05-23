import { getMovies, type MovieOutput } from '@/ai/flows/movie-management-flow';
import { ChevronRight } from 'lucide-react';
import TransitionLink from '@/components/TransitionLink';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/MovieCard';
import HeroCarousel from '@/components/HeroCarousel';

export const revalidate = 300; // Revalidate every 5 minutes

function ContentGrid({ title, movies, href }: { title: string, movies: MovieOutput[], href?: string }) {
  if (movies.length === 0) return null;
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {href && (
          <Button variant="link" asChild className="text-primary">
            <TransitionLink href={href}>
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </TransitionLink>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
        {movies.map(movie => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </section>
  );
}


export default async function LandingPage() {
  const allContent = await getMovies();

  const sortedContent = [...allContent].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  const heroItems = sortedContent.slice(0, 5);

  const moviesOnly = allContent.filter(m => m.type === 'movie');
  const seriesOnly = allContent.filter(m => m.type === 'series');

  if (allContent.length === 0) {
    return (
      <Alert variant="destructive" className="m-auto">
        <AlertTitle>No Content found</AlertTitle>
        <AlertDescription>There are no movies in the database to display.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="flex justify-between items-center bg-primary/5 rounded-xl p-6 sm:p-10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-5xl font-bold font-headline mb-4">Welcome to Movie Verse</h1>
          <p className="text-muted-foreground text-lg mb-6">Discover your next Favorite story. Explore our infinite wall of entertainment.</p>
          <Button size="lg" className="rounded-full px-8" asChild>
            <TransitionLink href="/explore">
              Explore the Wall <ChevronRight className="ml-2 h-4 w-4" />
            </TransitionLink>
          </Button>
        </div>
        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-0"></div>
      </div>

      <HeroCarousel items={heroItems} />
      <ContentGrid title="New Releases" movies={sortedContent.slice(0, 12)} />
      <ContentGrid title="Popular Movies" movies={moviesOnly.slice(0, 6)} href="/movies" />
      <ContentGrid title="Popular TV Series" movies={seriesOnly.slice(0, 6)} href="/series" />
    </div>
  );
}
