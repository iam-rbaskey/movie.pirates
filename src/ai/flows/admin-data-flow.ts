'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { formatDistanceToNow } from 'date-fns';
import { verifyAuth } from '@/lib/auth';
import { supabaseAdmin, mapUserFromDb } from '@/lib/supabase';

const DashboardCountsSchema = z.object({
  totalUsers: z.number().describe("Total number of registered users."),
  totalMovies: z.number().describe("Total number of movies in the system."),
  totalReviews: z.number().describe("Total number of reviews submitted."),
  totalVisitors: z.number().describe("Total number of unique anonymous visitors."),
  moviesCount: z.number().optional().describe("Number of movies in the system."),
  seriesCount: z.number().optional().describe("Number of TV series in the system."),
  posterlessCount: z.number().optional().describe("Number of movies missing poster artwork."),
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
  currentUser: z.object({
    name: z.string(),
    role: z.string(),
    hierarchyLevel: z.number(),
  }).optional().nullable(),
});
export type AdminDashboardDataOutput = z.infer<typeof AdminDashboardDataOutputSchema>;

export async function getAdminDashboardData(): Promise<AdminDashboardDataOutput> {
  try {
    const caller = await verifyAuth();
    const { db } = await connectToDatabase();
    
    const moviesCollection = db.collection('movies');
    const reviewsCollection = db.collection('reviews');

    // Aggregate Counts from Supabase (Users & Visitors)
    const { count: totalUsers, error: usersCountError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (usersCountError) throw usersCountError;

    const { count: totalVisitors, error: visitorsCountError } = await supabaseAdmin
      .from('visitors')
      .select('*', { count: 'exact', head: true });
    if (visitorsCountError) throw visitorsCountError;

    // Aggregate Counts from MongoDB (Movies & Reviews)
    const totalMovies = await moviesCollection.countDocuments();
    
    const moviesCount = await moviesCollection.countDocuments({
      $or: [
        { type: 'movie' },
        { type: { $exists: false } },
        { type: null }
      ]
    });
    const seriesCount = await moviesCollection.countDocuments({ type: 'series' });
    
    const posterlessCount = await moviesCollection.countDocuments({
      $or: [
        { posterUrl: { $exists: false } },
        { posterUrl: null },
        { posterUrl: "" }
      ]
    });
    
    let totalReviews = 0;
    try {
      totalReviews = await reviewsCollection.countDocuments();
    } catch (e) {
      console.warn("Could not count 'reviews' collection, it might not exist yet or an error occurred. Defaulting to 0.", e);
    }
    
    // Fetch Recent Activity (last 3 users from Supabase, last 3 movies from MongoDB)
    const { data: recentUsersDb, error: recentUsersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    if (recentUsersError) throw recentUsersError;
    const recentUsers = (recentUsersDb || []).map(mapUserFromDb).filter(Boolean);
    
    const recentMovies = await moviesCollection.find({})
      .sort({ createdAt: -1 })
      .limit(3) 
      .toArray();
    
    let combinedActivityInternal: Array<{
      id: string;
      type: 'New User' | 'New Movie' | 'New Review';
      description: string;
      time: string;
      timestamp: Date;
    }> = [];

    recentUsers.forEach(user => {
      if (!user) return;
      combinedActivityInternal.push({
        id: user.id,
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
        description: `New ${movie.type || 'movie'} "${movie.title}" was added.`, 
        time: movie.createdAt ? formatDistanceToNow(new Date(movie.createdAt), { addSuffix: true }) : 'Unknown time',
        timestamp: movie.createdAt ? new Date(movie.createdAt) : new Date(0),
      });
    });

    // Sort by timestamp desc and limit to 5
    combinedActivityInternal.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivity = combinedActivityInternal.slice(0, 5).map(act => ({
      id: act.id,
      type: act.type,
      description: act.description,
      time: act.time,
      timestamp: act.timestamp.toISOString(),
    }));

    // Monthly signups grouping (last 12 months) from Supabase
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0,0,0,0);

    const { data: signupUsers, error: signupUsersError } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', twelveMonthsAgo.toISOString());
    if (signupUsersError) throw signupUsersError;

    const monthlySignupsMap = new Map<string, number>();
    (signupUsers || []).forEach(u => {
      if (!u.created_at) return;
      const d = new Date(u.created_at);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlySignupsMap.set(key, (monthlySignupsMap.get(key) || 0) + 1);
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySignups: { name: string, users: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlySignups.push({
        name: monthNames[date.getMonth()],
        users: monthlySignupsMap.get(key) || 0
      });
    }

    // Daily visitors grouping (last 30 days) from Supabase
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0,0,0,0);

    const { data: visitorPings, error: visitorPingsError } = await supabaseAdmin
      .from('visitors')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());
    if (visitorPingsError) throw visitorPingsError;

    const dailyVisitorsMap = new Map<string, number>();
    (visitorPings || []).forEach(v => {
      if (!v.created_at) return;
      const d = new Date(v.created_at);
      const key = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      dailyVisitorsMap.set(key, (dailyVisitorsMap.get(key) || 0) + 1);
    });

    const dailyVisitors: { date: string, visitors: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = `${monthNames[date.getMonth()]} ${date.getDate()}`;
      dailyVisitors.push({ date: dateKey, visitors: dailyVisitorsMap.get(dateKey) || 0 });
    }

    return {
      counts: { 
        totalUsers: totalUsers || 0, 
        totalMovies, 
        totalReviews, 
        totalVisitors: totalVisitors || 0, 
        moviesCount, 
        seriesCount, 
        posterlessCount 
      },
      recentActivity,
      monthlySignups,
      dailyVisitors,
      currentUser: caller ? {
        name: caller.name,
        role: caller.role,
        hierarchyLevel: caller.hierarchyLevel,
      } : null
    };

  } catch (e: any) {
    console.error("Failed to fetch admin dashboard data from Supabase/MongoDB:", e);
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
      counts: { totalUsers: 0, totalMovies: 0, totalReviews: 0, totalVisitors: 0, moviesCount: 0, seriesCount: 0, posterlessCount: 0 },
      recentActivity: [],
      monthlySignups: fallbackMonths,
      dailyVisitors: fallbackDays,
      currentUser: null,
    };
  }
}
