import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  Film,
  Sparkles,
  Layers,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Eye,
  CheckSquare,
  Square,
  Flame,
  Check,
  Smartphone,
  Maximize2,
  Sliders,
  ShieldCheck,
  Shield,
  Zap,
  Camera,
  UserCheck,
  Crosshair,
} from 'lucide-react';
import { ExportSettings, VideoClip, AntiCopyrightSettings, DEFAULT_ANTI_COPYRIGHT, ReframeMode } from '../types';
import { AutoReframer } from '../utils/autoReframing';
import {
  renderClipsToVideo,
  RenderProgress,
  getOutputDimensions,
  calculateFrameLayout,
  applyFilterToContext,
  drawTextOverlay,
  renderVideoFrameWithEffects,
} from '../utils/exportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoElement: HTMLVideoElement | null;
  clips: VideoClip[];
  settings: ExportSettings;
  setSettings: React.Dispatch<React.SetStateAction<ExportSettings>>;
  onSaveHistory: (title: string, duration: number, clipCount: number) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoElement,
  clips,
  settings,
  setSettings,
  onSaveHistory,
}) => {
  // Clip selection state before download
  const [selectedClipIds, setSelectedClipIds] = useState<Set<string>>(() => new Set(clips.map((c) => c.id)));
  const [activePreviewClipId, setActivePreviewClipId] = useState<string>(() => clips[0]?.id || '');

  // Real-time preview player state
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewTime, setPreviewTime] = useState<number>(0);
  const [isPreviewMuted, setIsPreviewMuted] = useState<boolean>(false);
  const [previewVolume, setPreviewVolume] = useState<number>(1.0);

  // Render & export state
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [exportResult, setExportResult] = useState<{
    blob: Blob;
    url: string;
    filename: string;
  } | null>(null);
  const [exportMode, setExportMode] = useState<'stitched' | 'individual' | 'single'>('stitched');
  const [renderError, setRenderError] = useState<string | null>(null);

  // Anti-Copyright settings accessor
  const antiSettings: AntiCopyrightSettings = settings.antiCopyright || DEFAULT_ANTI_COPYRIGHT;

  const updateAntiSettings = (partial: Partial<AntiCopyrightSettings>) => {
    setSettings((prev) => ({
      ...prev,
      antiCopyright: {
        ...(prev.antiCopyright || DEFAULT_ANTI_COPYRIGHT),
        ...partial,
      },
    }));
  };

  // Sync selectedClipIds if clips change
  useEffect(() => {
    if (clips.length > 0) {
      setSelectedClipIds((prev) => {
        const next = new Set<string>();
        clips.forEach((c) => {
          if (prev.has(c.id) || prev.size === 0) next.add(c.id);
        });
        if (next.size === 0) clips.forEach((c) => next.add(c.id));
        return next;
      });
      if (!activePreviewClipId || !clips.some((c) => c.id === activePreviewClipId)) {
        setActivePreviewClipId(clips[0].id);
      }
    }
  }, [clips]);

  const currentPreviewClip = clips.find((c) => c.id === activePreviewClipId) || clips[0] || null;

  // Initialize and load preview video source
  useEffect(() => {
    if (isOpen && videoElement && previewVideoRef.current) {
      const pVid = previewVideoRef.current;
      if (pVid.src !== videoElement.src) {
        pVid.src = videoElement.src;
      }
      if (currentPreviewClip) {
        pVid.currentTime = currentPreviewClip.startTime;
        setPreviewTime(currentPreviewClip.startTime);
      }
    }
  }, [isOpen, videoElement, activePreviewClipId]);

  const autoReframerRef = useRef<AutoReframer>(
    new AutoReframer({
      mode: settings.reframeMode || 'smart_auto',
      smoothing: settings.reframeSmoothing || 0.12,
      manualX: settings.manualFocalX,
    })
  );

  useEffect(() => {
    autoReframerRef.current.updateConfig({
      mode: settings.reframeMode || 'smart_auto',
      smoothing: settings.reframeSmoothing || 0.12,
      manualX: settings.manualFocalX,
    });
  }, [settings.reframeMode, settings.reframeSmoothing, settings.manualFocalX]);

  // Real-time canvas render loop for WYSIWYG preview
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;

    const renderFrame = () => {
      const pCanvas = previewCanvasRef.current;
      const pVideo = previewVideoRef.current;

      if (pCanvas && pVideo && pVideo.readyState >= 1) {
        const vW = pVideo.videoWidth || 1280;
        const vH = pVideo.videoHeight || 720;
        const ctx = pCanvas.getContext('2d');

        if (ctx) {
          const dims = getOutputDimensions(
            settings.resolution,
            settings.aspectRatio,
            vW,
            vH
          );

          if (pCanvas.width !== dims.width || pCanvas.height !== dims.height) {
            pCanvas.width = dims.width;
            pCanvas.height = dims.height;
          }

          const activeClip = clips.find((c) => c.id === activePreviewClipId) || clips[0];
          let focalPoint = { x: 0.5, y: 0.5 };
          if (settings.aspectRatio === '9:16' && settings.fitMode === 'crop') {
            const cam = autoReframerRef.current.update(pVideo);
            focalPoint = { x: cam.currentFocalX, y: cam.currentFocalY };
          }

          renderVideoFrameWithEffects(
            ctx,
            pVideo,
            dims.width,
            dims.height,
            settings,
            activeClip?.tagline || settings.overlay.text,
            activeClip?.taglineBadge || settings.overlay.taglineBadge,
            focalPoint
          );
        }

        // Loop handling when playing
        const activeClip = clips.find((c) => c.id === activePreviewClipId) || clips[0];
        if (activeClip && !pVideo.paused) {
          setPreviewTime(pVideo.currentTime);
          if (pVideo.currentTime >= activeClip.endTime) {
            pVideo.currentTime = activeClip.startTime;
          }
        }
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, settings, activePreviewClipId, clips]);

  if (!isOpen) return null;

  // Toggle clip inclusion
  const toggleClipSelection = (id: string) => {
    setSelectedClipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllClips = () => {
    setSelectedClipIds(new Set(clips.map((c) => c.id)));
  };

  const deselectAllClips = () => {
    if (clips.length > 0) {
      setSelectedClipIds(new Set([clips[0].id]));
    }
  };

  // Preview controls
  const togglePreviewPlay = () => {
    const pVid = previewVideoRef.current;
    if (!pVid) return;

    if (pVid.paused) {
      pVid.muted = isPreviewMuted;
      pVid.volume = previewVolume;
      pVid.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
    } else {
      pVid.pause();
      setIsPreviewPlaying(false);
    }
  };

  const restartPreviewClip = () => {
    const pVid = previewVideoRef.current;
    if (!pVid || !currentPreviewClip) return;
    pVid.currentTime = currentPreviewClip.startTime;
    setPreviewTime(currentPreviewClip.startTime);
  };

  const handlePreviewScrub = (time: number) => {
    const pVid = previewVideoRef.current;
    if (!pVid || !currentPreviewClip) return;
    const clamped = Math.max(currentPreviewClip.startTime, Math.min(currentPreviewClip.endTime, time));
    pVid.currentTime = clamped;
    setPreviewTime(clamped);
  };

  const togglePreviewMute = () => {
    const pVid = previewVideoRef.current;
    if (!pVid) return;
    const nextMuted = !isPreviewMuted;
    setIsPreviewMuted(nextMuted);
    pVid.muted = nextMuted;
  };

  const handlePreviewVolumeChange = (vol: number) => {
    const pVid = previewVideoRef.current;
    if (!pVid) return;
    setPreviewVolume(vol);
    pVid.volume = vol;
    if (vol > 0 && isPreviewMuted) {
      setIsPreviewMuted(false);
      pVid.muted = false;
    }
  };

  // Switch active preview clip
  const switchPreviewClip = (clip: VideoClip) => {
    setActivePreviewClipId(clip.id);
    const pVid = previewVideoRef.current;
    if (pVid) {
      pVid.currentTime = clip.startTime;
      setPreviewTime(clip.startTime);
      if (isPreviewPlaying) {
        pVid.play().catch(() => {});
      }
    }
  };

  // Calculate target clips based on mode
  const effectiveClipsToExport: VideoClip[] =
    exportMode === 'single'
      ? currentPreviewClip ? [currentPreviewClip] : []
      : clips.filter((c) => selectedClipIds.has(c.id));

  const totalExportDuration = effectiveClipsToExport.reduce(
    (acc, c) => acc + (c.endTime - c.startTime),
    0
  );

  // Trigger export
  const startExport = async (singleClipOverride?: VideoClip) => {
    if (!videoElement) {
      setRenderError('Video element tidak siap.');
      return;
    }

    const targetClips = singleClipOverride
      ? [singleClipOverride]
      : effectiveClipsToExport;

    if (targetClips.length === 0) {
      setRenderError('Tidak ada klip yang dipilih untuk diexport.');
      return;
    }

    // Pause preview player during export to free resources
    if (previewVideoRef.current && !previewVideoRef.current.paused) {
      previewVideoRef.current.pause();
      setIsPreviewPlaying(false);
    }

    setIsRendering(true);
    setRenderError(null);
    setExportResult(null);

    try {
      if (exportMode === 'individual' && !singleClipOverride && targetClips.length > 1) {
        // Render each clip one by one
        for (let i = 0; i < targetClips.length; i++) {
          const singleClip = targetClips[i];
          const res = await renderClipsToVideo(
            videoElement,
            [singleClip],
            settings,
            (prog) => {
              setRenderProgress({
                ...prog,
                status: `Merender klip ${i + 1}/${targetClips.length} (${singleClip.name})...`,
              });
            }
          );

          // Download each file
          const url = URL.createObjectURL(res.blob);
          const a = document.createElement('a');
          a.href = url;
          const cleanName = (singleClip.name || `clip_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
          a.download = `cliprush_${cleanName}_${i + 1}.${settings.format === 'webm' ? 'webm' : 'mp4'}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }

        setExportResult({
          blob: new Blob([]),
          url: '',
          filename: `Semua ${targetClips.length} klip pilihan berhasil diunduh.`,
        });
      } else {
        // Combined stitched or single clip
        const result = await renderClipsToVideo(
          videoElement,
          targetClips,
          settings,
          (prog) => setRenderProgress(prog)
        );

        const url = URL.createObjectURL(result.blob);
        setExportResult({
          blob: result.blob,
          url,
          filename: result.filename,
        });

        // Trigger auto download
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Record history
        onSaveHistory(
          result.filename,
          targetClips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0) / (settings.playbackSpeed || 1),
          targetClips.length
        );
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Export error:', error);
      setRenderError(error.message || 'Gagal memproses render video.');
    } finally {
      setIsRendering(false);
    }
  };

  const formatSec = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-hidden">
      {/* Hidden preview video for canvas drawing */}
      <video
        ref={previewVideoRef}
        playsInline
        preload="auto"
        className="hidden"
      />

      <div className="glass-panel w-full max-w-5xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white shadow-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-white">Export & Download Video</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Real-Time Studio
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pratinjau langsung, pilih klip yang diinginkan, framing 9:16 rapi, suara utuh tidak dimute
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRendering}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer disabled:opacity-30 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Split into Left (Live Preview) and Right (Options & Clip Picker) */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* ================= LEFT COLUMN: REAL-TIME PREVIEW PLAYER (5 cols) ================= */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Pratinjau Real-Time (WYSIWYG)</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {settings.aspectRatio} • {settings.fitMode}
              </span>
            </div>

            {/* Interactive Preview Canvas Frame */}
            <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl aspect-[9/16] max-h-[380px] sm:max-h-[420px] mx-auto flex items-center justify-center group w-full">
              <canvas
                ref={previewCanvasRef}
                className="w-full h-full object-contain"
              />

              {/* Top watermark badge */}
              <div className="absolute top-2.5 left-2.5 pointer-events-none">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-slate-300 border border-white/10 backdrop-blur-sm">
                  Klip: {currentPreviewClip?.name || 'Utuh'}
                </span>
              </div>

              {/* 9:16 safe framing badge indicator */}
              {settings.aspectRatio === '9:16' && (
                <div className="absolute top-2.5 right-2.5 pointer-events-none">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Safe 9:16</span>
                  </span>
                </div>
              )}

              {/* Floating Center Play Button if paused */}
              {!isPreviewPlaying && (
                <button
                  onClick={togglePreviewPlay}
                  className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-violet-600/80 hover:bg-violet-600 text-white flex items-center justify-center shadow-xl cursor-pointer transition hover:scale-110 active:scale-95"
                  title="Putar Pratinjau"
                >
                  <Play className="w-6 h-6 ml-0.5" />
                </button>
              )}
            </div>

            {/* Player Controls Bar */}
            <div className="glass-card rounded-xl p-3 border border-white/10 bg-black/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePreviewPlay}
                    className="w-7 h-7 rounded-lg bg-violet-600/40 hover:bg-violet-600 text-white flex items-center justify-center cursor-pointer transition"
                    title={isPreviewPlaying ? 'Jeda' : 'Putar'}
                  >
                    {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                  <button
                    onClick={restartPreviewClip}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer transition"
                    title="Ulangi klip dari awal"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Timecode within active clip */}
                <span className="text-[11px] font-mono text-slate-400">
                  {currentPreviewClip
                    ? `${formatSec(Math.max(0, previewTime - currentPreviewClip.startTime))} / ${formatSec(currentPreviewClip.endTime - currentPreviewClip.startTime)}`
                    : '00:00'}
                </span>

                {/* Audio controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={togglePreviewMute}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition ${
                      isPreviewMuted
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-white/5 hover:bg-white/15 text-slate-300'
                    }`}
                    title={isPreviewMuted ? 'Aktifkan Suara' : 'Mute Suara'}
                  >
                    {isPreviewMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isPreviewMuted ? 0 : previewVolume}
                    onChange={(e) => handlePreviewVolumeChange(parseFloat(e.target.value))}
                    className="w-14 accent-emerald-400 cursor-pointer h-1"
                    title="Volume Pratinjau"
                  />
                </div>
              </div>

              {/* Scrubber slider for preview clip */}
              {currentPreviewClip && (
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={currentPreviewClip.startTime}
                    max={currentPreviewClip.endTime}
                    step="0.05"
                    value={previewTime}
                    onChange={(e) => handlePreviewScrub(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5"
                  />
                </div>
              )}

              {/* Audio & Motion Quality Reassurance */}
              <div className="text-[10px] text-emerald-400 flex items-center gap-1.5 pt-1">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Suara video aktif 100% (tidak dimute) & gerakan sinkron saat export</span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: CLIP SELECTION & EXPORT SETTINGS (7 cols) ================= */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active Result Banner */}
            {exportResult && (
              <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/20 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-emerald-300 text-sm">
                    Video Siap Diunduh!
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">{exportResult.filename}</p>
                </div>

                {exportResult.url && (
                  <div className="max-w-xs mx-auto aspect-video rounded-xl overflow-hidden border border-white/10 bg-black">
                    <video src={exportResult.url} controls className="w-full h-full object-contain" />
                  </div>
                )}

                {exportResult.url && (
                  <a
                    href={exportResult.url}
                    download={exportResult.filename}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Ulang File</span>
                  </a>
                )}
              </div>
            )}

            {/* Render Progress Overlay */}
            {isRendering && renderProgress && (
              <div className="glass-card rounded-2xl p-4 border border-cyan-500/30 bg-cyan-950/20 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>{renderProgress.status}</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {renderProgress.percent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-200"
                    style={{ width: `${renderProgress.percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Estimasi sisa waktu: {renderProgress.timeRemaining || 'menghitung...'}</span>
                  <span>
                    Klip {renderProgress.currentClipIndex || 1} / {renderProgress.totalClips || effectiveClipsToExport.length}
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {renderError && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{renderError}</span>
              </div>
            )}

            {/* 1. SELEKSI HASIL KLIP SEBELUM DOWNLOAD */}
            <div className="glass-card rounded-2xl p-4 border border-white/10 bg-black/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span>Pilihan Klip Sebelum Download</span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Pilih klip yang ingin diexport atau klik tombol pratinjau untuk melihat hasilnya
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={selectAllClips}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] font-semibold transition"
                  >
                    Pilih Semua
                  </button>
                  <button
                    onClick={deselectAllClips}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] transition"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Clip List with Checkbox & Live Preview Button */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {clips.map((clip, idx) => {
                  const isChecked = selectedClipIds.has(clip.id);
                  const isCurrentPreview = clip.id === activePreviewClipId;
                  const durationSec = Math.max(0, clip.endTime - clip.startTime);

                  return (
                    <div
                      key={clip.id}
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                        isCurrentPreview
                          ? 'border-cyan-500/60 bg-cyan-950/20 shadow-sm'
                          : isChecked
                          ? 'border-white/15 bg-white/5'
                          : 'border-white/5 bg-black/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleClipSelection(clip.id)}
                          className="text-slate-400 hover:text-cyan-400 cursor-pointer shrink-0"
                          title={isChecked ? 'Keluarkan dari export' : 'Masukkan ke export'}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[200px]">
                              {idx + 1}. {clip.name}
                            </span>
                            {clip.viralScore && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />
                                {clip.viralScore}
                              </span>
                            )}
                            {clip.taglineBadge && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                {clip.taglineBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>
                              {formatSec(clip.startTime)} - {formatSec(clip.endTime)} ({durationSec.toFixed(1)}s)
                            </span>
                            {clip.tagline && (
                              <span className="text-slate-500 truncate max-w-[150px] italic">
                                "{clip.tagline}"
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons per clip */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => switchPreviewClip(clip)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition ${
                            isCurrentPreview
                              ? 'bg-cyan-500 text-slate-950 shadow-md'
                              : 'bg-white/5 hover:bg-white/15 text-slate-300'
                          }`}
                          title="Lihat Pratinjau Klip Ini"
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isCurrentPreview ? 'Sedang Tampil' : 'Lihat'}</span>
                        </button>

                        <button
                          onClick={() => startExport(clip)}
                          disabled={isRendering}
                          className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30 cursor-pointer transition disabled:opacity-30"
                          title="Download Hanya Klip Ini Sekarang"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selection Summary */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
                <span>
                  Terpilih: <strong className="text-cyan-300">{effectiveClipsToExport.length}</strong> dari {clips.length} klip
                </span>
                <span>
                  Total Durasi: <strong className="text-white">{totalExportDuration.toFixed(1)}s</strong>
                </span>
              </div>
            </div>

            {/* 2. MODE OUTPUT EXPORT */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setExportMode('stitched')}
                disabled={isRendering}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                  exportMode === 'stitched'
                    ? 'bg-violet-600/30 border-cyan-400 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-cyan-400" />
                  <span>1 Video Utuh (Stitched)</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Gabungkan semua {effectiveClipsToExport.length} klip menjadi 1 video bersambung.
                </div>
              </button>

              <button
                onClick={() => setExportMode('individual')}
                disabled={isRendering}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                  exportMode === 'individual'
                    ? 'bg-violet-600/30 border-cyan-400 text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-violet-400" />
                  <span>Klip Terpisah (Batch)</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Unduh setiap klip yang dipilih sebagai file independen satu per satu.
                </div>
              </button>
            </div>

            {/* 3. PRESET RASIO ASPEK (PLATFORM TARGET) */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Rasio Aspek Platform (Target Format)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: '9:16', label: '9:16 TikTok', desc: 'Shorts/Reels' },
                  { id: '16:9', label: '16:9 YouTube', desc: 'Landscape' },
                  { id: '1:1', label: '1:1 Square', desc: 'Instagram' },
                  { id: '4:5', label: '4:5 Feed', desc: 'Portrait' },
                  { id: '21:9', label: '21:9 Bioskop', desc: 'Cinematic' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        aspectRatio: r.id as ExportSettings['aspectRatio'],
                      }))
                    }
                    disabled={isRendering}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      settings.aspectRatio === r.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md'
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{r.id}</div>
                    <div className="text-[9px] text-slate-400 truncate">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. FRAMING & POSISI TAGLINE (NEVER COVER VIDEO) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Mode Framing Layar
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'blur', label: 'Blur', desc: 'Latar blur' },
                    { id: 'letterbox', label: 'Box', desc: 'Bilah hitam' },
                    { id: 'crop', label: 'Crop', desc: 'Isi penuh' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          fitMode: f.id as ExportSettings['fitMode'],
                        }))
                      }
                      className={`p-1.5 rounded-lg border text-center text-xs transition cursor-pointer ${
                        settings.fitMode === f.id
                          ? 'bg-violet-600/30 border-violet-400 text-white'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{f.label}</div>
                      <div className="text-[8px] text-slate-400">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Posisi Tagline / Teks
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'top', label: 'Atas (Safe)', desc: 'Header aman' },
                    { id: 'bottom', label: 'Bawah (Safe)', desc: 'Footer aman' },
                    { id: 'middle', label: 'Tengah', desc: 'Subjudul' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          overlay: {
                            ...prev.overlay,
                            position: p.id as 'top' | 'middle' | 'bottom',
                          },
                        }))
                      }
                      className={`p-1.5 rounded-lg border text-center text-xs transition cursor-pointer ${
                        settings.overlay.position === p.id
                          ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{p.label}</div>
                      <div className="text-[8px] text-slate-400">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. RESOLUSI & FORMAT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Resolusi Output
                </label>
                <select
                  value={settings.resolution}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      resolution: e.target.value as ExportSettings['resolution'],
                    }))
                  }
                  disabled={isRendering}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="1080p">1080p (Full HD Viral)</option>
                  <option value="720p">720p (HD Rekomendasi Cepat)</option>
                  <option value="480p">480p (SD Ringan)</option>
                  <option value="360p">360p (Hemat Ukuran)</option>
                  <option value="original">Resolusi Asli Video</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Format Video
                </label>
                <select
                  value={settings.format}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      format: e.target.value as ExportSettings['format'],
                    }))
                  }
                  disabled={isRendering}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="mp4">MP4 (H.264 Universal)</option>
                  <option value="webm">WebM (VP9 Modern Web)</option>
                </select>
              </div>
            </div>

            {/* AUTO-REFRAMING 9:16 (PAN & SCAN) */}
            <div className="glass-card rounded-2xl p-3 border border-cyan-500/30 bg-cyan-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auto-Reframing Pan & Scan 9:16</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  {settings.reframeMode === 'speaker' ? 'Fokus Pembicara' : settings.reframeMode === 'action' ? 'Fokus Aksi' : settings.reframeMode === 'center' ? 'Kunci Tengah' : 'Auto Cerdas'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'smart_auto' as ReframeMode, label: '🎯 Auto Cerdas' },
                  { id: 'speaker' as ReframeMode, label: '👤 Pembicara' },
                  { id: 'action' as ReframeMode, label: '⚡ Aksi' },
                  { id: 'center' as ReframeMode, label: '📍 Tengah' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSettings((prev) => ({ ...prev, reframeMode: m.id }))}
                    className={`py-1.5 px-1 rounded-xl border text-[11px] font-medium transition cursor-pointer text-center ${
                      (settings.reframeMode || 'smart_auto') === m.id
                        ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold'
                        : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. PROTEKSI ANTI-COPYRIGHT FACEBOOK & REELS */}
            <div className="glass-card rounded-2xl p-3 border border-blue-500/30 bg-blue-950/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">Proteksi Anti-Copyright FB</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                      antiSettings.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/10 text-slate-400 border-white/10'
                    }`}
                  >
                    {antiSettings.enabled ? 'SHIELD AKTIF' : 'NONAKTIF'}
                  </span>
                </div>

                <button
                  onClick={() => updateAntiSettings({ enabled: !antiSettings.enabled })}
                  disabled={isRendering}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1 border ${
                    antiSettings.enabled
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
                      : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/15'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>{antiSettings.enabled ? 'Aktif' : 'Aktifkan'}</span>
                </button>
              </div>

              {antiSettings.enabled && (
                <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
                  <button
                    onClick={() => updateAntiSettings({ flipHorizontal: !antiSettings.flipHorizontal })}
                    className={`p-1.5 rounded-lg border text-center transition cursor-pointer ${
                      antiSettings.flipHorizontal
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Mirror {antiSettings.flipHorizontal ? '✓' : '✗'}</div>
                    <div className="text-[8px] text-slate-400">Balik Video</div>
                  </button>

                  <button
                    onClick={() => updateAntiSettings({ microSpeed: !antiSettings.microSpeed })}
                    className={`p-1.5 rounded-lg border text-center transition cursor-pointer ${
                      antiSettings.microSpeed
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Tempo 1.02x {antiSettings.microSpeed ? '✓' : '✗'}</div>
                    <div className="text-[8px] text-slate-400">Pecah Hash Audio</div>
                  </button>

                  <button
                    onClick={() => updateAntiSettings({ audioEqShift: !antiSettings.audioEqShift })}
                    className={`p-1.5 rounded-lg border text-center transition cursor-pointer ${
                      antiSettings.audioEqShift
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <div className="font-bold">Audio EQ {antiSettings.audioEqShift ? '✓' : '✗'}</div>
                    <div className="text-[8px] text-slate-400">Anti-Fingerprint</div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400">
            {effectiveClipsToExport.length} Klip terpilih (Total ~{totalExportDuration.toFixed(1)}s)
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isRendering}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition"
            >
              Tutup
            </button>
            <button
              onClick={() => startExport()}
              disabled={isRendering || effectiveClipsToExport.length === 0}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 ${isRendering ? 'animate-bounce' : ''}`} />
              <span>
                {isRendering
                  ? 'Sedang Merender...'
                  : `Render & Download (${effectiveClipsToExport.length} Klip)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
