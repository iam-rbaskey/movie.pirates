"use client";

import React, { useEffect, useState } from 'react';
import { getAdminDashboardData, type AdminDashboardDataOutput } from '@/ai/flows/admin-data-flow';
import { getStreamAnalytics } from '@/ai/flows/stream-activity-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Loader2, PlayCircle, Activity, Tv, Monitor, Cpu, Sparkles, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export default function AnalyticsPage() {
  const [data, setData] = useState<AdminDashboardDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [streamData, setStreamData] = useState<{
    activeViewers: number;
    concurrentStreams: number;
    mostWatchedTitle: string;
    mostWatchedPlays: number;
    peakTraffic: number;
    dailyWatchTime: number;
    bufferingRate: number;
    failedStreams: number;
    deviceDistribution: { mobile: number; desktop: number; tablet: number };
    viewerActivityCurve: { time: string; users: number }[];
    weeklyWatchTime: { day: string; hours: number }[];
    recentIps: {
      ip: string;
      lastActive: string;
      userId: string | null;
      visitorId: string;
      device: string;
      lastAction: string;
      requestCount: number;
    }[];
  } | null>(null);

  const fetchBaseData = async () => {
    try {
      const res = await getAdminDashboardData();
      setData(res);
      
      const sRes = await getStreamAnalytics();
      setStreamData(sRes);
    } catch (e) {
      console.error("Failed to fetch base analytics telemetry:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
    const fetchInterval = setInterval(fetchBaseData, 10000); // refresh every 10 seconds
    return () => clearInterval(fetchInterval);
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Establishing stream telemetry socket...</p>
        </div>
      </div>
    );
  }

  const counts = data?.counts || { totalUsers: 0, totalMovies: 0, totalReviews: 0, totalVisitors: 0 };

  // 8 Metric Cards based on real visitor metrics
  const metricCards = [
    { title: "Active Viewers", value: (streamData?.activeViewers ?? 0).toLocaleString(), sub: "Active user heartbeats (5m)", color: "text-[#00D1B2]", icon: Activity },
    { title: "Concurrent Streams", value: (streamData?.concurrentStreams ?? 0).toLocaleString(), sub: "Live media player tracks", color: "text-[#FF5A5F]", icon: PlayCircle },
    { title: "Most Watched Content", value: streamData?.mostWatchedTitle || "None", sub: `${streamData?.mostWatchedPlays ?? 0} plays logged`, color: "text-[#FF5A5F]", icon: Tv },
    { title: "Peak Traffic", value: `${streamData?.peakTraffic ?? 0} req/s`, sub: "Max req rate in last 24h", color: "text-[#00D1B2]", icon: Cpu },
    { title: "Daily Watch Time", value: `${streamData?.dailyWatchTime ?? 0} hrs`, sub: "Sum of all active streams", color: "text-[#00D1B2]", icon: PlayCircle },
    { title: "Buffering Rate", value: `${streamData?.bufferingRate ?? 0}%`, sub: "Buffering latency tracking", color: "text-[#22C55E]", icon: ShieldCheck },
    { title: "Failed Streams", value: (streamData?.failedStreams ?? 0).toLocaleString(), sub: "Failure logs (last 24h)", color: "text-[#22C55E]", icon: ShieldCheck },
    { title: "Device Distribution", value: `Desktop (${streamData?.deviceDistribution?.desktop ?? 0}%)`, sub: `Mobile: ${streamData?.deviceDistribution?.mobile ?? 0}% | Tablet: ${streamData?.deviceDistribution?.tablet ?? 0}%`, color: "text-[#FF5A5F]", icon: Monitor }
  ];

  // Chart data sets
  const viewerActivityData = streamData?.viewerActivityCurve || [];
  const watchTimeData = streamData?.weeklyWatchTime || [];
  const deviceData = [
    { name: 'Mobile', value: streamData?.deviceDistribution?.mobile ?? 0, color: '#FF5A5F' },
    { name: 'Desktop', value: streamData?.deviceDistribution?.desktop ?? 0, color: '#00D1B2' },
    { name: 'Tablet / Smart TV', value: streamData?.deviceDistribution?.tablet ?? 0, color: '#8B0000' }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Real-time Telemetry Onboarding alert */}
      {streamData && streamData.activeViewers === 0 && streamData.dailyWatchTime === 0 && streamData.failedStreams === 0 && (
        <div className="bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 backdrop-blur-[20px] rounded-[24px] p-6 text-white flex items-start gap-4 animate-fade-in">
          <AlertTriangle className="h-6 w-6 text-[#FF5A5F] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold uppercase tracking-wider text-[#FF5A5F] flex items-center gap-1.5">
              <span>Telemetry Collection Active</span>
            </h4>
            <p className="text-xs text-[#A1A1A1] leading-relaxed">
              Movie Pirates real-time analytics are 100% database-driven and do not show simulated mock data. To populate this dashboard, go to the streaming platform and play some movies or series to begin capturing live stream logs (heartbeats, device distribution, buffering rates, and failure telemetry).
            </p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
            <Activity className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Platform Telemetry Analytics
          </h1>
          <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
            Operational dashboard metrics driving live streaming indicators in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 text-white/80 bg-white/5 border border-white/8 px-4 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#FF5A5F] animate-pulse" />
          <span>Sockets Synced</span>
        </div>
      </div>

      {/* 8 Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[20px] rounded-[24px] p-6 shadow-md hover:border-white/10 transition-colors">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[9px] font-bold text-[#A1A1A1] uppercase tracking-wider">{card.title}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-white tracking-tight">{card.value}</h3>
                <p className="text-[9px] text-[#666666] font-medium font-mono uppercase">{card.sub}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Viewer activity area */}
        <div className="md:col-span-2 bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
          <div className="pb-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-headline">Viewer Activity Curve</h3>
            <p className="text-[9px] text-[#A1A1A1] font-medium mt-0.5">Live concurrent user spikes monitored throughout the day cycle.</p>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={viewerActivityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A5F" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#FF5A5F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="time" stroke="#666666" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#666666" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(13, 13, 13, 0.95)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '16px',
                    backdropFilter: 'blur(16px)',
                    fontSize: '10px'
                  }}
                  itemStyle={{ color: '#FF5A5F' }}
                />
                <Area type="monotone" dataKey="users" stroke="#FF5A5F" strokeWidth={2} fillOpacity={1} fill="url(#userGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Distribution Pie */}
        <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg flex flex-col justify-between">
          <div className="pb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-headline">Node Distribution</h3>
            <p className="text-[9px] text-[#A1A1A1] font-medium mt-0.5">Primary viewer hardware configurations.</p>
          </div>
          <div className="h-[180px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(13, 13, 13, 0.95)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '12px',
                    fontSize: '10px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {deviceData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[#A1A1A1]">{d.name}</span>
                </div>
                <span className="text-white">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Watch Time Bar Chart */}
      <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
        <div className="pb-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-headline">Weekly Stream Accumulation</h3>
          <p className="text-[9px] text-[#A1A1A1] font-medium mt-0.5">Aggregated watch times calculated across all active visitors.</p>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={watchTimeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
              <XAxis dataKey="day" stroke="#666666" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis stroke="#666666" fontSize={9} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(13, 13, 13, 0.95)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)', 
                  borderRadius: '16px',
                  fontSize: '10px'
                }}
                itemStyle={{ color: '#00D1B2' }}
              />
              <Bar dataKey="hours" fill="#00D1B2" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active IP Telemetry Table */}
      <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
        <div className="pb-6">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-headline">Active Network Node Telemetry (Client IPs)</h3>
          <p className="text-[9px] text-[#A1A1A1] font-medium mt-0.5">Real-time IP logs and connection telemetry aggregated from active client streams.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-bold text-[#A1A1A1] uppercase tracking-wider">
                <th className="pb-3">IP Address</th>
                <th className="pb-3">Client Type / ID</th>
                <th className="pb-3">Last Active Flow</th>
                <th className="pb-3">Device Node</th>
                <th className="pb-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {streamData && streamData.recentIps && streamData.recentIps.length > 0 ? (
                streamData.recentIps.map((node) => (
                  <tr key={node.ip + node.lastActive} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 font-mono font-bold text-primary">{node.ip}</td>
                    <td className="py-4 text-[#A1A1A1]">
                      {node.userId ? (
                        <span className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          User: {node.userId.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="bg-white/5 border border-white/10 text-white/80 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                          Anon: {node.visitorId.substring(0, 8)}...
                        </span>
                      )}
                    </td>
                    <td className="py-4 font-mono text-[10px]">{node.lastAction}</td>
                    <td className="py-4 uppercase text-[10px] tracking-wider text-[#A1A1A1]">{node.device}</td>
                    <td className="py-4 text-right text-[#666666] font-mono">{new Date(node.lastActive).toLocaleTimeString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No active node telemetry logs recorded. Play media or interact with the platform to capture IP logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
