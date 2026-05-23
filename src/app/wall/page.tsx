import { getMovies } from '@/ai/flows/movie-management-flow';
import InfiniteMovieWall from '@/components/InfiniteMovieWall';

export const revalidate = 300;

export default async function MovieWallPage() {
  const movies = await getMovies();
  
  return <InfiniteMovieWall movies={movies} />;
}