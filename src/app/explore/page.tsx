import React from 'react';
import { getMovies } from '@/ai/flows/movie-management-flow';
import MovieWall from '@/components/MovieWall';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic'; // Ensure we get fresh data

export default async function ExplorePage() {
    const movies = await getMovies();

    // Filter only movies or include everything? "Movie Explore Wall" implies movies, but user might want everything.
    // Let's include everything for a richer wall.

    return (
        <main className="h-screen w-screen overflow-hidden">
            {/* Navigation Overlay */}
            <div className="fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" asChild className="bg-background/50 backdrop-blur-md hover:bg-background/80 rounded-full h-12 w-12 border-primary/20">
                    <Link href="/">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                </Button>
            </div>

            <MovieWall movies={movies} />
        </main>
    );
}
