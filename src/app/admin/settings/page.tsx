"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  ShieldAlert, 
  Database, 
  CloudLightning, 
  Key, 
  Download, 
  RefreshCw, 
  Loader2, 
  Server, 
  MonitorPlay, 
  Paintbrush, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import { getGlobalSettings, saveGlobalSettings, flushPlatformCache, seedMockDatabase } from '@/ai/flows/settings-flow';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { toast } = useToast();
  
  // Operational Parameters
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('https://api.moviepirates.com/v2');
  const [cacheTTL, setCacheTTL] = useState('3600');
  const [jwtSecret, setJwtSecret] = useState('••••••••••••••••••••••••••••••••');

  // Streaming Parameters
  const [streamingResolution, setStreamingResolution] = useState<'4K' | '1080p' | '720p' | 'Auto'>('Auto');
  const [defaultSubtitleLang, setDefaultSubtitleLang] = useState<'English' | 'Spanish' | 'French' | 'None'>('English');

  // Site Branding & SEO Parameters
  const [siteTitle, setSiteTitle] = useState('Movie Pirates');
  const [siteMetaDesc, setSiteMetaDesc] = useState('Discover, rate, and review movies on Movie Pirates universe.');
  const [brandTheme, setBrandTheme] = useState<'red' | 'cyan' | 'green' | 'violet'>('red');

  // Global Policies
  const [maxReviewsPerUser, setMaxReviewsPerUser] = useState('5');
  const [antiSpamLimit, setAntiSpamLimit] = useState('30');
  
  // Loading indicators
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Sync settings on mount
  useEffect(() => {
    async function loadSettings() {
      setIsFetching(true);
      try {
        const res = await getGlobalSettings();
        if (res.success && res.settings) {
          setMaintenanceMode(res.settings.maintenanceMode);
          setApiEndpoint(res.settings.apiEndpoint);
          setCacheTTL(res.settings.cacheTTL.toString());
          setJwtSecret(res.settings.jwtSecret);
          setStreamingResolution(res.settings.streamingResolution);
          setDefaultSubtitleLang(res.settings.defaultSubtitleLang);
          setSiteTitle(res.settings.siteTitle);
          setSiteMetaDesc(res.settings.siteMetaDesc);
          setBrandTheme(res.settings.brandTheme);
          setMaxReviewsPerUser(res.settings.maxReviewsPerUser.toString());
          setAntiSpamLimit(res.settings.antiSpamLimit.toString());
        } else {
          toast({ variant: "destructive", title: "Sync Failed", description: res.message || "Failed to query database config." });
        }
      } catch (e: any) {
        toast({ variant: "destructive", title: "Sync Error", description: e.message || "Failed to contact database settings." });
      } finally {
        setIsFetching(false);
      }
    }
    loadSettings();
  }, [toast]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const parsedTTL = parseInt(cacheTTL, 10);
      if (isNaN(parsedTTL) || parsedTTL < 0) {
        toast({ variant: "destructive", title: "Validation Error", description: "Cache TTL must be a valid non-negative integer." });
        setIsSaving(false);
        return;
      }

      const parsedMaxReviews = parseInt(maxReviewsPerUser, 10);
      if (isNaN(parsedMaxReviews) || parsedMaxReviews < 0) {
        toast({ variant: "destructive", title: "Validation Error", description: "Max reviews per user must be a valid non-negative integer." });
        setIsSaving(false);
        return;
      }

      const parsedAntiSpam = parseInt(antiSpamLimit, 10);
      if (isNaN(parsedAntiSpam) || parsedAntiSpam < 0) {
        toast({ variant: "destructive", title: "Validation Error", description: "Anti-spam rate limit must be a valid non-negative integer." });
        setIsSaving(false);
        return;
      }

      const res = await saveGlobalSettings({
        apiEndpoint: apiEndpoint.trim(),
        cacheTTL: parsedTTL,
        maintenanceMode,
        jwtSecret: jwtSecret.trim(),
        streamingResolution,
        defaultSubtitleLang,
        siteTitle: siteTitle.trim(),
        siteMetaDesc: siteMetaDesc.trim(),
        brandTheme,
        maxReviewsPerUser: parsedMaxReviews,
        antiSpamLimit: parsedAntiSpam,
      });

      if (res.success) {
        toast({ title: "Settings Saved", description: "Operational parameters persisted successfully in MongoDB." });
      } else {
        toast({ variant: "destructive", title: "Save Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to update configurations." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFlushCache = async () => {
    setIsFlushingCache(true);
    try {
      const res = await flushPlatformCache();
      if (res.success) {
        toast({ title: "Cache Flushed", description: "Platform memory buffers invalidated successfully." });
      } else {
        toast({ variant: "destructive", title: "Flush Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to flush caches." });
    } finally {
      setIsFlushingCache(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm("Seed database? This will populate empty collections with mock movies and television series.")) {
      return;
    }
    setIsSeeding(true);
    try {
      const res = await seedMockDatabase();
      if (res.success) {
        toast({ title: "Database Seeded", description: res.message });
      } else {
        toast({ variant: "destructive", title: "Seed Failed", description: res.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to seed mock database." });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleBackupExport = () => {
    setIsExporting(true);
    try {
      // Trigger configuration file download for local backup
      const config = {
        platform: "Movie Pirates OTT Operational Config",
        api: apiEndpoint,
        cache_ttl: cacheTTL,
        maintenance: maintenanceMode,
        streaming_resolution: streamingResolution,
        default_subtitle: defaultSubtitleLang,
        site_title: siteTitle,
        site_meta: siteMetaDesc,
        brand_theme: brandTheme,
        max_reviews: maxReviewsPerUser,
        anti_spam: antiSpamLimit,
        timestamp: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "movie_pirates_telemetry_config.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast({ title: "Backup Exported", description: "Config downloaded to local storage." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Export Failed", description: e.message || "Failed to build configuration JSON." });
    } finally {
      setIsExporting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Syncing platform configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
            <Settings className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Global Settings
          </h1>
          <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
            Configure platform endpoints, control network parameters, change branding, and run migrations.
          </p>
        </div>
        
        {/* Save button floating */}
        <Button 
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-[#FF5A5F] hover:bg-[#FF6F73] text-white font-bold rounded-2xl h-11 px-6 text-xs uppercase tracking-wider shadow-md border border-[#FF5A5F]/20"
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Configuration
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Columns (Parameters configuration) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Operational Parameters Card */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <Server className="w-4 h-4 text-[#FF5A5F]" /> Server & API Parameters
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Configure system connection strings, keys, and endpoints.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">API Gateway Endpoint</Label>
                <Input 
                  value={apiEndpoint} 
                  onChange={(e) => setApiEndpoint(e.target.value)} 
                  className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Global Cache TTL (seconds)</Label>
                <Input 
                  value={cacheTTL} 
                  type="number"
                  onChange={(e) => setCacheTTL(e.target.value)} 
                  className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" 
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">JWT Encryption Hash Secret</Label>
                <div className="relative">
                  <Input 
                    type="password"
                    value={jwtSecret} 
                    onChange={(e) => setJwtSecret(e.target.value)} 
                    className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40 pr-10" 
                  />
                  <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-[#666666]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Streaming & Media Rules Card */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <MonitorPlay className="w-4.5 h-4.5 text-[#FF5A5F]" /> Streaming & Media Rules
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Set global bitrate resolutions and player preferences.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Streaming Resolution Cap</Label>
                <select
                  value={streamingResolution}
                  onChange={(e) => setStreamingResolution(e.target.value as any)}
                  className="bg-white/[0.03] border border-white/8 rounded-xl h-11 px-3 text-xs text-white focus:outline-none focus:border-[#FF5A5F]/40 w-full"
                >
                  <option value="Auto" className="bg-zinc-950 text-white">Auto (Adaptive)</option>
                  <option value="4K" className="bg-zinc-950 text-white">4K Ultra HD</option>
                  <option value="1080p" className="bg-zinc-950 text-white">1080p Full HD</option>
                  <option value="720p" className="bg-zinc-950 text-white">720p HD</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Default Subtitle Tracks</Label>
                <select
                  value={defaultSubtitleLang}
                  onChange={(e) => setDefaultSubtitleLang(e.target.value as any)}
                  className="bg-white/[0.03] border border-white/8 rounded-xl h-11 px-3 text-xs text-white focus:outline-none focus:border-[#FF5A5F]/40 w-full"
                >
                  <option value="English" className="bg-zinc-950 text-white">English</option>
                  <option value="Spanish" className="bg-zinc-950 text-white">Spanish</option>
                  <option value="French" className="bg-zinc-950 text-white">French</option>
                  <option value="None" className="bg-zinc-950 text-white">None (Disabled)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Site Branding & Layout Card */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-[#FF5A5F]" /> Site Branding & SEO
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Configure branding options, colors, and landing copy.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Global SEO Title</Label>
                  <Input 
                    value={siteTitle} 
                    onChange={(e) => setSiteTitle(e.target.value)} 
                    className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs text-white focus:border-[#FF5A5F]/40" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Primary Brand Theme</Label>
                  <select
                    value={brandTheme}
                    onChange={(e) => setBrandTheme(e.target.value as any)}
                    className="bg-white/[0.03] border border-white/8 rounded-xl h-11 px-3 text-xs text-white focus:outline-none focus:border-[#FF5A5F]/40 w-full"
                  >
                    <option value="red" className="bg-zinc-950 text-[#FF5A5F] font-bold">Crimson Red (Default)</option>
                    <option value="cyan" className="bg-zinc-950 text-[#00D1B2] font-bold">Cyan Turquoise</option>
                    <option value="green" className="bg-zinc-950 text-emerald-500 font-bold">Emerald Green</option>
                    <option value="violet" className="bg-zinc-950 text-purple-500 font-bold">Royal Violet</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Global Meta Description</Label>
                <Textarea 
                  value={siteMetaDesc} 
                  rows={3}
                  onChange={(e) => setSiteMetaDesc(e.target.value)} 
                  className="bg-white/[0.03] border-white/8 rounded-2xl text-xs text-white placeholder-white/35 focus:border-[#FF5A5F]/40 resize-none" 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Columns (Policies & Maintenance) */}
        <div className="space-y-6">
          
          {/* Security & Policies Card */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-[#FF5A5F]" /> Policy Gates & Security
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Manage system status gates and global limits.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              
              {/* Maintenance Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white uppercase">Maintenance Mode</h4>
                  <p className="text-[9px] text-[#666666] font-medium leading-relaxed">Lock public streaming connections.</p>
                </div>
                <Switch 
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                  className="data-[state=checked]:bg-[#FF5A5F] data-[state=unchecked]:bg-white/5 border-white/5"
                />
              </div>

              {/* Max Reviews Per User */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Max Reviews / User / Title</Label>
                <Input 
                  value={maxReviewsPerUser} 
                  type="number"
                  onChange={(e) => setMaxReviewsPerUser(e.target.value)} 
                  className="bg-white/[0.03] border-white/8 rounded-xl h-10 text-xs text-white focus:border-[#FF5A5F]/40" 
                />
              </div>

              {/* Anti Spam limits */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#A1A1A1] uppercase">Anti-Spam Rate Limit (req/min)</Label>
                <Input 
                  value={antiSpamLimit} 
                  type="number"
                  onChange={(e) => setAntiSpamLimit(e.target.value)} 
                  className="bg-white/[0.03] border-white/8 rounded-xl h-10 text-xs text-white focus:border-[#FF5A5F]/40" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Database Maintenance Card */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <Database className="w-4 h-4 text-[#FF5A5F]" /> Database & Maintenance
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Execute administrative catalog actions.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              
              {/* Seed Database Option */}
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" /> Seed Empty DB
                  </h4>
                  <p className="text-[9px] text-[#666666] leading-relaxed font-medium">Populate empty MongoDB movie collections with default cinematic assets and reviews.</p>
                </div>
                <Button 
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="w-full bg-[#00D1B2] hover:bg-[#00D1B2]/90 text-white rounded-xl h-10 text-[10px] font-bold uppercase tracking-wider border border-[#00D1B2]/20"
                >
                  {isSeeding ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                  Seed Database
                </Button>
              </div>

              {/* Cache Controls */}
              <div className="grid gap-3 grid-cols-2">
                <Button 
                  onClick={handleFlushCache}
                  disabled={isFlushingCache}
                  className="bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl h-10 text-[9px] font-bold uppercase tracking-wider"
                >
                  {isFlushingCache ? <Loader2 className="w-3 h-3 animate-spin text-[#FF5A5F]" /> : <RefreshCw className="w-3 h-3 mr-1 text-[#FF5A5F]" />}
                  Flush Cache
                </Button>

                <Button 
                  onClick={handleBackupExport}
                  disabled={isExporting}
                  className="bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl h-10 text-[9px] font-bold uppercase tracking-wider"
                >
                  {isExporting ? <Loader2 className="w-3 h-3 animate-spin text-[#00D1B2]" /> : <Download className="w-3 h-3 mr-1 text-[#00D1B2]" />}
                  Export JSON
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
