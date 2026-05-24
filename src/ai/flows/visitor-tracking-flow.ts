'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';

const TrackVisitorInputSchema = z.object({
  visitorId: z.string().min(1, "Visitor ID is required"),
});
export type TrackVisitorInput = z.infer<typeof TrackVisitorInputSchema>;

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
    console.error("Failed to parse headers for visitor IP:", e);
    return '127.0.0.1';
  }
}

export async function trackAnonymousVisitor(input: TrackVisitorInput): Promise<{ success: boolean }> {
  const { visitorId } = input;
  try {
    const { db } = await connectToDatabase();
    const visitorsCollection = db.collection('visitors');
    const ip = await getClientIp();

    // Check if visitor already exists to avoid duplicate entries
    const existingVisitor = await visitorsCollection.findOne({ visitorId });

    if (existingVisitor) {
      await visitorsCollection.updateOne(
        { visitorId },
        { $set: { lastSeen: new Date(), ip } }
      );
      return { success: true };
    }
    
    // Insert new visitor
    await visitorsCollection.insertOne({
      visitorId,
      ip,
      createdAt: new Date(),
      lastSeen: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error tracking anonymous visitor:', error);
    return { success: false };
  }
}
