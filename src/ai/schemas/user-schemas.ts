/**
 * @fileOverview Zod schemas for user profile management.
 */
import { z } from 'zod';
import { MovieOutputSchema } from './movie-schemas';
import { ReviewSchema } from './review-schemas';

// Schema for GetUserProfileOutput
export const UserProfileOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional().nullable(),
  watchlist: z.array(MovieOutputSchema).default([]),
  reviews: z.array(ReviewSchema).default([]),
  ratingHistory: z.array(z.object({ movieId: z.string(), rating: z.number().min(0).max(10) })).default([]),
  role: z.enum(['user', 'admin']).default('user'),
  dataAiHint: z.string().optional().nullable(),
  lastSeen: z.string().datetime().optional().nullable(),
  lastIp: z.string().optional().nullable(),
});
export type UserProfileOutput = z.infer<typeof UserProfileOutputSchema>;

export const GetUserProfileInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
export type GetUserProfileInput = z.infer<typeof GetUserProfileInputSchema>;

// Schema for UpdateUserProfile
export const UpdateUserProfileInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  avatarUrl: z.string().url("Invalid URL for avatar").optional().nullable(),
});
export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileInputSchema>;

export const UpdateUserProfileOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: UserProfileOutputSchema.optional().nullable(),
});
export type UpdateUserProfileOutput = z.infer<typeof UpdateUserProfileOutputSchema>;
