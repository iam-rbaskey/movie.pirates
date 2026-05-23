
// All types are now derived from the Zod schemas in the /ai/schemas directory.
// This ensures a single source of truth for data structures across the app.

// Re-exporting the inferred type from the schema file.
// The `as Movie` alias is to maintain compatibility with existing mock data and components.
export type { MovieOutput as Movie } from '@/ai/schemas/movie-schemas';

// Re-exporting the inferred type from the schema file.
export type { ReviewOutput as Review } from '@/ai/schemas/review-schemas';

// Re-exporting the inferred type from the schema file.
export type { UserProfileOutput as UserProfile } from '@/ai/schemas/user-schemas';
