"use client";

import { useEffect, useState } from 'react';
import { Users, Film, Star, Activity, Loader2, Globe, Tv, Play, Clock, Sparkles, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getAdminDashboardData, type AdminDashboardDataOutput } from '@/ai/flows/admin-data-flow';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardDataOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!dashboardData) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const data = await getAdminDashboardData();
        setDashboardData(data);
      } catch (e: any) {
        console.error("Failed to fetch admin dashboard data:", e);
        setError(e.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
    const intervalId = setInterval(fetchData, 10000); 
    return () => clearInterval(intervalId);
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Loading dashboard telemetry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-[#EF4444]/10 border-[#EF4444]/20 text-white rounded-2xl mt-6">
        <AlertTitle className="font-headline font-bold text-sm tracking-wider uppercase">Telemetry Fetch Error</AlertTitle>
        <AlertDescription className="text-xs text-[#A1A1A1] mt-1">{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert className="bg-white/5 border-white/10 text-white rounded-2xl mt-6">
        <AlertTitle className="font-headline font-bold text-sm tracking-wider uppercase">No Data Available</AlertTitle>
        <AlertDescription className="text-xs text-[#A1A1A1] mt-1">No dashboard metrics are currently accessible.</AlertDescription>
      </Alert>
    );
  }

  const { counts, recentActivity, monthlySignups, dailyVisitors } = dashboardData;
  const posterlessCount = counts.posterlessCount ?? 0;
  const currentUser = dashboardData.currentUser;

  const getGreetingText = (role: string, name: string) => {
    switch (role) {
      case 'Commander':
        return `Welcome, Commander ${name}`;
      case 'Admin':
        return `Welcome, Administrator ${name}`;
      case 'Content Manager':
        return `Welcome, Content Manager ${name}`;
      case 'Contributor':
        return `Welcome, Contributor ${name}`;
      default:
        return `Welcome, ${name}`;
    }
  };

  const getGreetingDescription = (role: string) => {
    switch (role) {
      case 'Commander':
        return "Supreme system authority active. Access secure logs, manage role matrices, modify core settings, and control global system operations.";
      case 'Admin':
        return "Operational management active. Manage contents, moderate system metadata, check analytics telemetry, and oversee subordinates.";
      case 'Content Manager':
        return "Content operations active. Upload trailers, edit metadata, curate playlists, and manage media catalog inventory.";
      case 'Contributor':
        return "Contributor dashboard active. Suggest catalog edits, submit content drafts, and review workspace stats.";
      default:
        return "Access secure telemetry data, modify catalogue offerings, moderate platform commentary, and control global system variables.";
    }
  };

  const userGreetingName = currentUser?.name || "Admin User";
  const userRole = currentUser?.role || "Admin";

  const cards = [
    {
      title: "Total Contents",
      value: counts.totalMovies.toLocaleString(),
      subtext: "Movies & Series cataloged",
      icon: Film,
      glow: "hover:shadow-[0_12px_40px_rgba(0,209,178,0.2)] hover:border-[#00D1B2]/30",
      color: "text-[#00D1B2]",
      bgGlow: "from-[#00D1B2]/10 to-transparent"
    },
    {
      title: "Movies",
      value: (counts.moviesCount ?? counts.totalMovies).toLocaleString(),
      subtext: "Feature films cataloged",
      icon: Play,
      glow: "hover:shadow-[0_12px_40px_rgba(255,90,95,0.2)] hover:border-[#FF5A5F]/30",
      color: "text-[#FF5A5F]",
      bgGlow: "from-[#FF5A5F]/10 to-transparent"
    },
    {
      title: "Series",
      value: (counts.seriesCount ?? 0).toLocaleString(),
      subtext: "Television series cataloged",
      icon: Tv,
      glow: "hover:shadow-[0_12px_40px_rgba(139,0,0,0.3)] hover:border-[#8B0000]/30",
      color: "text-[#FF5A5F]",
      bgGlow: "from-[#8B0000]/15 to-transparent"
    },
    {
      title: "Registered Users",
      value: counts.totalUsers.toLocaleString(),
      subtext: "Registered user accounts",
      icon: Users,
      glow: "hover:shadow-[0_12px_40px_rgba(0,209,178,0.2)] hover:border-[#00D1B2]/30",
      color: "text-[#00D1B2]",
      bgGlow: "from-[#00D1B2]/10 to-transparent"
    },
    {
      title: "Unique Visitors",
      value: counts.totalVisitors.toLocaleString(),
      subtext: "Recorded user sessions",
      icon: Globe,
      glow: "hover:shadow-[0_12px_40px_rgba(255,90,95,0.2)] hover:border-[#FF5A5F]/30",
      color: "text-[#FF5A5F]",
      bgGlow: "from-[#FF5A5F]/10 to-transparent"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Top Gradient Banner */}
      <div className="relative w-full h-[240px] rounded-[36px] overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.6)] flex items-center px-8 md:px-12 bg-gradient-to-br from-[#00D1B2]/60 via-[#FF5A5F]/60 to-[#8B0000]/50 border border-white/10">
        {/* Dynamic Glowing Mesh Elements */}
        <div className="absolute inset-0 bg-[#050505]/20 backdrop-blur-[24px]" />
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-[#00D1B2]/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-12 right-12 w-64 h-64 bg-[#FF5A5F]/20 rounded-full blur-[80px]" />
        
        {/* Banner Content */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-white/85 text-xs font-bold tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1 rounded-full w-max backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5A5F] animate-pulse" />
            <span>Admin Control Panel Active</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black font-headline tracking-wider text-white uppercase drop-shadow-md">
            {getGreetingText(userRole, userGreetingName)}
          </h1>
          <p className="text-xs md:text-sm text-white/70 max-w-xl font-medium tracking-wide">
            {getGreetingDescription(userRole)}
          </p>
        </div>
      </div>

      {/* Posterless Alert */}
      {posterlessCount > 0 && (
        <Alert variant="destructive" className="bg-[#EF4444]/10 border-[#EF4444]/20 text-white rounded-[24px] p-5 shadow-lg backdrop-blur-md animate-fade-in flex gap-3.5 items-start">
          <ShieldAlert className="h-5 w-5 text-[#EF4444] mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <AlertTitle className="font-headline font-bold text-xs tracking-wider uppercase text-white">Missing Poster Artwork</AlertTitle>
            <AlertDescription className="text-[11px] text-[#A1A1A1] leading-relaxed">
              There are currently <strong className="text-white">{posterlessCount}</strong> contents in the system missing poster artwork. Please navigate to the <a href="/admin/movies" className="text-[#FF5A5F] hover:underline font-bold">Contents Page</a> to update them.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* 5 Horizontal Responsive Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`relative bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-7 flex flex-col justify-between transition-all duration-500 ease-out transform hover:-translate-y-1 select-none shadow-[0_10px_40px_rgba(0,0,0,0.45)] group ${card.glow}`}
            >
              {/* Inner ambient glow */}
              <div className={`absolute inset-0 bg-gradient-to-b ${card.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[28px] pointer-events-none`} />
              
              <div className="flex items-center justify-between relative z-10 pb-4">
                <span className="text-[10px] font-bold text-[#A1A1A1] uppercase tracking-wider">{card.title}</span>
                <div className={`p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 ${card.color} shadow-inner`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="relative z-10 space-y-1">
                <div className="text-3xl font-extrabold text-white tracking-tight">{card.value}</div>
                <p className="text-[10px] text-[#666666] font-medium tracking-wide">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Charts section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly signups */}
        <div className="bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)] hover:border-white/10 transition-all duration-500">
          <div className="pb-6">
            <h3 className="text-sm font-bold tracking-widest text-white uppercase font-headline">Monthly User Signups</h3>
            <p className="text-[10px] text-[#A1A1A1] font-medium mt-1">Platform user registrations over the last 12 months.</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySignups} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#666666" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#666666" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(13, 13, 13, 0.95)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '16px',
                    backdropFilter: 'blur(16px)',
                    fontSize: '11px'
                  }}
                  itemStyle={{ color: '#FFFFFF' }}
                  labelStyle={{ color: '#A1A1A1', fontWeight: 'bold' }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="users" fill="#FF5A5F" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily visitors */}
        <div className="bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)] hover:border-white/10 transition-all duration-500">
          <div className="pb-6">
            <h3 className="text-sm font-bold tracking-widest text-white uppercase font-headline">Daily Visitors</h3>
            <p className="text-[10px] text-[#A1A1A1] font-medium mt-1">Unique active anonymous visitor telemetry (30 days).</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyVisitors} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D1B2" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#00D1B2" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#666666" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#666666" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(13, 13, 13, 0.95)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '16px',
                    backdropFilter: 'blur(16px)',
                    fontSize: '11px'
                  }}
                  itemStyle={{ color: '#00D1B2' }}
                  labelStyle={{ color: '#A1A1A1', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="visitors" stroke="#00D1B2" strokeWidth={2} fillOpacity={1} fill="url(#visitorGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity & System Counts */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity List */}
        <div className="md:col-span-2 bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)] hover:border-white/10 transition-all duration-500">
          <div className="flex items-center gap-2 pb-6">
            <Activity className="h-5 w-5 text-[#FF5A5F]" />
            <div>
              <h3 className="text-sm font-bold tracking-widest text-white uppercase font-headline">Recent Activity Stream</h3>
              <p className="text-[10px] text-[#A1A1A1] font-medium">Real-time logs of occurrences across node connections.</p>
            </div>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              <ul className="space-y-3.5">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="flex items-start gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all duration-300">
                    <div className="flex-shrink-0 mt-0.5">
                      {activity.type === 'New User' && (
                        <div className="w-8 h-8 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E]">
                          <Users className="h-4 w-4" />
                        </div>
                      )}
                      {activity.type === 'New Movie' && (
                        <div className="w-8 h-8 rounded-xl bg-[#00D1B2]/15 border border-[#00D1B2]/20 flex items-center justify-center text-[#00D1B2]">
                          <Film className="h-4 w-4" />
                        </div>
                      )}
                      {activity.type === 'New Review' && (
                        <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
                          <Star className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-semibold text-white tracking-wide truncate">{activity.description}</p>
                      <p className="text-[10px] text-[#666666] font-mono mt-0.5">{activity.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center text-[#666666] text-xs font-medium">
                No active session activities recorded.
              </div>
            )}
          </div>
        </div>

        {/* Platform Core Accounts */}
        <div className="bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)] hover:border-white/10 transition-all duration-500 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-widest text-white uppercase font-headline pb-6">Core Account Telemetry</h3>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#FF5A5F]/15 border border-[#FF5A5F]/20 text-[#FF5A5F]">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#A1A1A1] tracking-wide">Registered Accounts</span>
                </div>
                <span className="text-sm font-bold text-white font-mono">{counts.totalUsers.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#00D1B2]/15 border border-[#00D1B2]/20 text-[#00D1B2]">
                    <Star className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#A1A1A1] tracking-wide">Moderated Reviews</span>
                </div>
                <span className="text-sm font-bold text-white font-mono">{counts.totalReviews.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#8B0000]/15 border border-[#8B0000]/20 text-[#FF5A5F]">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-[#A1A1A1] tracking-wide">Unique Stream IP IPs</span>
                </div>
                <span className="text-sm font-bold text-white font-mono">{counts.totalVisitors.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 mt-6 text-[10px] text-[#666666] font-mono tracking-wider text-center">
            System status: <span className="text-[#22C55E] font-bold">ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
