
'use server';

/**
 * @fileOverview Recommends movies to the user based on their viewing history and ratings,
 * fetching full movie details from MongoDB for valid recommendations.
 *
 * - recommendMovies - A function that handles the movie recommendation process.
 * - RecommendMoviesInput - The input type for the recommendMovies function.
 * - RecommendMoviesOutput - The return type for the recommendMovies function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { MovieOutputSchema, type MovieOutput } from '@/ai/schemas/movie-schemas'; // Import from movie-schemas

const RecommendMoviesInputSchema = z.object({
  userViewingHistory: z
    .array(z.object({
      movieTitle: z.string().min(1, "Movie title is required"), // Changed from movieId to movieTitle
      rating: z.number().min(1).max(10)
    }))
    .describe('The user viewing history, including movie titles and ratings.'),
  genres: z
    .array(z.string())
    .optional()
    .describe('A list of genres the user is interested in.'),
  releaseYear: z.number().optional().describe('Release year to consider.'),
});
export type RecommendMoviesInput = z.infer<typeof RecommendMoviesInputSchema>;

// Internal schema for recommendation output
const LLMPromptOutputSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string().describe("The title of the recommended movie."),
    reason: z.string().describe("The reason for recommending this movie.")
  })).describe("A list of recommended movie titles with a reason for each recommendation.")
});

// Final output schema for the flow
const RecommendMoviesOutputSchema = z.object({
  movieRecommendations: z.array(z.object({
    movie: MovieOutputSchema, // Full movie object
    reason: z.string()
  })).describe('A list of recommended movies with full details and a reason for each recommendation.'),
});
export type RecommendMoviesOutput = z.infer<typeof RecommendMoviesOutputSchema>;

export async function recommendMovies(input: RecommendMoviesInput): Promise<RecommendMoviesOutput> {
  return recommendMoviesFlow(input);
}

const recommendMoviesPrompt = ai.definePrompt({
  name: 'recommendMoviesPrompt',
  input: { schema: RecommendMoviesInputSchema },
  output: { schema: LLMPromptOutputSchema }, // Returns titles and reasons
  prompt: `You are a movie recommendation expert. Based on the user's viewing history and ratings (on a scale of 1-10), you will recommend movie titles they might enjoy and provide a brief reason for each recommendation.

  The user's viewing history is as follows:
  {{#each userViewingHistory}}
  - Movie Title: {{this.movieTitle}}, Rating: {{this.rating}}
  {{/each}}

  Consider the following, if provided:
  {{#if genres}}
  Preferred Genres: {{genres}}
  {{/if}}
  {{#if releaseYear}}
  Preferred Release Year: {{releaseYear}}
  {{/if}}

  Recommend up to 5 movie titles. For each movie, provide the title and a concise reason why the user might enjoy it.
  `,
});

const recommendMoviesFlow = ai.defineFlow(
  {
    name: 'recommendMoviesFlow',
    inputSchema: RecommendMoviesInputSchema,
    outputSchema: RecommendMoviesOutputSchema,
  },
  async (input) => {
    let recommendations: Array<{ title: string; reason: string }> = [];

    try {
      const { output: llmOutput } = await recommendMoviesPrompt(input);
      if (llmOutput && llmOutput.recommendations) {
        recommendations = llmOutput.recommendations;
      }
    } catch (e) {
      console.warn("Recommendation query failed. Falling back to DB-based selection.", e);
      try {
        const { db } = await connectToDatabase();
        const moviesCollection = db.collection('movies');
        // Fetch up to 5 random/popular movies from database
        const fallbackDocs = await moviesCollection.aggregate([{ $sample: { size: 5 } }]).toArray();
        recommendations = fallbackDocs.map(doc => ({
          title: doc.title,
          reason: `Catalog favorite popular recommendation.`
        }));
      } catch (dbErr) {
        console.error("DB fallback also failed:", dbErr);
      }
    }

    if (recommendations.length === 0) {
      return { movieRecommendations: [] };
    }

    const { db } = await connectToDatabase();
    const moviesCollection = db.collection('movies');
    const finalRecommendations: { movie: MovieOutput; reason: string }[] = [];

    for (const rec of recommendations) {
      if (finalRecommendations.length >= 5) break; // Limit to 5 final recommendations

      try {
        // Try to find the movie by title (case-insensitive)
        const movieDoc = await moviesCollection.findOne({
          title: { $regex: new RegExp(`^${rec.title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
        });

        if (movieDoc) {
          // Map DB doc to MovieOutput schema
          const movieData: MovieOutput = {
            type: movieDoc.type === 'series' ? 'series' : 'movie',
            id: movieDoc._id.toString(),
            title: movieDoc.title,
            posterUrl: movieDoc.posterUrl,
            backdropUrl: movieDoc.backdropUrl === null ? undefined : movieDoc.backdropUrl,
            genres: Array.isArray(movieDoc.genres) ? movieDoc.genres : [],
            releaseDate: movieDoc.releaseDate,
            overview: movieDoc.overview,
            cast: Array.isArray(movieDoc.cast) ? movieDoc.cast.map((c: any) => ({
              name: c.name,
              character: c.character,
              profileUrl: c.profileUrl === null ? undefined : c.profileUrl,
              dataAiHint: c.dataAiHint,
            })) : [],
            director: movieDoc.director,
            trailerUrl: movieDoc.trailerUrl === null ? undefined : movieDoc.trailerUrl,
            dataAiHint: movieDoc.dataAiHint,
            rating: typeof movieDoc.rating === 'number' ? movieDoc.rating : 0,
          };
          // Validate with Zod schema before adding
          const parsedMovie = MovieOutputSchema.safeParse(movieData);
          if (parsedMovie.success) {
            finalRecommendations.push({ movie: parsedMovie.data, reason: rec.reason });
          } else {
            console.warn(`Movie data for "${rec.title}" failed validation:`, parsedMovie.error.issues);
          }
        } else {
          console.log(`Movie titled "${rec.title}" not found in database.`);
        }
      } catch (e) {
        console.error(`Error processing recommendation for "${rec.title}":`, e);
      }
    }
    return { movieRecommendations: finalRecommendations };
  }
);
