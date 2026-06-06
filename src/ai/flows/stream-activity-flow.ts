'use server';

import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { headers } from 'next/headers';

import { verifyAuth, requirePermission } from '@/lib/auth';

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
    console.error("Failed to parse headers for stream IP:", e);
    return '127.0.0.1';
  }
}

const LogStreamActivityInputSchema = z.object({
  movieId: z.string(),
  movieTitle: z.string(),
  movieType: z.enum(['movie', 'series']),
  action: z.enum(['play', 'buffer', 'fail', 'heartbeat']),
  device: z.enum(['desktop', 'mobile', 'tablet']),
  visitorId: z.string(),
  userId: z.string().nullable().optional(),
});

export async function logStreamActivity(input: z.infer<typeof LogStreamActivityInputSchema>) {
  try {
    const { db } = await connectToDatabase();
    const streamCollection = db.collection('stream_activities');
    const ip = await getClientIp();

    await streamCollection.insertOne({
      ...input,
      ip,
      timestamp: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to log stream activity:', error);
    return { success: false };
  }
}

export async function getStreamAnalytics() {
  try {
    // Assert view_analytics permission (Bypassed for Commander, checks permissions mapping for others)
    await requirePermission('view_analytics');
    const { db } = await connectToDatabase();
    const streamCollection = db.collection('stream_activities');
    const usersCollection = db.collection('users');

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Active Viewers (unique visitors or users active in the last 5 minutes)
    const activeStreamVisitors = await streamCollection.distinct('visitorId', {
      timestamp: { $gte: fiveMinutesAgo }
    });
    const activeUsersList = await usersCollection.distinct('_id', {
      lastSeen: { $gte: fiveMinutesAgo }
    });
    
    const activeViewersCount = Math.max(
      activeStreamVisitors.length,
      activeUsersList.length,
      0
    );

    // 2. Concurrent Streams (unique movies with activity in the last 1 minute)
    const concurrentStreamsCount = (await streamCollection.distinct('movieId', {
      timestamp: { $gte: oneMinuteAgo },
      action: { $in: ['play', 'heartbeat'] }
    })).length;

    // 3. Most Watched Content (top movie by pings/plays in the last 7 days)
    const mostWatchedAgg = await streamCollection.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo }, action: { $in: ['play', 'heartbeat'] } } },
      { $group: { _id: '$movieId', title: { $first: '$movieTitle' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]).toArray();

    const mostWatchedTitle = mostWatchedAgg.length > 0 ? mostWatchedAgg[0].title : "None";
    const mostWatchedPlays = mostWatchedAgg.length > 0 ? mostWatchedAgg[0].count : 0;

    // 4. Peak Traffic (max requests/pings in any 1-hour interval in the last 24h)
    const peakTrafficAgg = await streamCollection.aggregate([
      { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            hour: { $hour: "$timestamp" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]).toArray();
    const peakReqsPerSecond = peakTrafficAgg.length > 0 
      ? parseFloat((peakTrafficAgg[0].count / 3600).toFixed(2)) 
      : 0;

    // 5. Daily Watch Time (sum of all pings * 10 seconds in last 24 hours)
    const dailyHeartbeats = await streamCollection.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo },
      action: 'heartbeat'
    });
    const dailyWatchTimeHours = parseFloat(((dailyHeartbeats * 10) / 3600).toFixed(2));

    // 6. Buffering Rate
    const bufferCount = await streamCollection.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo },
      action: 'buffer'
    });
    const totalPlayActions = await streamCollection.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo },
      action: { $in: ['play', 'heartbeat', 'buffer'] }
    });
    const bufferingRatePercent = totalPlayActions > 0 
      ? parseFloat(((bufferCount / totalPlayActions) * 100).toFixed(2)) 
      : 0;

    // 7. Failed Streams
    const failedStreamsCount = await streamCollection.countDocuments({
      timestamp: { $gte: twentyFourHoursAgo },
      action: 'fail'
    });

    // 8. Device Distribution
    const deviceAgg = await streamCollection.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$device', count: { $sum: 1 } } }
    ]).toArray();

    const totalDeviceLogs = deviceAgg.reduce((acc, curr) => acc + curr.count, 0);
    const devicePercentages = { mobile: 0, desktop: 0, tablet: 0 };
    if (totalDeviceLogs > 0) {
      deviceAgg.forEach(d => {
        const dev = d._id as 'mobile' | 'desktop' | 'tablet';
        if (dev in devicePercentages) {
          devicePercentages[dev] = Math.round((d.count / totalDeviceLogs) * 100);
        }
      });
    }

    // 9. Viewer Activity Curve (by hour for the last 24 hours)
    const hourlyActivityData: { time: string, users: number }[] = [];
    const hourlyAgg = await streamCollection.aggregate([
      { $match: { timestamp: { $gte: twentyFourHoursAgo } } },
      {
        $group: {
          _id: { hour: { $hour: '$timestamp' } },
          users: { $addToSet: '$visitorId' }
        }
      },
      { $project: { hour: '$_id.hour', count: { $size: '$users' } } },
      { $sort: { hour: 1 } }
    ]).toArray();

    // Initialize 24 hours with 0
    const hourMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, 0);
    }
    hourlyAgg.forEach(h => {
      hourMap.set(h.hour, h.count);
    });

    const currentHour = now.getHours();
    for (let i = 23; i >= 0; i--) {
      const targetHour = (currentHour - i + 24) % 24;
      const displayTime = `${targetHour.toString().padStart(2, '0')}:00`;
      hourlyActivityData.push({
        time: displayTime,
        users: hourMap.get(targetHour) || 0
      });
    }

    // 10. Weekly watch time accumulation (last 7 days)
    const weeklyWatchTimeData: { day: string, hours: number }[] = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyWatchAgg = await streamCollection.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo },
          action: 'heartbeat'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          pings: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]).toArray();

    const dailyWatchMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      dailyWatchMap.set(dateStr, 0);
    }

    dailyWatchAgg.forEach(dw => {
      const dateStr = `${dw._id.year}-${dw._id.month}-${dw._id.day}`;
      if (dailyWatchMap.has(dateStr)) {
        dailyWatchMap.set(dateStr, parseFloat(((dw.pings * 10) / 3600).toFixed(2)));
      }
    });

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const dayName = daysOfWeek[d.getDay()];
      weeklyWatchTimeData.push({
        day: dayName,
        hours: dailyWatchMap.get(dateStr) || 0
      });
    }

    // 11. Recent Active IP Addresses (last 10 unique active IPs)
    const recentIpsAgg = await streamCollection.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$ip',
          lastActive: { $first: '$timestamp' },
          userId: { $first: '$userId' },
          visitorId: { $first: '$visitorId' },
          device: { $first: '$device' },
          movieTitle: { $first: '$movieTitle' },
          action: { $first: '$action' },
          requestCount: { $sum: 1 }
        }
      },
      { $sort: { lastActive: -1 } },
      { $limit: 10 }
    ]).toArray();

    const recentIps = recentIpsAgg.map(item => ({
      ip: item._id || '127.0.0.1',
      lastActive: item.lastActive.toISOString(),
      userId: item.userId || null,
      visitorId: item.visitorId || 'anonymous',
      device: item.device || 'desktop',
      lastAction: `${item.action} (${item.movieTitle})`,
      requestCount: item.requestCount
    }));

    return {
      activeViewers: activeViewersCount,
      concurrentStreams: concurrentStreamsCount,
      mostWatchedTitle,
      mostWatchedPlays,
      peakTraffic: peakReqsPerSecond,
      dailyWatchTime: dailyWatchTimeHours,
      bufferingRate: bufferingRatePercent,
      failedStreams: failedStreamsCount,
      deviceDistribution: devicePercentages,
      viewerActivityCurve: hourlyActivityData,
      weeklyWatchTime: weeklyWatchTimeData,
      recentIps
    };
  } catch (error) {
    console.error('Failed to aggregate stream analytics:', error);
    return {
      activeViewers: 0,
      concurrentStreams: 0,
      mostWatchedTitle: 'None',
      mostWatchedPlays: 0,
      peakTraffic: 0,
      dailyWatchTime: 0,
      bufferingRate: 0,
      failedStreams: 0,
      deviceDistribution: { mobile: 0, desktop: 0, tablet: 0 },
      viewerActivityCurve: Array.from({ length: 7 }, (_, i) => ({ time: `${(i*4).toString().padStart(2,'0')}:00`, users: 0 })),
      weeklyWatchTime: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, hours: 0 })),
      recentIps: []
    };
  }
}
