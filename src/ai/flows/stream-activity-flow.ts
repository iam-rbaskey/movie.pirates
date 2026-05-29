'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

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
    const ip = await getClientIp();

    const { error } = await supabaseAdmin
      .from('stream_activities')
      .insert({
        id: crypto.randomBytes(12).toString('hex'),
        movie_id: input.movieId,
        movie_title: input.movieTitle,
        movie_type: input.movieType,
        action: input.action,
        device: input.device,
        visitor_id: input.visitorId,
        user_id: input.userId || null,
        ip,
        timestamp: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to log stream activity:', error);
    return { success: false };
  }
}

export async function getStreamAnalytics() {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Active Viewers (unique visitors or users active in the last 5 minutes)
    const { data: visitors } = await supabaseAdmin
      .from('stream_activities')
      .select('visitor_id')
      .gte('timestamp', fiveMinutesAgo.toISOString());
    const activeStreamVisitors = Array.from(new Set((visitors || []).map(v => v.visitor_id)));

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .gte('last_seen', fiveMinutesAgo.toISOString());
    const activeUsersList = (users || []).map(u => u.id);
    
    const activeViewersCount = Math.max(
      activeStreamVisitors.length,
      activeUsersList.length,
      0
    );

    // 2. Concurrent Streams (unique movies with activity in the last 1 minute)
    const { data: streams } = await supabaseAdmin
      .from('stream_activities')
      .select('movie_id')
      .gte('timestamp', oneMinuteAgo.toISOString())
      .in('action', ['play', 'heartbeat']);
    const concurrentStreamsCount = new Set((streams || []).map(s => s.movie_id).filter(Boolean)).size;

    // 3. Most Watched Content (top movie by pings/plays in the last 7 days)
    const { data: recentPlays } = await supabaseAdmin
      .from('stream_activities')
      .select('movie_id, movie_title')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .in('action', ['play', 'heartbeat']);

    const moviePlayCounts = new Map<string, { title: string, count: number }>();
    (recentPlays || []).forEach(rp => {
      if (!rp.movie_id) return;
      const current = moviePlayCounts.get(rp.movie_id) || { title: rp.movie_title || 'Unknown', count: 0 };
      current.count++;
      moviePlayCounts.set(rp.movie_id, current);
    });
    let mostWatchedTitle = 'None';
    let mostWatchedPlays = 0;
    moviePlayCounts.forEach((val) => {
      if (val.count > mostWatchedPlays) {
        mostWatchedPlays = val.count;
        mostWatchedTitle = val.title;
      }
    });

    // 4. Peak Traffic (max requests/pings in any 1-hour interval in the last 24h)
    const { data: last24hPings } = await supabaseAdmin
      .from('stream_activities')
      .select('timestamp')
      .gte('timestamp', twentyFourHoursAgo.toISOString());

    const hourlyCounts = new Map<number, number>();
    (last24hPings || []).forEach(p => {
      const hour = new Date(p.timestamp).getHours();
      hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
    });
    let maxCount = 0;
    hourlyCounts.forEach(c => {
      if (c > maxCount) maxCount = c;
    });
    const peakReqsPerSecond = parseFloat((maxCount / 3600).toFixed(2));

    // 5. Daily Watch Time (sum of all pings * 10 seconds in last 24 hours)
    const { count: dailyHeartbeats } = await supabaseAdmin
      .from('stream_activities')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', twentyFourHoursAgo.toISOString())
      .eq('action', 'heartbeat');
    const dailyWatchTimeHours = parseFloat((((dailyHeartbeats || 0) * 10) / 3600).toFixed(2));

    // 6. Buffering Rate
    const { count: bufferCount } = await supabaseAdmin
      .from('stream_activities')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', twentyFourHoursAgo.toISOString())
      .eq('action', 'buffer');

    const { count: totalPlayActions } = await supabaseAdmin
      .from('stream_activities')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', twentyFourHoursAgo.toISOString())
      .in('action', ['play', 'heartbeat', 'buffer']);

    const bufferingRatePercent = (totalPlayActions || 0) > 0 
      ? parseFloat((((bufferCount || 0) / (totalPlayActions || 0)) * 100).toFixed(2)) 
      : 0;

    // 7. Failed Streams
    const { count: failedStreamsCount } = await supabaseAdmin
      .from('stream_activities')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', twentyFourHoursAgo.toISOString())
      .eq('action', 'fail');

    // 8. Device Distribution
    const { data: deviceLogs } = await supabaseAdmin
      .from('stream_activities')
      .select('device')
      .gte('timestamp', sevenDaysAgo.toISOString());

    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
    (deviceLogs || []).forEach(d => {
      const dev = d.device as 'mobile' | 'desktop' | 'tablet';
      if (dev in deviceCounts) {
        deviceCounts[dev]++;
      }
    });
    const totalDeviceLogs = (deviceLogs || []).length;
    const devicePercentages = { mobile: 0, desktop: 0, tablet: 0 };
    if (totalDeviceLogs > 0) {
      devicePercentages.mobile = Math.round((deviceCounts.mobile / totalDeviceLogs) * 100);
      devicePercentages.desktop = Math.round((deviceCounts.desktop / totalDeviceLogs) * 100);
      devicePercentages.tablet = Math.round((deviceCounts.tablet / totalDeviceLogs) * 100);
    }

    // 9. Viewer Activity Curve (by hour for the last 24 hours)
    const { data: activeHourlyLogs } = await supabaseAdmin
      .from('stream_activities')
      .select('timestamp, visitor_id')
      .gte('timestamp', twentyFourHoursAgo.toISOString());

    const hourlyVisitorMap = new Map<number, Set<string>>();
    for (let i = 0; i < 24; i++) {
      hourlyVisitorMap.set(i, new Set());
    }
    (activeHourlyLogs || []).forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourlyVisitorMap.get(hour)?.add(log.visitor_id);
    });

    const hourlyActivityData: { time: string, users: number }[] = [];
    const currentHour = now.getHours();
    for (let i = 23; i >= 0; i--) {
      const targetHour = (currentHour - i + 24) % 24;
      const displayTime = `${targetHour.toString().padStart(2, '0')}:00`;
      hourlyActivityData.push({
        time: displayTime,
        users: hourlyVisitorMap.get(targetHour)?.size || 0
      });
    }

    // 10. Weekly watch time accumulation (last 7 days)
    const { data: weeklyLogs } = await supabaseAdmin
      .from('stream_activities')
      .select('timestamp')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .eq('action', 'heartbeat');

    const dailyWatchMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      dailyWatchMap.set(dateStr, 0);
    }
    (weeklyLogs || []).forEach(log => {
      const date = new Date(log.timestamp);
      const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (dailyWatchMap.has(dateStr)) {
        dailyWatchMap.set(dateStr, (dailyWatchMap.get(dateStr) || 0) + 1);
      }
    });

    const weeklyWatchTimeData: { day: string, hours: number }[] = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const dayName = daysOfWeek[d.getDay()];
      const pings = dailyWatchMap.get(dateStr) || 0;
      weeklyWatchTimeData.push({
        day: dayName,
        hours: parseFloat(((pings * 10) / 3600).toFixed(2))
      });
    }

    // 11. Recent Active IP Addresses (last 10 unique active IPs)
    const { data: recentLogs, error: recentError } = await supabaseAdmin
      .from('stream_activities')
      .select('*')
      .order('timestamp', { ascending: false });

    if (recentError) throw recentError;

    const recentIpsMap = new Map<string, any>();
    (recentLogs || []).forEach(log => {
      const ip = log.ip || '127.0.0.1';
      if (!recentIpsMap.has(ip)) {
        recentIpsMap.set(ip, {
          ip,
          lastActive: new Date(log.timestamp).toISOString(),
          userId: log.user_id || null,
          visitorId: log.visitor_id || 'anonymous',
          device: log.device || 'desktop',
          lastAction: `${log.action} (${log.movie_title || 'Unknown'})`,
          requestCount: 0
        });
      }
      recentIpsMap.get(ip).requestCount++;
    });

    const recentIps = Array.from(recentIpsMap.values()).slice(0, 10);

    return {
      activeViewers: activeViewersCount,
      concurrentStreams: concurrentStreamsCount,
      mostWatchedTitle,
      mostWatchedPlays,
      peakTraffic: peakReqsPerSecond,
      dailyWatchTime: dailyWatchTimeHours,
      bufferingRate: bufferingRatePercent,
      failedStreams: failedStreamsCount || 0,
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
