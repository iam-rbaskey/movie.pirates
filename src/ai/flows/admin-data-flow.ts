
'use server';
/**
 * @fileOverview Provides data for the admin dashboard by fetching from MongoDB.
 * - getAdminDashboardData: Fetches summary counts, recent activity, and signups/visitors.
 * - AdminDashboardDataOutput: The schema for the admin dashboard data.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { formatDistanceToNow } from 'date-fns'; // For formatting time in recent activity

const DashboardCountsSchema = z.object({
  totalUsers: z.number().describe("Total number of registered users."),
  totalMovies: z.number().describe("Total number of movies in the system."),
  totalReviews: z.number().describe("Total number of reviews submitted."),
  totalVisitors: z.number().describe("Total number of unique anonymous visitors."),
});

const RecentActivityItemSchema = z.object({
  id: z.union([z.string(), z.number()]).describe("Unique identifier for the activity."),
  type: z.enum(['New User', 'New Movie', 'New Review']).describe("Type of activity."),
  description: z.string().describe("Description of the activity."),
  time: z.string().describe("Time the activity occurred (e.g., '2 hours ago')."),
  timestamp: z.string().datetime({ message: "Invalid ISO 8601 datetime string" }).describe("Actual timestamp of the activity for sorting, in ISO 8601 format."),
});

const MonthlySignupItemSchema = z.object({
  name: z.string().describe("Month name (e.g., 'Jan')."),
  users: z.number().describe("Number of users signed up in that month."),
});

const DailyVisitorItemSchema = z.object({
  date: z.string().describe("Date (e.g., 'Jun 15')."),
  visitors: z.number().describe("Number of new anonymous visitors on that date."),
});

const AdminDashboardDataOutputSchema = z.object({
  counts: DashboardCountsSchema,
  recentActivity: z.array(RecentActivityItemSchema),
  monthlySignups: z.array(MonthlySignupItemSchema),
  dailyVisitors: z.array(DailyVisitorItemSchema),
});
export type AdminDashboardDataOutput = z.infer<typeof AdminDashboardDataOutputSchema>;

export async function getAdminDashboardData(): Promise<AdminDashboardDataOutput> {
  return getAdminDashboardDataFlow({});
}

const getAdminDashboardDataFlow = ai.defineFlow(
  {
    name: 'getAdminDashboardDataFlow',
    inputSchema: z.object({}),
    outputSchema: AdminDashboardDataOutputSchema,
  },
  async (_input) => {
    try {
      const { db } = await connectToDatabase();
      
      const usersCollection = db.collection('users');
      const moviesCollection = db.collection('movies');
      const reviewsCollection = db.collection('reviews');
      const visitorsCollection = db.collection('visitors');

      // Aggregate Counts
      const totalUsers = await usersCollection.countDocuments();
      const totalMovies = await moviesCollection.countDocuments();
      const totalVisitors = await visitorsCollection.countDocuments();
      
      let totalReviews = 0;
      try {
        totalReviews = await reviewsCollection.countDocuments();
      } catch (e) {
        console.warn("Could not count 'reviews' collection, it might not exist yet or an error occurred. Defaulting to 0.", e);
      }
      
      // Fetch Recent Activity (last 5 combined)
      const recentUsers = await usersCollection.find({})
        .sort({ createdAt: -1 })
        .limit(3) 
        .toArray();
      
      const recentMovies = await moviesCollection.find({})
        .sort({ createdAt: -1 })
        .limit(3) 
        .toArray();
      
      let combinedActivityInternal: Array<{
        id: string;
        type: 'New User' | 'New Movie' | 'New Review';
        description: string;
        time: string;
        timestamp: Date; // Keep as Date for sorting
      }> = [];

      recentUsers.forEach(user => {
        combinedActivityInternal.push({
          id: user._id.toString(),
          type: 'New User',
          description: `${user.name || 'A user'} registered.`, 
          time: user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'Unknown time',
          timestamp: user.createdAt ? new Date(user.createdAt) : new Date(0),
        });
      });

      recentMovies.forEach(movie => {
        combinedActivityInternal.push({
          id: movie._id.toString(),
          type: 'New Movie',
          description: `"${movie.title || 'A movie'}" was added.`, 
          time: movie.createdAt ? formatDistanceToNow(new Date(movie.createdAt), { addSuffix: true }) : 'Unknown time',
          timestamp: movie.createdAt ? new Date(movie.createdAt) : new Date(0), 
        });
      });
      
      combinedActivityInternal.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const slicedActivity = combinedActivityInternal.slice(0, 5);

      const recentActivity = slicedActivity.map(activity => ({
        ...activity,
        timestamp: activity.timestamp.toISOString(),
      }));

      // Common setup for date ranges
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11); 
      twelveMonthsAgo.setDate(1);
      twelveMonthsAgo.setHours(0, 0, 0, 0);

      // --- Monthly Signups (Last 12 months) ---
      const signupAggregation = await usersCollection.aggregate([
        { $match: { createdAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, users: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]).toArray();

      const monthlySignupsMap = new Map<string, number>();
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        monthlySignupsMap.set(monthKey, 0);
      }
      
      signupAggregation.forEach(item => {
        if (item._id && typeof item._id.month === 'number' && typeof item._id.year === 'number') {
          const key = `${monthNames[item._id.month - 1]} ${item._id.year}`;
          if (monthlySignupsMap.has(key)) monthlySignupsMap.set(key, item.users);
        }
      });
      
      const monthlySignups: AdminDashboardDataOutput['monthlySignups'] = [];
      for (let i = 11; i >= 0; i--) { 
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          const monthName = monthNames[date.getMonth()];
          monthlySignups.push({ name: monthName, users: monthlySignupsMap.get(monthKey) || 0 });
      }
      
      // --- Daily Visitors (Last 30 days) ---
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // include today
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const visitorAggregation = await visitorsCollection.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } }, visitors: { $sum: 1 } } },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
      ]).toArray();
      
      const dailyVisitorsMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = `${monthNames[date.getMonth()]} ${date.getDate()}`;
        dailyVisitorsMap.set(dateKey, 0);
      }
      
      visitorAggregation.forEach(item => {
        if (item._id && typeof item._id.month === 'number' && typeof item._id.day === 'number') {
          const key = `${monthNames[item._id.month - 1]} ${item._id.day}`;
          dailyVisitorsMap.set(key, item.visitors);
        }
      });
      
      const dailyVisitors: AdminDashboardDataOutput['dailyVisitors'] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = `${monthNames[date.getMonth()]} ${date.getDate()}`;
        dailyVisitors.push({ date: dateKey, visitors: dailyVisitorsMap.get(dateKey) || 0 });
      }

      return {
        counts: { totalUsers, totalMovies, totalReviews, totalVisitors },
        recentActivity,
        monthlySignups,
        dailyVisitors,
      };

    } catch (e: any) {
      console.error("Failed to fetch admin dashboard data from MongoDB:", e);
      const fallbackMonths: { name: string, users: number }[] = [];
      const fallbackDays: { date: string, visitors: number }[] = [];
      const monthNamesFallback = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          fallbackMonths.push({ name: monthNamesFallback[date.getMonth()], users: 0 });
      }

      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        fallbackDays.push({ date: `${monthNamesFallback[date.getMonth()]} ${date.getDate()}`, visitors: 0 });
      }

      return {
        counts: { totalUsers: 0, totalMovies: 0, totalReviews: 0, totalVisitors: 0 },
        recentActivity: [],
        monthlySignups: fallbackMonths,
        dailyVisitors: fallbackDays,
      };
    }
  }
);
