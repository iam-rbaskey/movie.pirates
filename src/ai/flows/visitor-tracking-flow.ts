
'use server';
/**
 * @fileOverview Flow to track anonymous website visitors.
 * - trackAnonymousVisitor: Records a new visitor if they haven't been seen before.
 * - TrackVisitorInput: The input schema for the flow.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';

const TrackVisitorInputSchema = z.object({
  visitorId: z.string().min(1, "Visitor ID is required"),
});
export type TrackVisitorInput = z.infer<typeof TrackVisitorInputSchema>;

export async function trackAnonymousVisitor(input: TrackVisitorInput): Promise<{ success: boolean }> {
  return trackAnonymousVisitorFlow(input);
}

const trackAnonymousVisitorFlow = ai.defineFlow(
  {
    name: 'trackAnonymousVisitorFlow',
    inputSchema: TrackVisitorInputSchema,
    outputSchema: z.object({ success: z.boolean() }),
  },
  async ({ visitorId }) => {
    try {
      const { db } = await connectToDatabase();
      const visitorsCollection = db.collection('visitors');

      // Check if visitor already exists to avoid duplicate entries
      const existingVisitor = await visitorsCollection.findOne({ visitorId });

      if (existingVisitor) {
        return { success: true }; // Already tracked, so it's a success
      }
      
      // Insert new visitor
      await visitorsCollection.insertOne({
        visitorId,
        createdAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error tracking anonymous visitor:', error);
      return { success: false };
    }
  }
);
