"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { getAuditLogs } from '@/ai/flows/audit-log-flow';
import { Button } from '@/components/ui/button';
import { Loader2, Terminal, RefreshCw, Search, ShieldAlert, AlertTriangle, Info, Calendar, Clock, User, Filter, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  details: string;
  category: 'security' | 'content' | 'streaming' | 'system' | 'general';
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

export default function AuditLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getAuditLogs();
      setLogs(data as AuditLog[]);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to fetch system logs.");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: e.message || "Failed to sync platform logs."
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filtering Logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  // Severity indicator styles
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]',
          dot: 'bg-[#EF4444] shadow-[0_0_12px_#EF4444]',
          icon: ShieldAlert
        };
      case 'warning':
        return {
          bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]',
          dot: 'bg-[#F59E0B] shadow-[0_0_12px_#F59E0B]',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'bg-[#00D1B2]/10 border-[#00D1B2]/20 text-[#00D1B2]',
          dot: 'bg-[#00D1B2] shadow-[0_0_12px_#00D1B2]',
          icon: Info
        };
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return 'border-red-500/30 text-red-400 bg-red-950/20';
      case 'content': return 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20';
      case 'streaming': return 'border-blue-500/30 text-blue-400 bg-blue-950/20';
      case 'system': return 'border-purple-500/30 text-purple-400 bg-purple-950/20';
      default: return 'border-gray-500/30 text-gray-400 bg-gray-950/20';
    }
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Retrieving audit timeline...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#EF4444]/15 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444] shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider font-headline">Access Restriction</h2>
          <p className="text-xs text-[#A1A1A1] leading-relaxed">
            {errorMsg}. Only the Supreme Commander is permitted to view the platform operation logs.
          </p>
        </div>
        <Button onClick={fetchLogs} className="bg-white/5 border border-white/10 text-white text-xs font-bold uppercase tracking-wider h-10 px-5 rounded-xl hover:bg-white/10">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
            <Terminal className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Platform Audit Logs
          </h1>
          <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
            Real-time security auditing, content moderation logs, and infrastructure events timeline.
          </p>
        </div>

        <Button onClick={fetchLogs} variant="outline" className="bg-white/5 border-white/10 text-white rounded-xl h-11 text-xs font-bold uppercase tracking-wider hover:bg-white/10">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Timeline
        </Button>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[24px] p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <input 
              type="text" 
              placeholder="Search by action, details, email, or operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/8 rounded-xl h-11 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#FF5A5F]/40 placeholder:text-[#666666] transition-colors"
            />
          </div>

          {/* Filters toggle description */}
          <div className="flex items-center gap-2 text-[#666666] text-[10px] uppercase font-bold tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Search Filters</span>
          </div>
        </div>

        {/* Filters Select Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/5">
          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-[#666666] uppercase tracking-wider">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/8 rounded-xl h-9 px-3 text-[10px] text-white focus:outline-none focus:border-[#FF5A5F]/40 cursor-pointer uppercase font-bold tracking-wider appearance-none"
            >
              <option value="all" className="bg-[#0D0D0D]">All Categories</option>
              <option value="security" className="bg-[#0D0D0D]">Security</option>
              <option value="content" className="bg-[#0D0D0D]">Content</option>
              <option value="streaming" className="bg-[#0D0D0D]">Streaming</option>
              <option value="system" className="bg-[#0D0D0D]">System</option>
              <option value="general" className="bg-[#0D0D0D]">General</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-[#666666] uppercase tracking-wider">Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/8 rounded-xl h-9 px-3 text-[10px] text-white focus:outline-none focus:border-[#FF5A5F]/40 cursor-pointer uppercase font-bold tracking-wider appearance-none"
            >
              <option value="all" className="bg-[#0D0D0D]">All Severities</option>
              <option value="info" className="bg-[#0D0D0D]">Info (Green)</option>
              <option value="warning" className="bg-[#0D0D0D]">Warning (Amber)</option>
              <option value="critical" className="bg-[#0D0D0D]">Critical (Red)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Timeline */}
      {filteredLogs.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 border-l border-white/5 space-y-6 max-w-4xl mx-auto">
          {filteredLogs.map((log) => {
            const date = new Date(log.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const severity = getSeverityStyles(log.severity);
            const SeverityIcon = severity.icon;

            return (
              <div key={log.id} className="relative group">
                {/* Timeline Connector Node */}
                <div className={cn(
                  "absolute -left-[31px] sm:-left-[39px] top-4 w-4 h-4 rounded-full border border-[#050505] flex items-center justify-center transition-all duration-300 group-hover:scale-125 z-20",
                  severity.dot
                )} />

                {/* Audit Card */}
                <div className="bg-[#0D0D0D]/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 hover:bg-white/[0.01] shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5 mb-3">
                    
                    {/* Left: Action & Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                        {log.action}
                      </span>
                      
                      <Badge className={cn("text-[7.5px] font-extrabold uppercase px-2 py-0.5 border tracking-widest", SeverityIcon === ShieldAlert ? "bg-[#EF4444]/10 text-[#EF4444]" : SeverityIcon === AlertTriangle ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-[#00D1B2]/10 text-[#00D1B2]")}>
                        <SeverityIcon className="w-2.5 h-2.5 mr-1 inline" />
                        {log.severity}
                      </Badge>

                      <Badge className={cn("text-[7.5px] font-extrabold uppercase px-2 py-0.5 border tracking-widest", getCategoryColor(log.category))}>
                        {log.category}
                      </Badge>
                    </div>

                    {/* Right: Timestamp */}
                    <div className="flex items-center gap-2.5 text-[9px] text-[#666666] font-mono">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formattedTime}</span>
                      </div>
                    </div>

                  </div>

                  {/* Log description */}
                  <p className="text-xs text-[#D1D1D1] leading-relaxed mb-4">
                    {log.details}
                  </p>

                  {/* Operator Metadata */}
                  <div className="flex items-center gap-4 text-[9px] text-[#A1A1A1] font-mono bg-white/[0.01] border border-white/5 px-3 py-2 rounded-xl w-max max-w-full">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-[#FF5A5F]" />
                      <span className="font-semibold text-white">{log.adminName}</span>
                    </div>
                    <span className="text-white/10">|</span>
                    <span className="truncate">{log.adminEmail}</span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0D0D0D]/40 border border-white/5 rounded-3xl p-12 text-center max-w-lg mx-auto flex flex-col items-center justify-center space-y-3">
          <Terminal className="w-12 h-12 text-[#666666] stroke-1" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">No Activity Logged</h3>
          <p className="text-[10px] text-[#A1A1A1] leading-relaxed">
            There are no logs matching your criteria. Try adjusting the search filters or refreshing the feed.
          </p>
        </div>
      )}

    </div>
  );
}
