"use client";

import React, { useEffect, useState, useMemo } from 'react';
import MovieCard from '@/components/MovieCard';
import { Tv2, Search as SearchIcon } from 'lucide-react'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MovieOutput } from '@/ai/flows/movie-management-flow';
import { useSearchParams } from 'next/navigation';

export default function SeriesClientPage({ series }: { series: MovieOutput[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  
  const [searchTerm, setSearchTerm] = useState(initialQuery || '');

  useEffect(() => {
    const query = searchParams.get('q');
    if (query !== null && query !== searchTerm) {
      setSearchTerm(query);
    }
  }, [searchParams, searchTerm]);

  const filteredSeries = useMemo(() => series.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.genres.some(genre => genre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    item.director.toLowerCase().includes(searchTerm.toLowerCase())
  ), [series, searchTerm]);

  return (
    <div className="space-y-8 animate-fade-in py-8">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline flex items-center justify-center">
          <Tv2 className="mr-2 sm:mr-3 h-8 w-8 sm:h-10 sm:w-10 text-primary" /> All Series
        </h1>
        <p className="text-muted-foreground text-md sm:text-lg max-w-2xl mx-auto">
          Browse our collection of series. Use the search below to find series by title, genre, or director.
        </p>
        <div className="relative max-w-lg mx-auto">
          <Input
            type="search"
            placeholder="Search series..."
            className="h-12 text-md pl-12 pr-4 rounded-full shadow-sm bg-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search all series"
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>
      </header>

      {filteredSeries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {filteredSeries.map((item) => (
            <MovieCard key={item.id} movie={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Tv2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Series Found</h2>
          {searchTerm ? (
            <p className="text-muted-foreground">
              No series match your search term "{searchTerm}". Try a different search.
            </p>
          ) : (
            <p className="text-muted-foreground">
              There are currently no series in the database. Check back later!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
