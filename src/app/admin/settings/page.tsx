"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, ShieldAlert, Database, CloudLightning, Key, Download, RefreshCw, Loader2, Server } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  
  // Settings States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('https://api.moviepirates.com/v2');
  const [cacheTTL, setCacheTTL] = useState('3600');
  const [jwtSecret, setJwtSecret] = useState('••••••••••••••••••••••••••••••••');
  
  // Loading button indicators
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({ title: "Settings Saved", description: "Operational parameters updated globally." });
    }, 1000);
  };

  const handleFlushCache = () => {
    setIsFlushingCache(true);
    setTimeout(() => {
      setIsFlushingCache(false);
      toast({ title: "Cache Flushed", description: "Successfully cleared Next.js router cache and MongoDB indices." });
    }, 1500);
  };

  const handleBackupExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      
      // Trigger a raw schema download
      const config = {
        platform: "Movie Pirates OTT Operational Config",
        api: apiEndpoint,
        cache_ttl: cacheTTL,
        maintenance: maintenanceMode,
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
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
          <Settings className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Global Settings
        </h1>
        <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
          Configure platform endpoints, control network parameters, and flush cache indexes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Core parameters column */}
        <div className="md:col-span-2 space-y-6">
          {/* OTT Config Card */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <Server className="w-4 h-4 text-[#FF5A5F]" /> Operational Parameters
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Configure system connection strings and endpoints.</CardDescription>
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

              <Button 
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full bg-[#FF5A5F] hover:bg-[#FF6F73] text-white font-bold rounded-2xl h-12 text-xs uppercase tracking-wider shadow-md border border-[#FF5A5F]/20 mt-4"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Configurations
              </Button>
            </CardContent>
          </Card>

          {/* Database controls */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <Database className="w-4 h-4 text-[#FF5A5F]" /> Database & Storage Maintenance
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Execute administrative indexing operations.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 grid gap-4 sm:grid-cols-2">
              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase">Flush Schema Cache</h4>
                  <p className="text-[10px] text-[#666666] leading-relaxed font-medium">Clear system search indices, redis caches, and dynamic recommendations.</p>
                </div>
                <Button 
                  onClick={handleFlushCache}
                  disabled={isFlushingCache}
                  className="w-full bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl h-10 text-[10px] font-bold uppercase tracking-wider"
                >
                  {isFlushingCache ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-[#FF5A5F]" /> : <RefreshCw className="w-3.5 h-3.5 mr-2 text-[#FF5A5F]" />}
                  Flush Cache
                </Button>
              </div>

              <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase">Export Configuration</h4>
                  <p className="text-[10px] text-[#666666] leading-relaxed font-medium">Export system settings, telemetry records, and catalog schemas to file.</p>
                </div>
                <Button 
                  onClick={handleBackupExport}
                  disabled={isExporting}
                  className="w-full bg-white/5 border border-white/8 hover:bg-white/10 text-white rounded-xl h-10 text-[10px] font-bold uppercase tracking-wider"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-[#00D1B2]" /> : <Download className="w-3.5 h-3.5 mr-2 text-[#00D1B2]" />}
                  Export JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar settings column */}
        <div className="space-y-6">
          {/* Security Gate Card */}
          <Card className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
            <CardHeader className="p-0 pb-6">
              <CardTitle className="text-xs font-bold text-white uppercase tracking-wider font-headline flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-[#F59E0B]" /> Security & Governance
              </CardTitle>
              <CardDescription className="text-[10px] text-[#A1A1A1]">Manage system status gates and global limits.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              
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

              {/* API Security Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/5 rounded-2xl">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white uppercase">Enforce SSL Verification</h4>
                  <p className="text-[9px] text-[#666666] font-medium leading-relaxed">Require TLS headers for streaming.</p>
                </div>
                <Switch 
                  defaultChecked
                  className="data-[state=checked]:bg-[#FF5A5F] data-[state=unchecked]:bg-white/5 border-white/5"
                />
              </div>

              {/* IP Whitelist Info */}
              <div className="p-4 bg-[#FF5A5F]/5 border border-[#FF5A5F]/15 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#FF5A5F]">
                  <CloudLightning className="w-4 h-4" />
                  <span>Control Center Active</span>
                </div>
                <p className="text-[10px] text-[#A1A1A1] leading-relaxed font-medium">
                  Your session IP has full read/write capabilities across the platform. Access tokens remain active.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
