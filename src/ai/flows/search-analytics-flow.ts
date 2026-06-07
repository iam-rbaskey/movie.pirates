'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyAuth, requirePermission } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';

const LogSearchQueryInputSchema = z.object({
  query: z.string().min(1, "Query is required"),
  resultsCount: z.number().int().nonnegative("Results count must be non-negative"),
});

export type LogSearchQueryInput = z.infer<typeof LogSearchQueryInputSchema>;

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
    console.error("Failed to parse headers for search log IP:", e);
    return '127.0.0.1';
  }
}

export async function logSearchQuery(input: LogSearchQueryInput): Promise<{ success: boolean }> {
  try {
    const validated = LogSearchQueryInputSchema.parse(input);
    const { query, resultsCount } = validated;

    // Skip tracking very short searches (like 1 char typos)
    if (query.trim().length < 2) {
      return { success: false };
    }

    const caller = await verifyAuth();
    const { db } = await connectToDatabase();
    const ip = await getClientIp();

    await db.collection<any>('search_queries').insertOne({
      query: query.trim(),
      resultsCount,
      userId: caller ? new ObjectId(caller.userId) : null,
      userName: caller ? caller.name : 'Anonymous',
      ip,
      timestamp: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error logging search query:", error);
    return { success: false };
  }
}

export async function getSearchAnalytics() {
  try {
    await requirePermission('view_analytics');
    const { db } = await connectToDatabase();
    
    const queriesCollection = db.collection<any>('search_queries');
    const allQueries = (await queriesCollection.find({}).sort({ timestamp: -1 }).toArray()) as any[];

    // 1. If empty database, auto-seed with high-quality sample searches for demonstration
    if (allQueries.length === 0) {
      const demoQueries = [
        { query: "batman dark knight", resultsCount: 2, timestamp: new Date(Date.now() - 3600 * 1000 * 2) },
        { query: "sci-fi movies with medieval dynamic values", resultsCount: 0, timestamp: new Date(Date.now() - 3600 * 1000 * 5) },
        { query: "inception", resultsCount: 1, timestamp: new Date(Date.now() - 3600 * 1000 * 9) },
        { query: "matrix trilogy", resultsCount: 3, timestamp: new Date(Date.now() - 3600 * 1000 * 14) },
        { query: "interstellar space travel", resultsCount: 1, timestamp: new Date(Date.now() - 3600 * 1000 * 18) },
        { query: "avengers endgame", resultsCount: 4, timestamp: new Date(Date.now() - 3600 * 1000 * 22) },
        { query: "movies about quantum mechanics with zero mathematical errors", resultsCount: 0, timestamp: new Date(Date.now() - 3600 * 1000 * 26) },
        { query: "royal violet drama series", resultsCount: 1, timestamp: new Date(Date.now() - 3600 * 1000 * 30) },
        { query: "documentary on deep space travel starring Keanu Reeves", resultsCount: 0, timestamp: new Date(Date.now() - 3600 * 1000 * 36) },
        { query: "classic animated movie", resultsCount: 5, timestamp: new Date(Date.now() - 3600 * 1000 * 42) }
      ];

      try {
        await queriesCollection.insertMany(demoQueries);
        const seeded = await queriesCollection.find({}).sort({ timestamp: -1 }).toArray();
        allQueries.push(...seeded);
      } catch (err) {
        allQueries.push(...demoQueries);
      }
    }

    // 2. Compute Success Rate (searches returning 1 or more results / total searches)
    const successCount = allQueries.filter(q => q.resultsCount > 0).length;
    const successRate = parseFloat(((successCount / allQueries.length) * 100).toFixed(1));

    // 3. Analyze Keywords (Aggregate words from searches)
    const wordCounts: Record<string, number> = {};
    const stopwords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'at', 'to', 'of', 'movies', 'movie', 'show', 'shows', 'like', 'similar', 'about', 'recommend', 'suggest']);

    allQueries.forEach(item => {
      const words = item.query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
      words.forEach((w: string) => {
        if (w.length > 2 && !stopwords.has(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
    });

    const trendingKeywords = Object.keys(wordCounts)
      .map((key, idx) => ({ keyword: key, count: wordCounts[key], rank: 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    trendingKeywords.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // 4. Build Timeline Data (Aggregate search queries by day)
    const dateCounts: Record<string, number> = {};
    allQueries.forEach(item => {
      try {
        const date = new Date(item.timestamp);
        const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
      } catch {
        // ignore
      }
    });

    // Generate last 7 days of timeline
    const timelineData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      timelineData.push({
        date: key,
        queries: dateCounts[key] || 0
      });
    }

    // 5. Extract Failed Searches (queries with resultsCount === 0)
    const failedSearches = Array.from(new Set(
      allQueries
        .filter(q => q.resultsCount === 0)
        .map(q => q.query)
    )).slice(0, 5);

    return {
      totalQueries: allQueries.length,
      successRate,
      trendingKeywords,
      timelineData,
      failedSearches
    };

  } catch (error) {
    console.error("Error retrieving search analytics:", error);
    throw error;
  }
}
