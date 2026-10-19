import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Flame,
  ShieldCheck,
  Tag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  Ban,
} from 'lucide-react';
import { VideoClip, ExportSettings, TextOverlay, ReframeMode, DEFAULT_ANTI_COPYRIGHT } from '../types';
import { AutoReframer } from '../utils/autoReframing';
import { renderVideoFrameWithEffects } from '../utils/exportEngine';

interface ClipPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: VideoClip | null;
  allClips: VideoClip[];
  onSelectClip: (clipId: string) => void;
  videoSrc: string | null;
  exportSettings: ExportSettings;
  overlay: TextOverlay;
  onUpdateClipTagline: (clipId: string, newTagline: string) => void;
  onDownloadClip: (clip: VideoClip) => void;
  isDownloading: boolean;
  reframeMode?: ReframeMode;
}

export const ClipPreviewModal: React.FC<ClipPreviewModalProps> = ({
  isOpen,
  onClose,
  clip,
  allClips,
  onSelectClip,
  videoSrc,
  exportSettings,
  overlay,
  onUpdateClipTagline,
  onDownloadClip,
  isDownloading,
  reframeMode = 'smart_auto',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [editedTagline, setEditedTagline] = useState('');

  const autoReframerRef = useRef<AutoReframer>(new AutoReframer({ mode: reframeMode }));

  // Find index of current clip
  const currentIdx = clip ? allClips.findIndex((c) => c.id === clip.id) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < allClips.length - 1;

  // Sync edited tagline when active clip changes
  useEffect(() => {
    if (clip) {
      setEditedTagline(clip.tagline ?? '');
    }
  }, [clip?.id, clip?.tagline]);

  // Setup video source and seek to clip start when opened or clip changes
  useEffect(() => {
    if (!isOpen || !videoSrc || !clip) return;

    const vid = videoRef.current;
    if (vid) {
      if (vid.src !== videoSrc) {
        vid.src = videoSrc;
      }
      vid.currentTime = clip.startTime;
      setCurrentTime(clip.startTime);
      vid.volume = isMuted ? 0 : volume;
      vid.muted = isMuted;

      // Autoplay clip preview when modal opens
      vid.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));

      autoReframerRef.current.reset(0.5, 0.5);
    }

    return () => {
      if (vid) {
        vid.pause();
      }
    };
  }, [isOpen, clip?.id, videoSrc]);

  // Keep playback loop strictly inside clip boundaries
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !clip) return;

    const handleTimeUpdate = () => {
      setCurrentTime(vid.currentTime);
      if (vid.currentTime >= clip.endTime) {
        // Loop clip cleanly
        vid.currentTime = clip.startTime;
      }
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, [clip?.startTime, clip?.endTime]);

  // Live Canvas 9:16 Render Loop
  useEffect(() => {
    if (!isOpen || !clip) return;

    let animId: number;
    let lastRenderTime = 0;

    const render = (now: number) => {
      const canvas = canvasRef.current;
      const vid = videoRef.current;

      if (canvas && vid && vid.readyState >= 1) {
        // Limit to ~30 FPS for battery and GPU efficiency
        if (!vid.paused && now - lastRenderTime < 32) {
          animId = requestAnimationFrame(render);
          return;
        }
        lastRenderTime = now;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = 360;
          const h = 640;
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }

          const currentClipTagline = (editedTagline !== undefined ? editedTagline : (clip.tagline ?? '')).trim();
          const currentBadge = clip.taglineBadge || overlay.taglineBadge;

          const effectiveSettings: ExportSettings = {
            ...exportSettings,
            aspectRatio: '9:16',
            fitMode: 'crop',
            antiCopyright: exportSettings.antiCopyright || DEFAULT_ANTI_COPYRIGHT,
            reframeMode,
            overlay: {
              ...overlay,
              enabled: Boolean(currentClipTagline),
              text: currentClipTagline,
              taglineBadge: currentClipTagline ? (currentBadge || '🔥 VIRAL HOOK') : '',
              presetStyle: 'tiktok_yellow',
            },
          };

          let cam = autoReframerRef.current.getState();
          if (!vid.paused) {
            cam = autoReframerRef.current.update(vid);
          }

          renderVideoFrameWithEffects(
            ctx,
            vid,
            w,
            h,
            effectiveSettings,
            currentClipTagline,
            currentBadge,
            { x: cam.currentFocalX, y: cam.currentFocalY }
          );
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, clip, editedTagline, exportSettings, overlay, reframeMode]);

  if (!isOpen || !clip) return null;

  const clipDuration = Math.max(0.1, clip.endTime - clip.startTime);
  const timeInClip = Math.max(0, currentTime - clip.startTime);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      if (vid.currentTime >= clip.endTime || vid.currentTime < clip.startTime) {
        vid.currentTime = clip.startTime;
      }
      vid.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const restartClip = () => {
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = clip.startTime;
      vid.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleScrub = (targetSec: number) => {
    const vid = videoRef.current;
    if (vid) {
      vid.currentTime = targetSec;
      setCurrentTime(targetSec);
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (vid) {
      const nextMuted = !isMuted;
      vid.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const vid = videoRef.current;
    if (vid) {
      vid.volume = newVol;
      vid.muted = newVol === 0;
      setVolume(newVol);
      setIsMuted(newVol === 0);
    }
  };

  const handleApplySuggestion = (sug: string) => {
    setEditedTagline(sug);
    onUpdateClipTagline(clip.id, sug);
  };

  const formatSec = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-hidden animate-fade-in">
      {/* Hidden source video for preview canvas */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        className="hidden"
      />

      <div className="glass-panel w-full max-w-4xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[92vh] bg-[#0c0c14]/98">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <Eye className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-sm text-white">
                  Pratinjau Hasil Klip Video
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  #{currentIdx + 1} dari {allClips.length}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Anti-Copyright FB Ready</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tonton video hasil crop 9:16 dan tegline hook sebelum mendownload file
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
            title="Tutup Pratinjau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* LEFT: 9:16 Video Player Frame (md:col-span-6) */}
          <div className="md:col-span-6 flex flex-col space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl aspect-[9/16] max-h-[460px] mx-auto flex items-center justify-center w-full group">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {/* Top status indicator inside canvas */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/70 text-amber-300 border border-amber-500/30 backdrop-blur-sm flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-amber-400" />
                  <span>{clip.name}</span>
                </span>
              </div>

              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Safe Zone 9:16</span>
                </span>
              </div>

              {/* Floating Play Button if paused */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl cursor-pointer transition hover:scale-110 active:scale-95 z-20"
                  title="Putar Klip"
                >
                  <Play className="w-7 h-7 ml-1 fill-current" />
                </button>
              )}
            </div>

            {/* Playback Controls Bar */}
            <div className="glass-card rounded-2xl p-3 border border-white/10 bg-black/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 flex items-center justify-center cursor-pointer transition border border-amber-500/30"
                    title={isPlaying ? 'Jeda' : 'Putar'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <button
                    onClick={restartClip}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer transition border border-white/5"
                    title="Ulangi klip dari awal"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Timecode display */}
                <span className="text-xs font-mono font-bold text-slate-200">
                  {formatSec(timeInClip)} / {formatSec(clipDuration)}
                </span>

                {/* Volume Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleMute}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition border ${
                      isMuted
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                    title={isMuted ? 'Nyalakan Suara' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-16 accent-emerald-400 cursor-pointer h-1.5"
                    title="Volume Video"
                  />
                </div>
              </div>

              {/* Scrubber timeline slider */}
              <input
                type="range"
                min={clip.startTime}
                max={clip.endTime}
                step="0.05"
                value={currentTime}
                onChange={(e) => handleScrub(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5"
              />
            </div>
          </div>

          {/* RIGHT: Clip Info, Taglines, and Actions (md:col-span-6) */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              {/* Clip Title & Badges */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {clip.viralScore && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>{clip.viralScore}% Potensi FYP</span>
                    </span>
                  )}
                  {clip.taglineBadge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/25 text-violet-300 border border-violet-500/35 font-bold">
                      {clip.taglineBadge}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Durasi: {clipDuration.toFixed(1)} detik
                  </span>
                </div>
                <h2 className="text-base font-bold text-white leading-snug">
                  {clip.name}
                </h2>
              </div>

              {/* Alasan Momen Viral & Pacing */}
              {clip.reason && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 font-bold block mb-0.5">Alasan Momen Viral:</strong>
                    <span>{clip.reason}</span>
                  </div>
                </div>
              )}

              {/* Tagline Sesuai Isi Video & Quick 1-Click Selectors */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tegline Klip (Sesuai Isi Video):</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Live Preview di Video</span>
                </div>

                {/* Direct Editable Tagline */}
                <input
                  type="text"
                  value={editedTagline}
                  onChange={(e) => {
                    setEditedTagline(e.target.value);
                    onUpdateClipTagline(clip.id, e.target.value);
                  }}
                  placeholder="Ketik tegline untuk video ini..."
                  className="w-full text-xs font-bold text-yellow-300 bg-black/70 border border-amber-500/40 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-400 transition"
                />

                {/* 1-Click Alternative Tagline Chips */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                    <span>⚡ Pilihan Cepat Tegline:</span>
                    {editedTagline && (
                      <button
                        type="button"
                        onClick={() => handleApplySuggestion('')}
                        className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition flex items-center gap-1"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Hapus Tegline</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Opsi Tanpa Tegline */}
                    <button
                      type="button"
                      onClick={() => handleApplySuggestion('')}
                      className={`text-[11px] px-2.5 py-1 rounded-xl border text-left transition cursor-pointer flex items-center gap-1 ${
                        !editedTagline
                          ? 'bg-rose-500/25 text-rose-200 border-rose-500/50 font-bold shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10'
                      }`}
                      title="Simpan video tanpa teks tegline (video bersih)"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>🚫 Tanpa Tegline</span>
                    </button>

                    {clip.suggestedTaglines && clip.suggestedTaglines.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleApplySuggestion(sug)}
                        className={`text-[11px] px-2.5 py-1 rounded-xl border text-left transition cursor-pointer ${
                          editedTagline === sug
                            ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 font-bold shadow-sm'
                            : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prev / Next Clip Switcher */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-white/5 border border-white/5 text-xs">
                <button
                  onClick={() => hasPrev && onSelectClip(allClips[currentIdx - 1].id)}
                  disabled={!hasPrev}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Klip Sebelumnya</span>
                </button>

                <span className="text-[11px] text-slate-400 font-mono">
                  {currentIdx + 1} / {allClips.length}
                </span>

                <button
                  onClick={() => hasNext && onSelectClip(allClips[currentIdx + 1].id)}
                  disabled={!hasNext}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition font-medium"
                >
                  <span>Klip Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Actions: Direct Download Button */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <button
                onClick={() => onDownloadClip(clip)}
                disabled={isDownloading}
                className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>
                  {isDownloading
                    ? 'Sedang Memproses Render & Download...'
                    : `Download Klip Ini Sekarang (${clipDuration.toFixed(1)}s)`}
                </span>
              </button>
              <p className="text-[10px] text-slate-400 text-center">
                ✨ File video yang didownload memiliki rasio 9:16, tegline yang Anda pilih, dan proteksi Anti-Copyright FB.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
