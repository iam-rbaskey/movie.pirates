import React, { Suspense } from 'react';
import { getMovies } from '@/ai/flows/movie-management-flow';
import { Loader2 } from 'lucide-react';
import MoviesClientPage from './MoviesClientPage';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function AllMoviesPage() {
  const allContent = await getMovies();
  const movieItems = allContent.filter(item => item.type === 'movie');

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading movies...</p>
      </div>
    }>
      <MoviesClientPage movies={movieItems} />
    </Suspense>
  );
}
