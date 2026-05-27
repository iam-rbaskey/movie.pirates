'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
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
import { verifyAuth, requirePermission } from '@/lib/auth';
import { logAuditEvent } from './audit-log-flow';

export type MovieCreateInput = MovieCreateInputType;
export type MovieOutput = MovieOutputType;
export type DeleteMovieInput = DeleteMovieInputType;
export type DeleteMovieOutput = DeleteMovieOutputSchemaType;
export type GetMovieByIdInput = GetMovieByIdInputType;
export type UpdateMovieInput = UpdateMovieInputType;
export type UpdateMovieOutput = UpdateMovieOutputType;

let moviesCache: MovieOutput[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 15000;

function invalidateMoviesCache() {
  moviesCache = null;
  cacheTimestamp = 0;
}

export async function addMovie(movieData: MovieCreateInput): Promise<z.infer<typeof AddMovieOutputSchema>> {
  try {
    const caller = await requirePermission('create_content');
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
      invalidateMoviesCache();
      
      await logAuditEvent({
        action: 'create_content',
        details: `Created new ${movieData.type} "${movieData.title}".`,
        category: 'content',
        severity: 'info'
      });

      return { success: true, message: 'Movie added successfully!', movieId: result.insertedId.toString() };
    }
    return { success: false, message: 'Failed to add movie due to a database error.' };

  } catch (error: any) {
    console.error('Error adding movie:', error);
    return { success: false, message: error.message || 'An unexpected error occurred while adding the movie.' };
  }
}

export async function getMovies(options?: { includeDeleted?: boolean }): Promise<MovieOutput[]> {
  try {
    const now = Date.now();
    const includeDeleted = options?.includeDeleted ?? false;

    // Load and cache all movies (we do filtering in-memory to keep cache efficient)
    if (!moviesCache || (now - cacheTimestamp >= CACHE_TTL)) {
      const { db } = await connectToDatabase();
      const moviesCollection = db.collection('movies');
      
      const moviesFromDB = await moviesCollection.find({}).sort({ releaseDate: -1 }).toArray();

      // Filter out malformed movie documents (e.g. missing title field)
      const validMoviesFromDB = moviesFromDB.filter(doc => doc && typeof doc.title === 'string' && doc.title.trim().length > 0);

      moviesCache = validMoviesFromDB.map(movieDoc => {
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
          status: doc.status || (doc.watchUrl ? 'published' : 'draft'),
          isFeatured: doc.isFeatured ?? false,
          regions: doc.regions || ['Global'],
          deletedAt: doc.deletedAt ? (doc.deletedAt instanceof Date ? doc.deletedAt.toISOString() : new Date(doc.deletedAt).toISOString()) : null,
          deletedBy: doc.deletedBy || null,
        };
      });
      cacheTimestamp = now;
    }
    
    // Filter out deleted movies based on requested option
    return moviesCache.filter(movie => includeDeleted ? !!movie.deletedAt : !movie.deletedAt);

  } catch (error: any) {
    console.error('Error fetching movies:', error);
    return []; 
  }
}

export async function getMovieById(input: GetMovieByIdInput): Promise<MovieOutput | null> {
  const { movieId } = input;
  try {
    if (!ObjectId.isValid(movieId)) {
      console.warn('Invalid Movie ID format for getMovieById:', movieId);
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
      status: doc.status || (doc.watchUrl ? 'published' : 'draft'),
      isFeatured: doc.isFeatured ?? false,
      regions: doc.regions || ['Global'],
      deletedAt: doc.deletedAt ? (doc.deletedAt instanceof Date ? doc.deletedAt.toISOString() : new Date(doc.deletedAt).toISOString()) : null,
      deletedBy: doc.deletedBy || null,
    };
    
    return movieForOutput;

  } catch (error: any) {
    console.error('Error fetching movie by ID:', error);
    return null;
  }
}

