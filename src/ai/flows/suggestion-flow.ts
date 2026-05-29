'use server';

import { z } from 'zod';
import crypto from 'crypto';
import {
  AddSuggestionInputSchema,
  AddSuggestionOutputSchema,
  GetSuggestionsOutputSchema,
  type AddSuggestionInput,
  type SuggestionOutput,
} from '@/ai/schemas/suggestion-schemas';
import { supabaseAdmin, mapUserFromDb } from '@/lib/supabase';

export type { SuggestionOutput, AddSuggestionInput };

export async function getSuggestions(): Promise<SuggestionOutput[]> {
  try {
    const { data: suggestionsFromDb, error } = await supabaseAdmin
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const suggestionsForOutput: SuggestionOutput[] = (suggestionsFromDb || []).map(doc => ({
      id: doc.id,
      text: doc.text,
      userId: doc.user_id,
      userName: doc.user_name,
      userAvatarUrl: doc.user_avatar_url || null,
      dataAiHintUser: doc.data_ai_hint_user || null,
      createdAt: new Date(doc.created_at).toISOString(),
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
    if (!userId) {
      return { success: false, message: "Invalid user ID." };
    }

    const { data: rawUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !rawUser) {
      return { success: false, message: "User not found." };
    }
    const user = mapUserFromDb(rawUser)!;

    const suggestionId = crypto.randomBytes(12).toString('hex');
    const newDoc = {
      id: suggestionId,
      text,
      user_id: userId,
      user_name: user.name,
      user_avatar_url: user.avatarUrl || null,
      data_ai_hint_user: user.dataAiHint || null,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabaseAdmin
      .from('suggestions')
      .insert(newDoc);

    if (insertError) {
      console.error('Error saving suggestion:', insertError);
      return { success: false, message: "Failed to save suggestion." };
    }

    const resultSuggestion: SuggestionOutput = {
      id: newDoc.id,
      text: newDoc.text,
      userId: newDoc.user_id,
      userName: newDoc.user_name,
      userAvatarUrl: newDoc.user_avatar_url,
      dataAiHintUser: newDoc.data_ai_hint_user,
      createdAt: newDoc.created_at,
    };

    return {
      success: true,
      message: "Suggestion submitted successfully!",
      suggestion: resultSuggestion,
    };
  } catch (error: any) {
    console.error('Error adding suggestion:', error);
    return { success: false, message: error.message || 'An unexpected error occurred.' };
  }
}
