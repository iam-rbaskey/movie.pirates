import React, { Suspense } from 'react';
import { getMovies } from '@/ai/flows/movie-management-flow';
import { Loader2 } from 'lucide-react';
import SeriesClientPage from './SeriesClientPage';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function AllSeriesPage() {
  const allContent = await getMovies();
  const seriesItems = allContent.filter(item => item.type === 'series');

  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading series...</p>
      </div>
    }>
      <SeriesClientPage series={seriesItems} />
    </Suspense>
  );
}
