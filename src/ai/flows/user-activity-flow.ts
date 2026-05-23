
'use server';
/**
 * @fileOverview Flow to update a user's last seen timestamp.
 * - updateUserActivity: Updates the 'lastSeen' field for a given user.
 * - UpdateUserActivityInput: The input schema for the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const UpdateUserActivityInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
export type UpdateUserActivityInput = z.infer<typeof UpdateUserActivityInputSchema>;

export async function updateUserActivity(input: UpdateUserActivityInput): Promise<{ success: boolean }> {
  return updateUserActivityFlow(input);
}

const updateUserActivityFlow = ai.defineFlow(
  {
    name: 'updateUserActivityFlow',
    inputSchema: UpdateUserActivityInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async ({ userId }) => {
    try {
      if (!ObjectId.isValid(userId)) {
        // Silently fail for invalid IDs to prevent client-side errors on log out, etc.
        return { success: false };
      }
      
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Update the user's lastSeen timestamp.
      // This is a "fire-and-forget" operation from the client's perspective.
      await usersCollection.updateOne(
        { _id: new ObjectId(userId) as any },
        { $set: { lastSeen: new Date() } }
      );

      return { success: true };
    } catch (error) {
      // We don't want to spam logs for a background task, but logging is good for debugging.
      console.error('Error updating user activity:', error);
      return { success: false };
    }
  }
);
