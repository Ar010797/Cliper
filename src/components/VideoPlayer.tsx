import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  UploadCloud,
  Sparkles,
} from 'lucide-react';
import { ColorFilter, TextOverlay, VideoClip } from '../types';

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSrc: string | null;
  videoDuration: number;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  activeClips: VideoClip[];
  selectedClipId: string | null;
  setSelectedClipId: (id: string) => void;
  filter: ColorFilter;
  overlay: TextOverlay;
  aspectGuide: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  setAspectGuide: (guide: 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9') => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onOpenIntake?: () => void;
  onLoadDemoVideo?: () => void;
  smartZoom?: boolean;
  setSmartZoom?: (enabled: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoRef,
  videoSrc,
  videoDuration,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  activeClips,
  selectedClipId,
  setSelectedClipId,
  filter,
  overlay,
  aspectGuide,
  setAspectGuide,
  playbackSpeed,
  setPlaybackSpeed,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  onOpenIntake,
  onLoadDemoVideo,
  smartZoom,
  setSmartZoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedClip = activeClips.find((c) => c.id === selectedClipId);

  // Time format helper (MM:SS.ms)
  const formatTimecode = (sec: number) => {
    if (!sec || isNaN(sec) || sec < 0) return '00:00.00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current || !videoSrc) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Step Frame forward or backward (1/30 second)
  const stepFrame = (deltaFrames: number) => {
    if (!videoRef.current || !videoSrc) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const frameDuration = 1 / 30;
    const newTime = Math.max(0, Math.min(videoDuration, videoRef.current.currentTime + deltaFrames * frameDuration));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Rewind to start of selected clip or video
  const restartPlayback = () => {
    if (!videoRef.current || !videoSrc) return;
    const target = selectedClip ? selectedClip.startTime : 0;
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Auto-hide player controls on idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  const [localSmartZoom, setLocalSmartZoom] = useState<boolean>(false);
  const isSmartZoomEnabled = smartZoom !== undefined ? smartZoom : localSmartZoom;
  const handleToggleSmartZoom = () => {
    if (setSmartZoom) {
      setSmartZoom(!isSmartZoomEnabled);
    } else {
      setLocalSmartZoom(!localSmartZoom);
    }
  };

  // Filter CSS style calculation
  const getFilterStyle = (): React.CSSProperties => {
    switch (filter) {
      case 'warm':
        return { filter: 'sepia(0.3) saturate(1.3) brightness(1.05)' };
      case 'cool':
        return { filter: 'hue-rotate(185deg) saturate(1.1) brightness(1.02)' };
      case 'noir':
        return { filter: 'grayscale(1) contrast(1.25) brightness(0.95)' };
      case 'vintage':
        return { filter: 'sepia(0.55) contrast(1.15) brightness(0.9)' };
      case 'vibrant':
        return { filter: 'saturate(1.7) contrast(1.1)' };
      case 'cinema':
        return { filter: 'contrast(1.2) saturate(1.2) brightness(0.95)' };
      default:
        return {};
    }
  };

  // Subtle Ken Burns dynamic gradual zoom effect for talking heads & clip motion
  const getKenBurnsTransform = (): React.CSSProperties => {
    if (!isSmartZoomEnabled || !videoSrc) {
      return {
        transform: 'none',
        transformOrigin: '50% 38%',
        transition: 'transform 0.4s ease-out',
      };
    }

    // When playing a clip, zoom gradually from 1.0x to 1.12x throughout the clip
    if (selectedClip && selectedClip.endTime > selectedClip.startTime) {
      const clipDur = selectedClip.endTime - selectedClip.startTime;
      const elapsed = Math.max(0, Math.min(clipDur, currentTime - selectedClip.startTime));
      const rawProgress = elapsed / clipDur;
      // Gentle cosine ease for smooth acceleration and deceleration
      const zoomFactor = 1.0 + ((1 - Math.cos(rawProgress * Math.PI)) / 2) * 0.12;
      return {
        transform: `scale(${zoomFactor.toFixed(4)}) translateY(-1.2%)`,
        transformOrigin: '50% 38%',
        transition: isPlaying ? 'transform 0.25s linear' : 'transform 0.4s ease-out',
      };
    }

    // Default continuous organic Ken Burns breathing cycle (~10s)
    const cycleTime = 10;
    const cycleProgress = (currentTime % cycleTime) / cycleTime;
    const zoomFactor = 1.02 + ((1 - Math.cos(cycleProgress * 2 * Math.PI)) / 2) * 0.10;
    return {
      transform: `scale(${zoomFactor.toFixed(4)}) translateY(-1%)`,
      transformOrigin: '50% 38%',
      transition: isPlaying ? 'transform 0.25s linear' : 'transform 0.4s ease-out',
    };
  };

  // Aspect ratio guide frame styles
  const getAspectGuideStyle = (): React.CSSProperties => {
    if (aspectGuide === 'original') return { width: '100%', height: '100%' };
    if (aspectGuide === '16:9') return { aspectRatio: '16/9', maxHeight: '100%', maxWidth: '100%' };
    if (aspectGuide === '9:16') return { aspectRatio: '9/16', maxHeight: '100%', maxWidth: '100%' };
    if (aspectGuide === '1:1') return { aspectRatio: '1/1', maxHeight: '100%', maxWidth: '100%' };
    if (aspectGuide === '4:5') return { aspectRatio: '4/5', maxHeight: '100%', maxWidth: '100%' };
    if (aspectGuide === '21:9') return { aspectRatio: '21/9', maxHeight: '100%', maxWidth: '100%' };
    return { width: '100%', height: '100%' };
  };

  // Caption text position classes with safe 9:16 placement
  const getCaptionPositionClass = () => {
    if (aspectGuide === '9:16') {
      if (overlay.position === 'top') return 'top-8';
      if (overlay.position === 'middle') return 'bottom-20'; // Safe lower-third, never covers face in center
      return 'bottom-8';
    }
    if (overlay.position === 'top') return 'top-8';
    if (overlay.position === 'middle') return 'top-1/2 -translate-y-1/2';
    return 'bottom-16';
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full flex items-center justify-center bg-[#07070a] select-none overflow-hidden group"
    >
      {/* Video Content Frame with Aspect Ratio Guide */}
      <div
        style={getAspectGuideStyle()}
        className="relative flex items-center justify-center max-w-full max-h-full overflow-hidden transition-all duration-300"
      >
        <video
          ref={videoRef}
          src={videoSrc || undefined}
          style={{ ...getFilterStyle(), ...getKenBurnsTransform() }}
          className="w-full h-full object-contain pointer-events-auto"
          playsInline
        />

        {/* Smart Zoom Active Badge */}
        {isSmartZoomEnabled && (
          <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-950/85 border border-violet-500/40 text-violet-300 text-[10px] font-semibold backdrop-blur-md shadow-lg">
            <Sparkles className="w-3 h-3 text-violet-400 animate-spin-slow" />
            <span>Smart Zoom (Ken Burns)</span>
          </div>
        )}

        {/* Framing Guide Border if guide is not original */}
        {aspectGuide !== 'original' && (
          <div className="absolute inset-0 border-2 border-cyan-400/60 pointer-events-none rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between p-2">
            <span className="text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 w-fit">
              Framing {aspectGuide}
            </span>
          </div>
        )}

        {/* Live Caption / Viral Text Overlay */}
        {overlay.enabled && overlay.text.trim() && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 max-w-[90%] text-center px-4 py-2.5 rounded-2xl pointer-events-none transition-all flex flex-col items-center gap-1.5 shadow-2xl ${getCaptionPositionClass()}`}
            style={{
              backgroundColor: overlay.bgColor,
              color: overlay.textColor,
              fontSize: `${overlay.fontSize}px`,
              fontStyle: overlay.fontStyle === 'italic' ? 'italic' : 'normal',
              fontWeight: overlay.fontStyle === 'bold' ? '900' : '700',
              textShadow:
                overlay.presetStyle === 'tiktok_yellow'
                  ? '0 0 4px #000, 0 2px 8px rgba(0,0,0,0.95), 0 4px 12px rgba(0,0,0,0.9)'
                  : overlay.presetStyle === 'neon_glow'
                  ? '0 0 15px rgba(56, 189, 248, 0.8), 0 2px 6px rgba(0,0,0,0.9)'
                  : '0 2px 8px rgba(0,0,0,0.85)',
              WebkitTextStroke: overlay.presetStyle === 'tiktok_yellow' ? '1px black' : undefined,
              letterSpacing: overlay.presetStyle === 'tiktok_yellow' ? '0.02em' : 'normal',
            }}
          >
            {overlay.taglineBadge && (
              <span className="text-[11px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-black shadow-md uppercase mb-0.5">
                {overlay.taglineBadge}
              </span>
            )}
            {overlay.text.split('\n').map((line, i) => (
              <div key={i} className="leading-tight">{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State Banner if no video */}
      {!videoSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#07070a]/95 z-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-amber-500/20 border border-violet-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
            <Play className="w-8 h-8 ml-0.5" />
          </div>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-white mb-2">
            Studio Siap Memuat Video
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mb-6">
            Buka video dari perangkat Anda untuk otomatis dipotong menjadi klip viral, atau coba salah satu opsi cepat di bawah:
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {onOpenIntake && (
              <button
                onClick={onOpenIntake}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 flex items-center gap-2 transition cursor-pointer active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Pilih / Upload Video</span>
              </button>
            )}

            {onLoadDemoVideo && (
              <button
                onClick={onLoadDemoVideo}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 border border-white/15 text-cyan-300 flex items-center gap-2 transition cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Coba Video Demo 1-Klik</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Aspect Ratio Guide Switcher & Smart Zoom Toggle (Top Right) */}
      {videoSrc && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Smart Zoom Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSmartZoom}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer active:scale-95 shadow-md ${
              isSmartZoomEnabled
                ? 'bg-violet-600/35 border-violet-500/70 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.35)] ring-1 ring-violet-400/40'
                : 'glass-card border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Smart Zoom (Ken Burns): Efek zoom dinamis bertahap halus (1.0x - 1.12x) untuk gerakan alami kamera, sangat efektif untuk video pembicara / talking heads"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSmartZoomEnabled ? 'text-violet-400 fill-violet-400/30' : 'text-slate-400'}`} />
            <span>Smart Zoom</span>
            <span
              className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold ${
                isSmartZoomEnabled ? 'bg-violet-500 text-white' : 'bg-white/10 text-slate-400'
              }`}
            >
              {isSmartZoomEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Aspect Ratio Guide */}
          <div className="flex items-center gap-1.5 glass-card px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400 hidden sm:inline">Rasio:</span>
            <select
              value={aspectGuide}
              onChange={(e) => setAspectGuide(e.target.value as unknown as typeof aspectGuide)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="original" className="bg-[#181824] text-white">Asli (Fit)</option>
              <option value="16:9" className="bg-[#181824] text-white">16:9 (YouTube)</option>
              <option value="9:16" className="bg-[#181824] text-white">9:16 (TikTok/Reels)</option>
              <option value="1:1" className="bg-[#181824] text-white">1:1 (Instagram)</option>
              <option value="4:5" className="bg-[#181824] text-white">4:5 (Sosmed)</option>
              <option value="21:9" className="bg-[#181824] text-white">21:9 (Bioskop)</option>
            </select>
          </div>
        </div>
      )}

      {/* Floating Bottom Control Bar */}
      {videoSrc && (
        <div
          className={`absolute bottom-4 left-4 right-4 h-13 glass-panel rounded-2xl border border-white/10 px-4 flex items-center justify-between z-20 transition-opacity duration-300 shadow-2xl ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Left Controls: Play, Restart, Frame Step, Timecode */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 transition cursor-pointer active:scale-95"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={restartPlayback}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition cursor-pointer"
              title="Kembali ke Awal Klip"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

            <button
              onClick={() => stepFrame(-1)}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 hidden sm:flex items-center justify-center transition cursor-pointer"
              title="Mundur 1 Frame (Arrow Left)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 hidden sm:flex items-center justify-center transition cursor-pointer"
              title="Maju 1 Frame (Arrow Right)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Timecode display */}
            <div className="flex items-center gap-2 ml-2">
              <span className="font-mono text-xs text-white tabular-nums font-semibold">
                {formatTimecode(currentTime)}
              </span>
              <span className="text-slate-500 text-xs">/</span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {formatTimecode(videoDuration)}
              </span>
            </div>

            {selectedClip && (
              <span className="hidden md:inline-flex items-center gap-1.5 ml-3 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-mono text-violet-300">
                <span>{selectedClip.name}</span>
                <span>({formatTimecode(selectedClip.endTime - selectedClip.startTime)})</span>
              </span>
            )}
          </div>

          {/* Right Controls: Speed, Volume, Fullscreen */}
          <div className="flex items-center gap-2.5">
            {/* Smart Zoom Quick Toggle */}
            <button
              type="button"
              onClick={handleToggleSmartZoom}
              className={`hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                isSmartZoomEnabled
                  ? 'bg-violet-600/35 border-violet-500/60 text-violet-200 shadow-[0_0_10px_rgba(139,92,246,0.25)]'
                  : 'hover:bg-white/10 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Smart Zoom (Ken Burns Dynamic Zoom)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSmartZoomEnabled ? 'text-violet-400' : 'text-slate-400'}`} />
              <span className="text-[11px]">Smart Zoom</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 hidden md:inline">Kec:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-black/40 border border-white/10 rounded-lg text-xs px-2 py-1 text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
            </div>

            {/* Volume Control */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 accent-violet-400 cursor-pointer"
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-slate-300 flex items-center justify-center transition cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
