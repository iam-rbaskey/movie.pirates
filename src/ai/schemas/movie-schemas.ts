/**
 * @fileOverview Zod schemas for movie management.
 * This file does NOT use 'use server' and is safe for defining complex synchronous Zod schemas.
 */
import { z } from 'zod';
import { ObjectId } from 'mongodb';

const EpisodeSchema = z.object({
  title: z.string().min(1, "Episode title is required"),
  downloadUrl: z.string().url({ message: "A valid download URL is required" }).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  watchUrl: z.string().url({ message: "A valid watch URL is required" }).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
});

// Zod schema for creating a movie (input for addMovie flow)
// Only Title and Poster URL are strictly required.
export const MovieCreateInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  posterUrl: z.string().url({ message: "A valid Poster URL is required" }),
  type: z.enum(['movie', 'series']).default('movie'),
  backdropUrl: z.string().url({ message: "Backdrop URL must be a valid URL if provided" }).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  genres: z.array(z.string()).default([]),
  releaseDate: z.string().default(''),
  overview: z.string().default(''),
  cast: z.array(z.object({
    name: z.string().default(''),
    character: z.string().default(''),
    profileUrl: z.string().url({ message: "Profile URL must be a valid URL if provided" }).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
    dataAiHint: z.string().optional(),
  })).default([]),
  director: z.string().default(''),
  trailerUrl: z.string().url({ message: "Trailer URL must be a valid URL if provided" }).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  watchUrl: z.string().url({ message: "Watch URL must be a valid URL if provided" }).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  dataAiHint: z.string().optional(),
  rating: z.number().min(0).max(10).default(0),
  episodes: z.array(EpisodeSchema).optional(),
});
export type MovieCreateInput = z.infer<typeof MovieCreateInputSchema>;

// Schema for updating a movie. All fields are optional except for the movieId.
export const UpdateMovieInputSchema = MovieCreateInputSchema.partial().extend({
  movieId: z.string().min(1, "Movie ID is required for updates."),
});
export type UpdateMovieInput = z.infer<typeof UpdateMovieInputSchema>;


// Schema for movie data coming from DB (includes _id)
export const MovieDBSchema = MovieCreateInputSchema.extend({
  _id: z.instanceof(ObjectId),
  createdAt: z.date().optional(), // Optional: if you track creation time
  updatedAt: z.date().optional(), // Optional: if you track update time
});

// Schema for movie data returned by getMovies flow (maps _id to id)
export const MovieOutputSchema = MovieCreateInputSchema.extend({
  id: z.string(), // Mapped from _id
});
export type MovieOutput = z.infer<typeof MovieOutputSchema>;

export const AddMovieOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  movieId: z.string().optional(),
});

export const GetMoviesOutputSchema = z.array(MovieOutputSchema);

// Schemas for Deleting a Movie
export const DeleteMovieInputSchema = z.object({
  movieId: z.string().min(1, "Movie ID is required"),
});
export type DeleteMovieInput = z.infer<typeof DeleteMovieInputSchema>;

export const DeleteMovieOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteMovieOutput = z.infer<typeof DeleteMovieOutputSchema>;

// Schemas for Getting a single movie by ID
export const GetMovieByIdInputSchema = z.object({
  movieId: z.string().min(1, "Movie ID is required"),
});
export type GetMovieByIdInput = z.infer<typeof GetMovieByIdInputSchema>;

// Schema for the output of the update movie flow
export const UpdateMovieOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  movie: MovieOutputSchema.optional().nullable(),
});
export type UpdateMovieOutput = z.infer<typeof UpdateMovieOutputSchema>;