export async function updateMovie(input: UpdateMovieInput): Promise<UpdateMovieOutput> {
  const { movieId, ...updateData } = input;
  
  try {
      await requirePermission('edit_content');
      if (!ObjectId.isValid(movieId)) {
          return { success: false, message: 'Invalid Movie ID format.' };
      }

      const { db } = await connectToDatabase();
      const moviesCollection = db.collection('movies');
      
      const updatePayload: Record<string, any> = { ...updateData };
      updatePayload.updatedAt = new Date();

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
              status: updatedMovieDoc.status || (updatedMovieDoc.watchUrl ? 'published' : 'draft'),
              isFeatured: updatedMovieDoc.isFeatured ?? false,
              regions: updatedMovieDoc.regions || ['Global'],
              deletedAt: updatedMovieDoc.deletedAt ? (updatedMovieDoc.deletedAt instanceof Date ? updatedMovieDoc.deletedAt.toISOString() : new Date(updatedMovieDoc.deletedAt).toISOString()) : null,
              deletedBy: updatedMovieDoc.deletedBy || null,
          };
          
          invalidateMoviesCache();
          
          await logAuditEvent({
            action: 'edit_content',
            details: `Updated metadata for movie/series "${updatedMovieDoc.title}".`,
            category: 'content',
            severity: 'info'
          });

          return { success: true, message: 'Movie updated successfully.', movie: updatedMovie };
      }
      return { success: false, message: 'Movie not found or failed to update.' };

  } catch (error: any) {
      console.error('Error updating movie:', error);
      return { success: false, message: error.message || 'An unexpected error occurred while updating the movie.' };
  }
}

export async function deleteMovie(input: DeleteMovieInput): Promise<DeleteMovieOutput> {
  const { movieId } = input;
  try {
    if (!ObjectId.isValid(movieId)) {
      return { success: false, message: 'Invalid Movie ID format.' };
    }
    
    const caller = await requirePermission('delete_content');
    const { db } = await connectToDatabase();
    const moviesCollection = db.collection('movies');
    
    const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId) });
    if (!movie) {
      return { success: false, message: 'Movie not found.' };
    }
    
    // Perform soft delete
    const result = await moviesCollection.updateOne(
      { _id: new ObjectId(movieId) },
      { 
        $set: { 
          deletedAt: new Date(), 
          deletedBy: caller.name || caller.email,
          status: 'archived',
          updatedAt: new Date()
        } 
      }
    );

    if (result.modifiedCount === 1) {
      invalidateMoviesCache();
      
      await logAuditEvent({
        action: 'delete_content',
        details: `Soft-deleted "${movie.title}" (moved to trash).`,
        category: 'content',
        severity: 'warning'
      });
      
      return { success: true, message: 'Movie moved to trash.' };
    }
    return { success: false, message: 'Movie not found or already deleted.' };

  } catch (error: any) {
    console.error('Error deleting movie:', error);
    return { success: false, message: error.message || 'An unexpected error occurred while deleting the movie.' };
  }
}

export async function restoreMovie(movieId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!ObjectId.isValid(movieId)) {
      return { success: false, message: 'Invalid Movie ID format.' };
    }
    
    const caller = await requirePermission('publish_content');
    const { db } = await connectToDatabase();
    const moviesCollection = db.collection('movies');
    
    const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId) });
    if (!movie) {
      return { success: false, message: 'Movie not found.' };
    }
    
    const result = await moviesCollection.updateOne(
      { _id: new ObjectId(movieId) },
      { 
        $set: { 
          status: 'published',
          updatedAt: new Date()
        },
        $unset: {
          deletedAt: "",
          deletedBy: ""
        }
      }
    );

    if (result.modifiedCount === 1) {
      invalidateMoviesCache();
      
      await logAuditEvent({
        action: 'publish_content',
        details: `Restored movie/series "${movie.title}" from trash bin.`,
        category: 'content',
        severity: 'info'
      });
      
      return { success: true, message: 'Movie restored successfully.' };
    }
    return { success: false, message: 'Movie not found or failed to restore.' };
  } catch (error: any) {
    console.error('Error restoring movie:', error);
    return { success: false, message: error.message || 'An unexpected error occurred while restoring the movie.' };
  }
}

export async function deleteMoviePermanently(movieId: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!ObjectId.isValid(movieId)) {
      return { success: false, message: 'Invalid Movie ID format.' };
    }
    
    const caller = await requirePermission('delete_content');
    const { db } = await connectToDatabase();
    const moviesCollection = db.collection('movies');
    
    const movie = await moviesCollection.findOne({ _id: new ObjectId(movieId) });
    if (!movie) {
      return { success: false, message: 'Movie not found.' };
    }
    
    const result = await moviesCollection.deleteOne({ _id: new ObjectId(movieId) });

    if (result.deletedCount === 1) {
      invalidateMoviesCache();
      
      await logAuditEvent({
        action: 'delete_content',
        details: `Permanently deleted movie/series "${movie.title}" from the database.`,
        category: 'content',
        severity: 'critical'
      });
      
      return { success: true, message: 'Movie permanently deleted.' };
    }
    return { success: false, message: 'Movie not found or already deleted.' };
  } catch (error: any) {
    console.error('Error permanently deleting movie:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
