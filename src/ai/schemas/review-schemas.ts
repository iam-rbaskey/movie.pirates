/**
 * @fileOverview Zod schemas for review management.
 */
import { z } from 'zod';

// This schema defines the shape of a review object, serving as the single source of truth.
export const ReviewSchema = z.object({
  id: z.string(),
  movieId: z.string(),
  userId: z.string(),
  userAvatarUrl: z.string().url().optional().nullable(),
  userName: z.string(),
  rating: z.number().min(0).max(10),
  comment: z.string(),
  createdAt: z.string().datetime(),
  dataAiHintUser: z.string().optional().nullable(),
  // Optional fields for denormalization to improve performance in UI
  movieTitle: z.string().optional(),
  moviePosterUrl: z.string().url().optional(),
});
export type ReviewOutput = z.infer<typeof ReviewSchema>;

export const GetReviewsInputSchema = z.object({
  movieId: z.string().min(1, "Movie ID is required"),
});
export type GetReviewsInput = z.infer<typeof GetReviewsInputSchema>;

export const AddReviewInputSchema = z.object({
  movieId: z.string().min(1, "Movie ID is required"),
  userId: z.string().min(1, "User ID is required"),
  userName: z.string().min(1, "User name is required"),
  userAvatarUrl: z.string().url().optional().nullable(),
  rating: z.number().min(0).max(10, "Rating must be between 0 and 10"),
  comment: z.string().min(3, "Comment must be at least 3 characters").max(1000, "Comment cannot exceed 1000 characters"),
});
export type AddReviewInput = z.infer<typeof AddReviewInputSchema>;

export const AddReviewOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  review: ReviewSchema.optional(),
});
export type AddReviewOutput = z.infer<typeof AddReviewOutputSchema>;

export const DeleteReviewInputSchema = z.object({
  reviewId: z.string().min(1, "Review ID is required"),
});
export type DeleteReviewInput = z.infer<typeof DeleteReviewInputSchema>;

export const DeleteReviewOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type DeleteReviewOutput = z.infer<typeof DeleteReviewOutputSchema>;
