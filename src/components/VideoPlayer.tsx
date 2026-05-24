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
  Info,
  Headphones,
  X,
  Languages
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  watchUrl: string;
  title: string;
  onClose?: () => void;
}

export default function VideoPlayer({ watchUrl, title, onClose }: VideoPlayerProps) {
  const { toast } = useToast();
  const [streamUrl, setStreamUrl] = useState('');
  const [fileId, setFileId] = useState('');
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  // Audio tracks state
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeAudioTrackIndex, setActiveAudioTrackIndex] = useState<number>(0);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  // Helper to extract File ID from full Google Drive URL
  const extractFileId = (input: string): string => {
    if (!input) return '';
    const fileDMatch = input.match(/\/file\/d\/([a-zA-Z0-9_\-]+)/);
    if (fileDMatch) return fileDMatch[1];
    const idParamMatch = input.match(/[?&]id=([a-zA-Z0-9_\-]+)/);
    if (idParamMatch) return idParamMatch[1];
    return input.trim();
  };

  useEffect(() => {
    const cleanId = extractFileId(watchUrl);
    if (cleanId && (watchUrl.includes('drive.google.com') || watchUrl.includes('docs.google.com'))) {
      setFileId(cleanId);
      const url = `/api/stream/${cleanId}`;
      setStreamUrl(url);
      setVideoError(null);
      setIsBuffering(true);
      setIsPlaying(false);
      playPromiseRef.current = null;

      // Pre-flight check to verify if the stream is accessible or quota-exceeded
      fetch(url, {
        method: 'GET',
        headers: {
          'Range': 'bytes=0-0'
        }
      })
      .then(async (res) => {
        if (!res.ok) {
          const errMsg = await res.text();
          setVideoError(errMsg || `Failed to connect to stream proxy (HTTP ${res.status}).`);
          setIsBuffering(false);
        }
      })
      .catch((err) => {
        console.error("Stream verification failed:", err);
      });
    } else {
      // Fallback to direct url if it's not a gdrive link
      setStreamUrl(watchUrl);
      setVideoError(null);
      setIsBuffering(true);
      setIsPlaying(false);
      playPromiseRef.current = null;
    }
  }, [watchUrl]);

  // Auto-hide controls handler
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showAudioMenu) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showAudioMenu]);

  // Video actions
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      const playPromise = playPromiseRef.current;
      if (playPromise) {
        playPromise.then(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }).catch(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      const playPromise = videoRef.current.play();
      playPromiseRef.current = playPromise;
      setIsPlaying(true);
      playPromise.catch(err => {
        console.log("Play request interrupted or failed:", err);
        setIsPlaying(false);
      });
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
      
      // Detect native audio tracks if supported
      const tracks = (videoRef.current as any).audioTracks;
      if (tracks && tracks.length > 0) {
        const extracted: any[] = [];
        for (let i = 0; i < tracks.length; i++) {
          extracted.push({
            id: tracks[i].id,
            label: tracks[i].label || tracks[i].language || `Track ${i + 1}`,
            language: tracks[i].language,
            enabled: tracks[i].enabled,
            index: i
          });
        }
        setAudioTracks(extracted);
        const activeIdx = extracted.findIndex(t => t.enabled);
        if (activeIdx !== -1) {
          setActiveAudioTrackIndex(activeIdx);
        }
      } else {
        // Fallback: Populate mock tracks so Chrome users see the audio switcher and educational info
        setAudioTracks([
          { index: 0, label: 'Default Audio (Multi-Language Embedded)', enabled: true },
          { index: 1, label: 'Secondary Audio Track (Safari/Edge Only)', enabled: false }
        ]);
        setActiveAudioTrackIndex(0);
      }

      const playPromise = videoRef.current.play();
      playPromiseRef.current = playPromise;
      playPromise.then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.log("Autoplay blocked or failed:", err);
        setIsPlaying(false);
      });
    }
  };

  const selectAudioTrack = (index: number) => {
    if (videoRef.current) {
      const tracks = (videoRef.current as any).audioTracks;
      if (tracks && tracks[index]) {
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].enabled = (i === index);
        }
        setActiveAudioTrackIndex(index);
        setAudioTracks(prev => prev.map((t, i) => ({ ...t, enabled: i === index })));
        toast({
          title: "Audio Track Changed",
          description: `Switched to ${tracks[index].label || tracks[index].language || `Track ${index + 1}`}`,
        });
      } else {
        // Fallback info for Chrome/Firefox
        if (index === 1) {
          toast({
            title: "Multi-Audio Capability Info",
            description: "Native audio track switching for raw video files is fully supported in Safari and Edge. Chrome automatically plays the primary track embedded in the file.",
            variant: "default",
          });
        } else {
          setActiveAudioTrackIndex(index);
          setAudioTracks(prev => prev.map((t, i) => ({ ...t, enabled: i === index })));
        }
      }
    }
    setShowAudioMenu(false);
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
    <div 
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full h-full bg-black flex items-center justify-center group select-none"
    >
      {videoError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-md p-6 text-center space-y-4 z-35">
          <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-primary mb-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <Info className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-2xl font-headline font-bold text-white tracking-wider">
            Playback Error
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Playback error: Connectivity issue.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={() => {
                setVideoError(null);
                setIsBuffering(true);
                const cleanId = extractFileId(watchUrl);
                if (cleanId && (watchUrl.includes('drive.google.com') || watchUrl.includes('docs.google.com'))) {
                  const url = `/api/stream/${cleanId}`;
                  fetch(url, {
                    method: 'GET',
                    headers: {
                      'Range': 'bytes=0-0'
                    }
                  })
                  .then(async (res) => {
                    if (!res.ok) {
                      const errMsg = await res.text();
                      setVideoError(errMsg || `Failed to connect to stream proxy (HTTP ${res.status}).`);
                      setIsBuffering(false);
                    } else {
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }
                  })
                  .catch((err) => {
                    console.error("Stream verification failed:", err);
                    if (videoRef.current) {
                      videoRef.current.load();
                    }
                  });
                } else {
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }
              }}
              className="rounded-full bg-primary hover:bg-primary/95 text-white font-medium px-6 py-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              Retry Playback
            </Button>
            {watchUrl && (
              <Button 
                asChild
                className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                <a href={watchUrl} target="_blank" rel="noopener noreferrer">
                  Download / View on GDrive
                </a>
              </Button>
            )}
            {onClose && (
              <Button 
                onClick={onClose}
                variant="outline"
                className="rounded-full border-white/10 hover:bg-white/10 text-white font-medium px-6 py-2 text-xs uppercase tracking-wider cursor-pointer"
              >
                Close Player
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* HTML5 Video element */}
          {streamUrl && (
            <video
              ref={videoRef}
              src={streamUrl}
              autoPlay
              className="w-full h-full object-contain max-h-[85vh]"
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
          )}

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
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 flex flex-col justify-between p-6 z-10 animate-fade-in"
              >
                {/* Top control bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white">
                    <Tv className="h-5 w-5 text-primary" />
                    <span className="font-headline font-semibold text-lg tracking-wider drop-shadow-md">
                      {title}
                    </span>
                  </div>
                  {onClose && (
                    <button 
                      onClick={onClose}
                      className="h-10 w-10 rounded-full bg-black/50 border border-white/10 text-white flex items-center justify-center hover:bg-primary transition-all duration-300 backdrop-blur-md"
                      title="Close Player"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
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
                    <span className="text-xs text-white/90 font-medium font-mono min-w-[40px] drop-shadow">
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
                    <span className="text-xs text-white/90 font-medium font-mono min-w-[40px] drop-shadow">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Control buttons */}
                  <div className="flex items-center justify-between relative">
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

                    <div className="flex items-center space-x-4 relative">
                      {/* Audio Track Menu Trigger */}
                      <div className="relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAudioMenu(!showAudioMenu);
                          }} 
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${showAudioMenu ? 'bg-primary text-white' : 'bg-black/40 hover:bg-black/60 border border-white/10 text-white/90'}`}
                          title="Audio Language"
                        >
                          <Headphones className="h-4 w-4" />
                          <span>Audio</span>
                        </button>
                        
                        {/* Audio track list dropdown */}
                        <AnimatePresence>
                          {showAudioMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-10 right-0 w-64 bg-zinc-950/95 border border-white/10 rounded-2xl p-2 shadow-xl backdrop-blur-md space-y-1 z-20 text-white"
                            >
                              <div className="px-3 py-1.5 border-b border-white/5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                                <Languages className="h-3 w-3" />
                                <span>Audio Language Tracks</span>
                              </div>
                              <div className="max-h-40 overflow-y-auto">
                                {audioTracks.map((track) => (
                                  <button
                                    key={track.index}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectAudioTrack(track.index);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${track.enabled || track.index === activeAudioTrackIndex ? 'bg-primary text-white' : 'hover:bg-white/5 text-white/80'}`}
                                  >
                                    <span className="truncate">{track.label}</span>
                                    {(track.enabled || track.index === activeAudioTrackIndex) && <div className="h-1.5 w-1.5 rounded-full bg-white"></div>}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

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
    </div>
  );
}
