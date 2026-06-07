"use client";

import React, { useEffect, useState, useMemo } from 'react';
import MovieCard from '@/components/MovieCard';
import { Film, Search as SearchIcon } from 'lucide-react'; 
import { Input } from '@/components/ui/input';
import { logSearchQuery } from '@/ai/flows/search-analytics-flow';
import { type MovieOutput } from '@/ai/flows/movie-management-flow';
import { useSearchParams } from 'next/navigation';

export default function MoviesClientPage({ movies }: { movies: MovieOutput[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  
  const [searchTerm, setSearchTerm] = useState(initialQuery || '');

  useEffect(() => {
    const query = searchParams.get('q');
    if (query !== null && query !== searchTerm) {
      setSearchTerm(query);
    }
  }, [searchParams]);

  const filteredMovies = useMemo(() => {
    return movies.filter(movie =>
      movie.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movie.genres.some(genre => genre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      movie.director.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [movies, searchTerm]);

  useEffect(() => {
    if (!searchTerm.trim()) return;

    const timer = setTimeout(async () => {
      try {
        await logSearchQuery({
          query: searchTerm,
          resultsCount: filteredMovies.length
        });
      } catch (err) {
        console.error("Failed to log search query:", err);
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [searchTerm, filteredMovies.length]);

  return (
    <div className="space-y-8 animate-fade-in py-8">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold font-headline flex items-center justify-center">
          <Film className="mr-2 sm:mr-3 h-8 w-8 sm:h-10 sm:w-10 text-primary" /> All Movies
        </h1>
        <p className="text-muted-foreground text-md sm:text-lg max-w-2xl mx-auto">
          Browse our extensive collection of films. Use the search below to find movies by title, genre, or director.
        </p>
        <div className="relative max-w-lg mx-auto flex items-center">
          <div className="relative w-full">
            <Input
              type="search"
              placeholder="Search movies..."
              className="h-12 text-md pl-12 pr-4 rounded-full shadow-sm bg-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search all movies"
            />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      {filteredMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {filteredMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Film className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Movies Found</h2>
          {searchTerm ? (
            <p className="text-muted-foreground">
              No movies match your search term "{searchTerm}". Try a different search.
            </p>
          ) : (
            <p className="text-muted-foreground">
              There are currently no movies in the database. Check back later!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
