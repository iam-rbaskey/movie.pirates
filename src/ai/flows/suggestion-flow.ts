'use server';
/**
 * @fileOverview Manages user movie suggestions.
 *
 * - addSuggestion: Allows a registered user to add a new movie suggestion.
 * - getSuggestions: Fetches all movie suggestions for public display.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  AddSuggestionInputSchema,
  AddSuggestionOutputSchema,
  GetSuggestionsOutputSchema,
  SuggestionOutputSchema,
  type AddSuggestionInput,
  type SuggestionOutput,
} from '@/ai/schemas/suggestion-schemas';

// Re-export types for client-side usage
export type { SuggestionOutput, AddSuggestionInput };

// Get Suggestions Flow
export async function getSuggestions(): Promise<SuggestionOutput[]> {
  return getSuggestionsFlow({});
}

const getSuggestionsFlow = ai.defineFlow(
  {
    name: 'getSuggestionsFlow',
    inputSchema: z.object({}),
    outputSchema: GetSuggestionsOutputSchema,
  },
  async () => {
    try {
      const { db } = await connectToDatabase();
      const suggestionsCollection = db.collection('suggestions');
      const suggestionsFromDb = await suggestionsCollection.find({}).sort({ createdAt: -1 }).toArray();

      const suggestionsForOutput: SuggestionOutput[] = suggestionsFromDb.map(doc => ({
        id: doc._id.toString(),
        text: doc.text,
        userId: doc.userId.toString(),
        userName: doc.userName,
        userAvatarUrl: doc.userAvatarUrl,
        dataAiHintUser: doc.dataAiHintUser,
        createdAt: new Date(doc.createdAt).toISOString(),
      }));
      
      return suggestionsForOutput;
    } catch (error: any) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }
);


// Add Suggestion Flow
export async function addSuggestion(input: AddSuggestionInput): Promise<z.infer<typeof AddSuggestionOutputSchema>> {
  return addSuggestionFlow(input);
}

const addSuggestionFlow = ai.defineFlow(
  {
    name: 'addSuggestionFlow',
    inputSchema: AddSuggestionInputSchema,
    outputSchema: AddSuggestionOutputSchema,
  },
  async ({ text, userId }) => {
    try {
      if (!ObjectId.isValid(userId)) {
        return { success: false, message: "Invalid user ID." };
      }

      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');
      const suggestionsCollection = db.collection('suggestions');
      
      const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (!user) {
        return { success: false, message: "User not found." };
      }

      const newSuggestionDocument = {
        text,
        userId: new ObjectId(userId),
        userName: user.name,
        userAvatarUrl: user.avatarUrl,
        dataAiHintUser: user.dataAiHint,
        createdAt: new Date(),
      };
      
      const result = await suggestionsCollection.insertOne(newSuggestionDocument);

      if (result.insertedId) {
        const createdSuggestion: SuggestionOutput = {
          id: result.insertedId.toString(),
          text: newSuggestionDocument.text,
          userId: newSuggestionDocument.userId.toString(),
          userName: newSuggestionDocument.userName,
          userAvatarUrl: newSuggestionDocument.userAvatarUrl,
          dataAiHintUser: newSuggestionDocument.dataAiHintUser,
          createdAt: newSuggestionDocument.createdAt.toISOString(),
        };
        return { success: true, message: "Suggestion submitted successfully!", suggestion: createdSuggestion };
      }
      
      return { success: false, message: "Failed to submit suggestion." };

    } catch (error: any) {
      console.error('Error adding suggestion:', error);
      return { success: false, message: error.message || "An unexpected error occurred." };
    }
  }
);
