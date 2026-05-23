'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { MovieOutputSchema, type MovieOutput } from '@/ai/schemas/movie-schemas';

const RecommendMoviesInputSchema = z.object({
  userViewingHistory: z
    .array(z.object({
      movieTitle: z.string().min(1, "Movie title is required"),
      rating: z.number().min(1).max(10)
    }))
    .optional()
    .describe('The user viewing history, including movie titles and ratings.'),
  genres: z
    .array(z.string())
    .optional()
    .describe('A list of genres the user is interested in.'),
  releaseYear: z.number().optional().describe('Release year to consider.'),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

const RecommendMoviesOutputSchema = z.object({
  movieRecommendations: z.array(z.object({
    movie: MovieOutputSchema,
    reason: z.string()
  })),
});
export type RecommendMoviesOutput = z.infer<typeof RecommendMoviesOutputSchema>;

export async function recommendMovies(input: RecommendMoviesInput): Promise<RecommendMoviesOutput> {
  try {
    const { db } = await connectToDatabase();
    const moviesCollection = db.collection('movies');

    let query: any = {};

    // Filter by genres if specified
    if (input.genres && input.genres.length > 0) {
      query.genres = { $in: input.genres };
    }

    // Filter by release year if specified
    if (input.releaseYear) {
      const startOfYear = new Date(`${input.releaseYear}-01-01`);
      const endOfYear = new Date(`${input.releaseYear}-12-31`);
      query.releaseDate = { $gte: startOfYear.toISOString(), $lte: endOfYear.toISOString() };
    }

    // Exclude movies already in viewing history if possible
    if (input.userViewingHistory && input.userViewingHistory.length > 0) {
      const titlesToExclude = input.userViewingHistory.map(h => h.movieTitle);
      query.title = { $nin: titlesToExclude };
    }

    // Fetch movies from database matching query, sorting by rating descending
    let movieDocs = await moviesCollection.find(query).sort({ rating: -1 }).limit(5).toArray();

    // Fallback: If not enough movies matched the query, get high-rated ones
    if (movieDocs.length < 5) {
      const additionalDocs = await moviesCollection
        .find({ title: { $nin: movieDocs.map(d => d.title) } })
        .sort({ rating: -1 })
        .limit(5 - movieDocs.length)
        .toArray();
      movieDocs = [...movieDocs, ...additionalDocs];
    }

    const finalRecommendations: { movie: MovieOutput; reason: string }[] = [];

    for (const doc of movieDocs) {
      const movieData: MovieOutput = {
        type: doc.type === 'series' ? 'series' : 'movie',
        id: doc._id.toString(),
        title: doc.title,
        posterUrl: doc.posterUrl,
        backdropUrl: doc.backdropUrl === null ? undefined : doc.backdropUrl,
        genres: Array.isArray(doc.genres) ? doc.genres : [],
        releaseDate: doc.releaseDate,
        overview: doc.overview,
        cast: Array.isArray(doc.cast) ? doc.cast.map((c: any) => ({
          name: c.name,
          character: c.character,
          profileUrl: c.profileUrl === null ? undefined : c.profileUrl,
          dataAiHint: c.dataAiHint,
        })) : [],
        director: doc.director,
        trailerUrl: doc.trailerUrl === null ? undefined : doc.trailerUrl,
        dataAiHint: doc.dataAiHint,
        rating: typeof doc.rating === 'number' ? doc.rating : 0,
      };

      const parsedMovie = MovieOutputSchema.safeParse(movieData);
      if (parsedMovie.success) {
        let reason = "Highly rated selection matching your preferences.";
        if (input.genres && input.genres.length > 0 && doc.genres.some((g: string) => input.genres?.includes(g))) {
          reason = `Recommended because you enjoy ${doc.genres.filter((g: string) => input.genres?.includes(g)).join(', ')}.`;
        }
        finalRecommendations.push({ movie: parsedMovie.data, reason });
      }
    }

    return { movieRecommendations: finalRecommendations };
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return { movieRecommendations: [] };
  }
}
