/**
 * @fileOverview Zod schemas for user movie suggestions.
 */
import { z } from 'zod';

// Schema for a single suggestion output
export const SuggestionOutputSchema = z.object({
  id: z.string(),
  text: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatarUrl: z.string().optional().nullable(),
  dataAiHintUser: z.string().optional().nullable(),
  createdAt: z.string().datetime(),
});
export type SuggestionOutput = z.infer<typeof SuggestionOutputSchema>;

// Schema for the getSuggestions flow output
export const GetSuggestionsOutputSchema = z.array(SuggestionOutputSchema);

// Schema for adding a new suggestion
export const AddSuggestionInputSchema = z.object({
  text: z.string().min(3, "Suggestion must be at least 3 characters long.").max(500, "Suggestion cannot exceed 500 characters."),
  userId: z.string().min(1, "User ID is required."),
});
export type AddSuggestionInput = z.infer<typeof AddSuggestionInputSchema>;

export const AddSuggestionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  suggestion: SuggestionOutputSchema.optional(),
});
export type AddSuggestionOutput = z.infer<typeof AddSuggestionOutputSchema>;
