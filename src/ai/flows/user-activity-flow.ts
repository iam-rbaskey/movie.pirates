'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';

const UpdateUserActivityInputSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});
export type UpdateUserActivityInput = z.infer<typeof UpdateUserActivityInputSchema>;

async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) {
      const ips = forwardedFor.split(',');
      return ips[0].trim();
    }
    const realIp = headerList.get('x-real-ip');
    if (realIp) return realIp.trim();
    return '127.0.0.1';
  } catch (e) {
    console.error("Failed to parse headers for user IP:", e);
    return '127.0.0.1';
  }
}

export async function updateUserActivity(input: UpdateUserActivityInput): Promise<{ success: boolean }> {
  const { userId } = input;
  try {
    if (!ObjectId.isValid(userId)) {
      return { success: false };
    }
    
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const ip = await getClientIp();

    await usersCollection.updateOne(
      { _id: new ObjectId(userId) as any },
      { $set: { lastSeen: new Date(), lastIp: ip } }
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating user activity:', error);
    return { success: false };
  }
}
