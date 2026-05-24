'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Loader2, 
  Tv, 
  Shield, 
  HardDrive, 
  Sparkles,
  Info,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StreamTestPage() {
  const { toast } = useToast();
  const [fileId, setFileId] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls handler
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Helper to extract File ID from full Google Drive URL
  const extractFileId = (input: string): string => {
    if (!input) return '';
    // Try matching /file/d/FILE_ID/
    const fileDMatch = input.match(/\/file\/d\/([a-zA-Z0-9_\-]+)/);
    if (fileDMatch) return fileDMatch[1];
    
    // Try matching id=FILE_ID
    const idParamMatch = input.match(/[?&]id=([a-zA-Z0-9_\-]+)/);
    if (idParamMatch) return idParamMatch[1];
    
    return input.trim();
  };

  const handleStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractFileId(fileId);
    if (!cleanId) {
      toast({
        title: 'Error',
        description: 'Please paste a valid Google Drive link or File ID.',
        variant: 'destructive',
      });
      return;
    }
    setVideoError(null);
    setStreamUrl(`/api/stream/${cleanId}`);
    setIsStreaming(true);
    setIsBuffering(true);
    setIsPlaying(false);
    toast({
      title: 'Connecting Stream',
      description: `Loading direct Google Drive stream proxy for ID: ${cleanId}...`,
    });
  };

  const loadDemoFile = () => {
    // Pre-populate with a demo public ID for verification.
    // User can test with this file.
    const demoId = '182Yx2d73_vM_85-i8XF698V-f6y43734'; 
    setFileId(demoId);
    toast({
      title: 'Demo ID Loaded',
      description: 'Click "Stream Now" to test backend proxy streaming.',
    });
  };

  // Video actions
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(err => {
        console.error("Play request failed:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsBuffering(false);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.log("Autoplay blocked or failed:", err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const seekTime = parseFloat(e.target.value);
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
      if (nextMute) {
        setVolume(0);
      } else {
        setVolume(0.8);
        videoRef.current.volume = 0.8;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!isFullscreen) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 max-w-6xl mx-auto flex flex-col items-center justify-start space-y-12">
      
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="text-center space-y-4 max-w-2xl mt-4 md:mt-0"
      >
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold uppercase tracking-widest">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          <span>Internal Testing Only</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-bold tracking-wider text-foreground dark:text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
          Phase 3 Streaming Test
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-medium tracking-wide">
          Internal Google Drive OTT Streaming System
        </p>
      </motion.div>

      {/* Stream Input Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full max-w-3xl glassmorphism-card p-6 md:p-8 rounded-[28px] shadow-[0_15px_35px_rgba(0,0,0,0.3)] border border-white/10 dark:border-white/5 space-y-6"
      >
        <form onSubmit={handleStreamSubmit} className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full flex-1">
            <Input
              type="text"
              placeholder="Paste Google Drive File ID (e.g. 182Yx2d73_vM_85-i8XF698V-f6y43734)"
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
              className="h-14 px-6 rounded-full bg-white/5 border border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus:ring-primary focus:border-primary transition-all pr-12"
            />
            <button
              type="button"
              onClick={loadDemoFile}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-primary hover:text-primary_hover transition-colors p-1"
              title="Load Demo File ID"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          <Button
            type="submit"
            className="h-14 w-full md:w-auto px-8 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold tracking-wider transition-all duration-350 shadow-[0_4px_20px_rgba(139,0,0,0.4)] hover:shadow-[0_4px_25px_rgba(139,0,0,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          >
            Stream Now
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs text-muted-foreground/80 px-2">
          <span>Make sure your Google Drive file is shared with &quot;Anyone with the link can view&quot;.</span>
          <button 
            type="button" 
            onClick={loadDemoFile}
            className="underline hover:text-foreground text-primary transition-colors flex items-center gap-1"
          >
            Use Demo File ID
          </button>
        </div>
      </motion.div>

      {/* Custom Video Player Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full max-w-4xl"
      >
        <div 
          ref={playerContainerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          className="relative w-full aspect-video rounded-[32px] overflow-hidden bg-black shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/15 dark:border-white/5 group"
        >
          {isStreaming ? (
            <>
              {videoError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-md p-6 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-primary mb-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                    <Info className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-headline font-bold text-white tracking-wider">
                    Playback Error
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {videoError}
                  </p>
                  <Button 
                    onClick={() => {
                      setVideoError(null);
                      setIsStreaming(false);
                    }}
                    className="rounded-full bg-primary hover:bg-primary/95 text-white font-medium px-6 py-2 text-xs uppercase tracking-wider"
                  >
                    Reset Stream
                  </Button>
                </div>
              ) : (
                <>
                  {/* HTML5 Video element */}
                  <video
                    ref={videoRef}
                    src={streamUrl}
                    autoPlay
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onCanPlay={() => setIsBuffering(false)}
                    onEnded={() => setIsPlaying(false)}
                    onClick={handlePlayPause}
                    onError={() => {
                      setVideoError("Playback failed. This is typically caused by an invalid or non-public Google Drive File ID, or a format not natively supported by your browser (e.g. MKV). Please ensure the file is shared as 'Anyone with the link can view' and is a standard web-compatible format like MP4.");
                      setIsBuffering(false);
                      setIsPlaying(false);
                    }}
                  />

                  {/* Loader / Buffering Indicator */}
                  <AnimatePresence>
                    {isBuffering && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none"
                      >
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Custom Controller Overlay */}
                  <AnimatePresence>
                    {showControls && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-6 z-10"
                      >
                        {/* Top control bar */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-white">
                            <Tv className="h-5 w-5 text-primary" />
                            <span className="font-headline font-semibold text-lg tracking-wider">
                              Proxy Stream: {fileId.substring(0, 8)}...
                            </span>
                          </div>
                        </div>

                        {/* Big Center Play/Pause button */}
                        <div className="flex justify-center items-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handlePlayPause}
                            className="h-16 w-16 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-[0_4px_15px_rgba(139,0,0,0.5)] focus:outline-none backdrop-blur-sm"
                          >
                            {isPlaying ? (
                              <Pause className="h-8 w-8 fill-white text-white translate-x-0" />
                            ) : (
                              <Play className="h-8 w-8 fill-white text-white translate-x-0.5" />
                            )}
                          </motion.button>
                        </div>

                        {/* Bottom controls panel */}
                        <div className="space-y-4">
                          {/* Seek slider */}
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-white/90 font-medium font-mono min-w-[40px]">
                              {formatTime(currentTime)}
                            </span>
                            <input
                              type="range"
                              min="0"
                              max={duration || 100}
                              value={currentTime}
                              onChange={handleSeek}
                              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary hover:h-1.5 transition-all"
                            />
                            <span className="text-xs text-white/90 font-medium font-mono min-w-[40px]">
                              {formatTime(duration)}
                            </span>
                          </div>

                          {/* Control buttons */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                              <button onClick={handlePlayPause} className="text-white hover:text-primary transition-colors">
                                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                              </button>

                              {/* Volume & Mute control */}
                              <div className="flex items-center space-x-2 group/volume">
                                <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </button>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.05"
                                  value={volume}
                                  onChange={handleVolumeChange}
                                  className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </>
          ) : (
            /* Empty state placeholder */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md p-6 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary mb-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <Tv className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-headline font-bold text-white tracking-wider">
                Enter Google Drive ID to Test
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Copy and paste a shared Google Drive File ID into the field above to start proxy streaming. The streaming engine operates entirely in the background without Google Drive redirects.
              </p>
              <Button 
                onClick={loadDemoFile}
                className="rounded-full bg-white/10 border border-white/15 hover:bg-white/20 text-white font-medium px-6 py-2 text-xs uppercase tracking-wider"
              >
                Use Demo File ID
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stream Information Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full"
      >
        <div className="glassmorphism-card p-6 rounded-[24px] border border-white/10 hover:border-primary/25 hover:shadow-[0_8px_25px_rgba(139,0,0,0.15)] transition-all duration-300 group">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <HardDrive className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-headline font-bold text-white tracking-wider mb-2">
            Google Drive Source
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Video content streams directly from Google Drive through backend proxy streaming.
          </p>
        </div>

        <div className="glassmorphism-card p-6 rounded-[24px] border border-white/10 hover:border-primary/25 hover:shadow-[0_8px_25px_rgba(139,0,0,0.15)] transition-all duration-300 group">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Tv className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-headline font-bold text-white tracking-wider mb-2">
            Internal Streaming
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Users remain inside Movie Pirates without Google Drive redirects.
          </p>
        </div>

        <div className="glassmorphism-card p-6 rounded-[24px] border border-white/10 hover:border-primary/25 hover:shadow-[0_8px_25px_rgba(139,0,0,0.15)] transition-all duration-300 group">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Shield className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-headline font-bold text-white tracking-wider mb-2">
            Secure Streaming
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Google Drive URLs remain hidden behind internal backend APIs.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
