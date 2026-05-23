'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const UpdateUserActivityInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
export type UpdateUserActivityInput = z.infer<typeof UpdateUserActivityInputSchema>;

export async function updateUserActivity(input: UpdateUserActivityInput): Promise<{ success: boolean }> {
  const { userId } = input;
  try {
    if (!ObjectId.isValid(userId)) {
      return { success: false };
    }
    
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) as any },
      { $set: { lastSeen: new Date() } }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating user activity:', error);
    return { success: false };
  }
}
