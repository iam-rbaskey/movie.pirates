'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  AddSuggestionInputSchema,
  AddSuggestionOutputSchema,
  GetSuggestionsOutputSchema,
  type AddSuggestionInput,
  type SuggestionOutput,
} from '@/ai/schemas/suggestion-schemas';

export type { SuggestionOutput, AddSuggestionInput };

export async function getSuggestions(): Promise<SuggestionOutput[]> {
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

export async function addSuggestion(input: AddSuggestionInput): Promise<z.infer<typeof AddSuggestionOutputSchema>> {
  const { text, userId } = input;
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
