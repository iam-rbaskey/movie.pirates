
'use server';
/**
 * @fileOverview Movie management flows for admin panel (add, get, update, delete movies) using MongoDB.
 *
 * - addMovie - Adds a new movie to the database.
 * - getMovies - Fetches all movies from the database.
 * - getMovieById - Fetches a single movie by its ID.
 * - updateMovie - Updates an existing movie's details.
 * - deleteMovie - Deletes a movie from the database.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { type Movie as MovieType } from '@/types'; // Using existing MovieType for structure
import { ObjectId } from 'mongodb';
import {
  MovieCreateInputSchema,
  MovieOutputSchema,
  AddMovieOutputSchema,
  GetMoviesOutputSchema,
  DeleteMovieInputSchema,
  DeleteMovieOutputSchema,
  GetMovieByIdInputSchema,
  UpdateMovieInputSchema,
  UpdateMovieOutputSchema,
  type MovieCreateInput as MovieCreateInputType,
  type MovieOutput as MovieOutputType,
  type DeleteMovieInput as DeleteMovieInputType,
  type DeleteMovieOutput as DeleteMovieOutputSchemaType,
  type GetMovieByIdInput as GetMovieByIdInputType,
  type UpdateMovieInput as UpdateMovieInputType,
  type UpdateMovieOutput as UpdateMovieOutputType,
} from '@/ai/schemas/movie-schemas';

// Re-export types for external use
export type MovieCreateInput = MovieCreateInputType;
export type MovieOutput = MovieOutputType;
export type DeleteMovieInput = DeleteMovieInputType;
export type DeleteMovieOutput = DeleteMovieOutputSchemaType;
export type GetMovieByIdInput = GetMovieByIdInputType;
export type UpdateMovieInput = UpdateMovieInputType;
export type UpdateMovieOutput = UpdateMovieOutputType;


// Memory cache variables for getMovies flow to optimize database latency
let moviesCache: MovieOutput[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 15000; // 15 seconds

function invalidateMoviesCache() {
  moviesCache = null;
  cacheTimestamp = 0;
}

// Add Movie Flow
export async function addMovie(input: MovieCreateInput): Promise<z.infer<typeof AddMovieOutputSchema>> {
  return addMovieFlow(input);
}

const addMovieFlow = ai.defineFlow(
  {
    name: 'addMovieFlow',
    inputSchema: MovieCreateInputSchema,
    outputSchema: AddMovieOutputSchema,
  },
  async (movieData) => {
    try {
      const { db } = await connectToDatabase();
      const moviesCollection = db.collection('movies');

      const existingMovie = await moviesCollection.findOne({ title: movieData.title });
      if (existingMovie) {
        return { success: false, message: `Movie with title "${movieData.title}" already exists.` };
      }

      const newMovieDocument = {
        ...movieData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await moviesCollection.insertOne(newMovieDocument);

      if (result.insertedId) {
        invalidateMoviesCache(); // Invalidate cache
        return { success: true, message: 'Movie added successfully!', movieId: result.insertedId.toString() };
      }
      return { success: false, message: 'Failed to add movie due to a database error.' };

    } catch (error: any) {
      console.error('Error adding movie:', error);
      return { success: false, message: error.message || 'An unexpected error occurred while adding the movie.' };
    }
  }
);

// Get Movies Flow
export async function getMovies(): Promise<MovieOutput[]> {
  return getMoviesFlow({});
}

const getMoviesFlow = ai.defineFlow(
  {
    name: 'getMoviesFlow',
    inputSchema: z.object({}), 
    outputSchema: GetMoviesOutputSchema,
  },
  async () => {
    try {
      const now = Date.now();
      if (moviesCache && (now - cacheTimestamp < CACHE_TTL)) {
        return moviesCache;
      }

      const { db } = await connectToDatabase();
      const moviesCollection = db.collection('movies');
      
      const moviesFromDB = await moviesCollection.find({}).sort({ releaseDate: -1 }).toArray();

      const moviesForOutput: MovieOutput[] = moviesFromDB.map(movieDoc => {
        const doc = movieDoc as any; 
        return {
          id: doc._id.toString(),
          title: doc.title,
          posterUrl: doc.posterUrl,
          type: doc.type || 'movie',
          backdropUrl: doc.backdropUrl === null ? undefined : doc.backdropUrl,
          genres: Array.isArray(doc.genres) ? doc.genres : [], 
          releaseDate: doc.releaseDate,
          overview: doc.overview,
          cast: Array.isArray(doc.cast) ? doc.cast.map((c: any) => ({
            name: c.name,
            character: c.character,
            profileUrl: c.profileUrl === null ? undefined : c.profileUrl,
            dataAiHint: c.dataAiHint
          })) : [], 
          director: doc.director,
          trailerUrl: doc.trailerUrl === null ? undefined : doc.trailerUrl,
          watchUrl: doc.watchUrl === null ? undefined : doc.watchUrl,
          dataAiHint: doc.dataAiHint,
          rating: typeof doc.rating === 'number' ? doc.rating : 0,
          episodes: Array.isArray(doc.episodes) ? doc.episodes.map((ep: any) => ({ title: ep.title, downloadUrl: ep.downloadUrl, watchUrl: ep.watchUrl })) : undefined,
        };
      });
      
      moviesCache = moviesForOutput;
      cacheTimestamp = now;
      return moviesForOutput;

    } catch (error: any) {
      console.error('Error fetching movies:', error);
      return []; 
    }
  }
);

// Get Movie By ID Flow
export async function getMovieById(input: GetMovieByIdInput): Promise<MovieOutput | null> {
  return getMovieByIdFlow(input);
}

const getMovieByIdFlow = ai.defineFlow(
  {
    name: 'getMovieByIdFlow',
    inputSchema: GetMovieByIdInputSchema,
    outputSchema: MovieOutputSchema.nullable(), // Output can be a movie or null
  },
  async ({ movieId }) => {
    try {
      if (!ObjectId.isValid(movieId)) {
        console.warn('Invalid Movie ID format for getMovieByIdFlow:', movieId);
        return null;
      }
      const { db } = await connectToDatabase();
      const moviesCollection = db.collection('movies');
      
      const movieDoc = await moviesCollection.findOne({ _id: new ObjectId(movieId) });

      if (!movieDoc) {
        return null;
      }

      const doc = movieDoc as any;
      const movieForOutput: MovieOutput = {
        id: doc._id.toString(),
        title: doc.title,
        posterUrl: doc.posterUrl,
        type: doc.type || 'movie',
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
        watchUrl: doc.watchUrl === null ? undefined : doc.watchUrl,
        dataAiHint: doc.dataAiHint,
        rating: typeof doc.rating === 'number' ? doc.rating : 0,
        episodes: Array.isArray(doc.episodes) ? doc.episodes.map((ep: any) => ({ title: ep.title, downloadUrl: ep.downloadUrl, watchUrl: ep.watchUrl })) : undefined,
      };
      
      return movieForOutput;

    } catch (error: any) {
      console.error('Error fetching movie by ID:', error);
      return null;
    }
  }
);


// Update Movie Flow
export async function updateMovie(input: UpdateMovieInput): Promise<UpdateMovieOutput> {
    return updateMovieFlow(input);
}

const updateMovieFlow = ai.defineFlow(
    {
        name: 'updateMovieFlow',
        inputSchema: UpdateMovieInputSchema,
        outputSchema: UpdateMovieOutputSchema,
    },
    async (input) => {
        const { movieId, ...updateData } = input;
        
        try {
            if (!ObjectId.isValid(movieId)) {
                return { success: false, message: 'Invalid Movie ID format.' };
            }

            const { db } = await connectToDatabase();
            const moviesCollection = db.collection('movies');
            
            const updatePayload: Record<string, any> = { ...updateData };
            updatePayload.updatedAt = new Date(); // Always update the timestamp

            const result = await moviesCollection.findOneAndUpdate(
                { _id: new ObjectId(movieId) },
                { $set: updatePayload },
                { returnDocument: 'after' }
            );

            if (result) {
                const updatedMovieDoc = result as any;
                const updatedMovie: MovieOutput = {
                    id: updatedMovieDoc._id.toString(),
                    title: updatedMovieDoc.title,
                    posterUrl: updatedMovieDoc.posterUrl,
                    type: updatedMovieDoc.type || 'movie',
                    backdropUrl: updatedMovieDoc.backdropUrl === null ? undefined : updatedMovieDoc.backdropUrl,
                    genres: Array.isArray(updatedMovieDoc.genres) ? updatedMovieDoc.genres : [],
                    releaseDate: updatedMovieDoc.releaseDate,
                    overview: updatedMovieDoc.overview,
                    cast: Array.isArray(updatedMovieDoc.cast) ? updatedMovieDoc.cast.map((c: any) => ({
                        name: c.name,
                        character: c.character,
                        profileUrl: c.profileUrl === null ? undefined : c.profileUrl,
                        dataAiHint: c.dataAiHint,
                    })) : [],
                    director: updatedMovieDoc.director,
                    trailerUrl: updatedMovieDoc.trailerUrl === null ? undefined : updatedMovieDoc.trailerUrl,
                    watchUrl: updatedMovieDoc.watchUrl === null ? undefined : updatedMovieDoc.watchUrl,
                    dataAiHint: updatedMovieDoc.dataAiHint,
                    rating: typeof updatedMovieDoc.rating === 'number' ? updatedMovieDoc.rating : 0,
                    episodes: Array.isArray(updatedMovieDoc.episodes) ? updatedMovieDoc.episodes.map((ep: any) => ({ title: ep.title, downloadUrl: ep.downloadUrl, watchUrl: ep.watchUrl })) : undefined,
                };
                invalidateMoviesCache(); // Invalidate cache on update
                return { success: true, message: 'Movie updated successfully.', movie: updatedMovie };
            }
            return { success: false, message: 'Movie not found or failed to update.' };

        } catch (error: any) {
            console.error('Error updating movie:', error);
            return { success: false, message: error.message || 'An unexpected error occurred while updating the movie.' };
        }
    }
);


// Delete Movie Flow
export async function deleteMovie(input: DeleteMovieInput): Promise<DeleteMovieOutput> {
  return deleteMovieFlow(input);
}

const deleteMovieFlow = ai.defineFlow(
  {
    name: 'deleteMovieFlow',
    inputSchema: DeleteMovieInputSchema,
    outputSchema: DeleteMovieOutputSchema,
  },
  async ({ movieId }) => {
    try {
      if (!ObjectId.isValid(movieId)) {
        return { success: false, message: 'Invalid Movie ID format.' };
      }
      const { db } = await connectToDatabase();
      const moviesCollection = db.collection('movies');
      
      const result = await moviesCollection.deleteOne({ _id: new ObjectId(movieId) });

      if (result.deletedCount === 1) {
        invalidateMoviesCache(); // Invalidate cache on delete
        return { success: true, message: 'Movie deleted successfully.' };
      }
      return { success: false, message: 'Movie not found or already deleted.' };

    } catch (error: any) {
      console.error('Error deleting movie:', error);
      return { success: false, message: error.message || 'An unexpected error occurred while deleting the movie.' };
    }
  }
);
