"use client";

import React, { useEffect, useState } from 'react';
import { getMovies, updateMovie, type MovieOutput } from '@/ai/flows/movie-management-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Replace, Trash2, Image as ImageIcon, Video, FolderOpen, Info, ShieldAlert, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AssetDetail {
  id: string;
  movieId: string;
  movieTitle: string;
  type: 'poster' | 'backdrop' | 'trailer';
  url: string;
  resolution?: string;
  fileSize?: string;
}

export default function MediaAssetsPage() {
  const { toast } = useToast();
  const [movies, setMovies] = useState<MovieOutput[]>([]);
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tab selection: 'all' | 'posters' | 'banners' | 'trailers'
  const [activeTab, setActiveTab] = useState<'all' | 'posters' | 'banners' | 'trailers'>('all');
  
  // Modal preview states
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState('');
  const [isSubmittingReplace, setIsSubmittingReplace] = useState(false);

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const fetchedMovies = await getMovies();
      setMovies(fetchedMovies);
      
      // Extract assets from actual movie database documents
      const extractedAssets: AssetDetail[] = [];
      
      fetchedMovies.forEach(movie => {
        // 1. Poster Asset
        if (movie.posterUrl) {
          extractedAssets.push({
            id: `p-${movie.id}`,
            movieId: movie.id,
            movieTitle: movie.title,
            type: 'poster',
            url: movie.posterUrl,
            resolution: '1000x1500',
            fileSize: '320 KB'
          });
        }
        
        // 2. Backdrop/Banner Asset
        if (movie.backdropUrl) {
          extractedAssets.push({
            id: `b-${movie.id}`,
            movieId: movie.id,
            movieTitle: movie.title,
            type: 'backdrop',
            url: movie.backdropUrl,
            resolution: '1920x1080',
            fileSize: '850 KB'
          });
        }

        // 3. Trailer Asset
        if (movie.trailerUrl) {
          extractedAssets.push({
            id: `t-${movie.id}`,
            movieId: movie.id,
            movieTitle: movie.title,
            type: 'trailer',
            url: movie.trailerUrl,
            resolution: '1080p Stream',
            fileSize: 'Embed'
          });
        }
      });
      
      setAssets(extractedAssets);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message || "Failed to query database assets." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Copied", description: "Asset URL copied to clipboard." });
  };

  // Replace Asset globally in the DB
  const handleOpenReplace = (asset: AssetDetail) => {
    setSelectedAsset(asset);
    setNewUrlInput(asset.url);
    setIsReplacing(true);
  };

  const handleReplaceSubmit = async () => {
    if (!selectedAsset) return;
    if (newUrlInput.trim() === selectedAsset.url) {
      setIsReplacing(false);
      return;
    }
    
    setIsSubmittingReplace(true);
    try {
      // Find the movie and update its url
      const updatePayload: any = { movieId: selectedAsset.movieId };
      if (selectedAsset.type === 'poster') {
        updatePayload.posterUrl = newUrlInput.trim();
      } else if (selectedAsset.type === 'backdrop') {
        updatePayload.backdropUrl = newUrlInput.trim();
      } else if (selectedAsset.type === 'trailer') {
        updatePayload.trailerUrl = newUrlInput.trim();
      }
      
      const result = await updateMovie(updatePayload);
      if (result.success) {
        toast({ title: "Success", description: `Replaced asset reference for "${selectedAsset.movieTitle}".` });
        setIsReplacing(false);
        setSelectedAsset(null);
        await fetchAssets();
      } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Failed to update asset reference." });
    } finally {
      setIsSubmittingReplace(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (activeTab === 'all') return true;
    if (activeTab === 'posters') return asset.type === 'poster';
    if (activeTab === 'banners') return asset.type === 'backdrop';
    if (activeTab === 'trailers') return asset.type === 'trailer';
    return true;
  });

  // Calculate storage monitoring
  const postersCount = assets.filter(a => a.type === 'poster').length;
  const backdropsCount = assets.filter(a => a.type === 'backdrop').length;
  const trailersCount = assets.filter(a => a.type === 'trailer').length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#FF5A5F]" />
          <p className="text-sm font-semibold tracking-widest text-[#A1A1A1] uppercase animate-pulse">Scanning DB binary catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold font-headline flex items-center text-white uppercase tracking-wider">
          <FolderOpen className="mr-3 h-8 w-8 text-[#FF5A5F]" /> Media Asset Management
        </h1>
        <p className="text-xs md:text-sm text-[#A1A1A1] font-medium mt-1">
          Catalog, monitor, preview, and configure all binary poster images, backdrops, and trailer embeds.
        </p>
      </div>

      {/* Storage and catalog stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-[#A1A1A1] uppercase tracking-wider">Database References</CardTitle>
            <ImageIcon className="w-4 h-4 text-[#00D1B2]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <div className="text-3xl font-extrabold text-white">{assets.length}</div>
            <p className="text-[10px] text-[#666666] font-medium">Unique active URLs in catalog</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-[#A1A1A1] uppercase tracking-wider">Poster Assets</CardTitle>
            <ImageIcon className="w-4 h-4 text-[#FF5A5F]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <div className="text-3xl font-extrabold text-white">{postersCount}</div>
            <p className="text-[10px] text-[#666666] font-medium">Cover graphics configured</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-[#A1A1A1] uppercase tracking-wider">Backdrops & Banners</CardTitle>
            <ImageIcon className="w-4 h-4 text-[#FF5A5F]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <div className="text-3xl font-extrabold text-white">{backdropsCount}</div>
            <p className="text-[10px] text-[#666666] font-medium">Wide graphics configured</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0D0D0D]/45 border border-white/6 backdrop-blur-[24px] rounded-[28px] p-6 shadow-lg">
          <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-[#A1A1A1] uppercase tracking-wider">Trailer Streams</CardTitle>
            <Video className="w-4 h-4 text-[#00D1B2]" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <div className="text-3xl font-extrabold text-white">{trailersCount}</div>
            <p className="text-[10px] text-[#666666] font-medium">Linked embed URLs</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Menu */}
      <div className="bg-[#0D0D0D]/40 border border-white/5 backdrop-blur-[24px] rounded-3xl p-2.5 flex flex-wrap gap-2 w-max max-w-full shadow-lg">
        {[
          { label: 'All Assets', id: 'all' },
          { label: 'Posters', id: 'posters' },
          { label: 'Banners', id: 'banners' },
          { label: 'Trailers', id: 'trailers' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'px-5 py-3 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all duration-300',
              activeTab === tab.id
                ? 'bg-[#FF5A5F]/18 text-white border border-[#FF5A5F]/30 shadow-inner'
                : 'text-[#A1A1A1] hover:text-white border border-transparent hover:bg-white/3'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-[#0D0D0D]/40 border border-white/5 rounded-3xl p-16 text-center text-[#666666] font-medium">
          <ImageIcon className="w-12 h-12 mx-auto text-[#FF5A5F] mb-4 opacity-35" />
          <p className="text-sm font-bold uppercase text-white">No Assets Located</p>
          <p className="text-xs text-[#A1A1A1] mt-1">Check database indices or format parameters.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredAssets.map((asset) => (
            <div 
              key={asset.id} 
              className="bg-[#0D0D0D]/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-lg group hover:border-white/15 transition-all duration-500 flex flex-col justify-between"
            >
              {/* Asset Graphics Preview */}
              <div className="relative aspect-video w-full bg-black/40 flex items-center justify-center overflow-hidden border-b border-white/5">
                {asset.type === 'trailer' ? (
                  <div className="flex flex-col items-center gap-2">
                    <Video className="w-8 h-8 text-[#FF5A5F] animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">Video Embed</span>
                  </div>
                ) : (
                  <Image 
                    src={asset.url} 
                    alt={asset.movieTitle} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    unoptimized
                  />
                )}
                
                {/* Type Badge */}
                <span className={cn(
                  "absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md",
                  asset.type === 'poster' && 'bg-[#FF5A5F]/15 border-[#FF5A5F]/20 text-[#FF5A5F]',
                  asset.type === 'backdrop' && 'bg-[#00D1B2]/15 border-[#00D1B2]/20 text-[#00D1B2]',
                  asset.type === 'trailer' && 'bg-white/5 border-white/10 text-white'
                )}>
                  {asset.type}
                </span>
              </div>

              {/* Info Area */}
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white tracking-wide truncate">{asset.movieTitle}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-[#666666] font-mono">
                    <span>{asset.resolution}</span>
                    <span>•</span>
                    <span>{asset.fileSize}</span>
                  </div>
                </div>

                {/* Control bar */}
                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleCopyUrl(asset.url)}
                    className="bg-white/3 border-white/5 hover:bg-white/8 text-white rounded-xl h-9 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleOpenReplace(asset)}
                    className="bg-white/3 border-white/5 hover:bg-white/8 text-white rounded-xl h-9 text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Replace className="w-3.5 h-3.5 mr-1" /> Replace
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset URL Replacement Dialog */}
      <Dialog open={isReplacing} onOpenChange={setIsReplacing}>
        <DialogContent className="max-w-md bg-[#0D0D0D]/95 border border-white/10 text-white rounded-3xl shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold uppercase tracking-wider text-white">Replace Database Asset</DialogTitle>
            <DialogDescription className="text-xs text-[#A1A1A1]">
              Modifies the catalog URL reference for "{selectedAsset?.movieTitle}" globally inside MongoDB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#666666] uppercase">Selected Type</Label>
              <div className="text-xs font-semibold text-white capitalize">{selectedAsset?.type} URL</div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#A1A1A1] uppercase">New Destination URL</Label>
              <Input 
                value={newUrlInput} 
                onChange={(e) => setNewUrlInput(e.target.value)} 
                className="bg-white/[0.03] border-white/8 rounded-xl h-11 text-xs focus:border-[#FF5A5F]/40 focus:ring-0" 
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsReplacing(false)}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white border-white/10 rounded-xl h-11 text-xs font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReplaceSubmit}
              disabled={isSubmittingReplace}
              className="flex-1 bg-[#FF5A5F] hover:bg-[#FF6F73] text-white rounded-xl h-11 text-xs font-bold uppercase tracking-wider border border-[#FF5A5F]/20"
            >
              {isSubmittingReplace && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Apply Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
