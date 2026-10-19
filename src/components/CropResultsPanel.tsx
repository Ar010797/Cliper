import React, { useState, useRef, useEffect } from 'react';
import {
  Flame,
  Play,
  Pause,
  Download,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Scissors,
  CheckCircle2,
  Sliders,
  Type,
  TrendingUp,
  RefreshCw,
  Eye,
  Check,
  ShieldCheck,
  Layers,
  Filter,
  Shield,
  Zap,
  Tag,
  Radio,
  FileVideo,
  Clock,
  Sparkle,
  SlidersHorizontal,
  Camera,
  Crosshair,
  Target,
  UserCheck,
  MoveHorizontal,
  Ban,
} from 'lucide-react';
import {
  ExportSettings,
  TextOverlay,
  VideoClip,
  ViralMoment,
  ViralTopic,
  AntiCopyrightSettings,
  DEFAULT_ANTI_COPYRIGHT,
  MomentDurationMode,
  ReframeMode,
} from '../types';
import { AutoReframer, DetectedSubject } from '../utils/autoReframing';
import {
  VIRAL_TOPICS,
  detectViralMoments,
  convertViralMomentsToClips,
  extractContextFromTitle,
  generateTaglinesForMoment,
  fetchGeminiViralMoments,
} from '../utils/viralClipper';
import {
  renderClipsToVideo,
  RenderProgress,
  getOutputDimensions,
  renderVideoFrameWithEffects,
} from '../utils/exportEngine';
import { triggerSafeDownload } from '../utils/downloadHelper';
import { ClipPreviewModal } from './ClipPreviewModal';

interface CropResultsPanelProps {
  videoElement: HTMLVideoElement | null;
  videoSrc: string | null;
  duration: number;
  waveformPeaks: number[];
  clips: VideoClip[];
  setClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  selectedClipId: string;
  setSelectedClipId: (id: string) => void;
  overlay: TextOverlay;
  setOverlay: React.Dispatch<React.SetStateAction<TextOverlay>>;
  exportSettings: ExportSettings;
  setExportSettings: React.Dispatch<React.SetStateAction<ExportSettings>>;
  onOpenExportModal: () => void;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
  selectedTopic: ViralTopic;
  setSelectedTopic: (topic: ViralTopic) => void;
  customKeyword: string;
  setCustomKeyword: (kw: string) => void;
  projectName?: string;
  soundSegments?: { start: number; end: number }[];
  silenceSegments?: { start: number; end: number }[];
}

export const CropResultsPanel: React.FC<CropResultsPanelProps> = ({
  videoElement,
  videoSrc,
  duration,
  waveformPeaks,
  clips,
  setClips,
  selectedClipId,
  setSelectedClipId,
  overlay,
  setOverlay,
  exportSettings,
  setExportSettings,
  onOpenExportModal,
  onToast,
  selectedTopic,
  setSelectedTopic,
  customKeyword,
  setCustomKeyword,
  projectName = 'Video Konten',
  soundSegments,
  silenceSegments,
}) => {
  // Real-time interactive player state
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);

  // Single clip download state
  const [downloadingClipId, setDownloadingClipId] = useState<string | null>(null);
  const [batchDownloading, setBatchDownloading] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);

  // Dedicated Video Clip Preview Modal state
  const [previewingClip, setPreviewingClip] = useState<VideoClip | null>(null);

  // Inline tagline editor for active clip
  const [isEditingTagline, setIsEditingTagline] = useState<boolean>(false);
  const [editingText, setEditingText] = useState<string>('');

  // AI & contextual processing state
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiDetectedTheme, setAiDetectedTheme] = useState<string>('');
  const [durationMode, setDurationMode] = useState<MomentDurationMode>('adaptive');
  const [showAntiCopyrightDetails, setShowAntiCopyrightDetails] = useState<boolean>(true);

  // Context extracted from filename/title
  const contextInfo = extractContextFromTitle(projectName);

  // Auto-Reframing & Dynamic Pan-and-Scan state
  const [reframeMode, setReframeMode] = useState<ReframeMode>(exportSettings.reframeMode || 'smart_auto');
  const [manualFocalX, setManualFocalX] = useState<number>(exportSettings.manualFocalX ?? 0.5);
  const [reframeSmoothing, setReframeSmoothing] = useState<number>(exportSettings.reframeSmoothing ?? 0.12);
  const [showViewfinder, setShowViewfinder] = useState<boolean>(true);
  const [detectedSubject, setDetectedSubject] = useState<DetectedSubject | null>(null);
  const [showReframeSettings, setShowReframeSettings] = useState<boolean>(true);
  const autoReframerRef = useRef<AutoReframer>(
    new AutoReframer({
      mode: exportSettings.reframeMode || 'smart_auto',
      smoothing: exportSettings.reframeSmoothing ?? 0.12,
      manualX: exportSettings.manualFocalX ?? 0.5,
    })
  );
  const lastSubjectUiUpdateRef = useRef<number>(0);

  useEffect(() => {
    autoReframerRef.current.updateConfig({
      mode: reframeMode,
      manualX: manualFocalX,
      smoothing: reframeSmoothing,
    });
    setExportSettings((prev) => ({
      ...prev,
      reframeMode,
      manualFocalX,
      reframeSmoothing,
    }));
  }, [reframeMode, manualFocalX, reframeSmoothing]);

  // Active clip currently selected
  const activeClip = clips.find((c) => c.id === selectedClipId) || clips[0] || null;

  // Active Anti-Copyright Settings (fallback to DEFAULT_ANTI_COPYRIGHT if undefined)
  const antiSettings: AntiCopyrightSettings = exportSettings.antiCopyright || DEFAULT_ANTI_COPYRIGHT;

  const updateAntiSettings = (partial: Partial<AntiCopyrightSettings>) => {
    const updated: AntiCopyrightSettings = {
      ...antiSettings,
      ...partial,
    };
    setExportSettings((prev) => ({
      ...prev,
      antiCopyright: updated,
    }));
  };

  // Fine-tune clip boundaries (expand/shorten clip naturally without hard 60s cap)
  const handleAdjustClipBoundary = (
    clipId: string,
    field: 'startTime' | 'endTime',
    deltaSec: number
  ) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        if (field === 'startTime') {
          const newStart = Math.max(0, Math.min(c.endTime - 1, Number((c.startTime + deltaSec).toFixed(1))));
          return { ...c, startTime: newStart };
        } else {
          const newEnd = Math.min(duration, Math.max(c.startTime + 1, Number((c.endTime + deltaSec).toFixed(1))));
          return { ...c, endTime: newEnd };
        }
      })
    );
  };

  // Initialize preview video src and seek to active clip
  useEffect(() => {
    if (previewVideoRef.current && videoSrc) {
      const pVid = previewVideoRef.current;
      if (pVid.src !== videoSrc) {
        pVid.src = videoSrc;
      }
      if (activeClip) {
        pVid.currentTime = activeClip.startTime;
        setCurrentTime(activeClip.startTime);
        setEditingText(activeClip.tagline || overlay.text || '');
        autoReframerRef.current.reset(0.5, 0.5);
      }
    }
  }, [videoSrc, activeClip?.id]);

  // Clean up video decoder when unmounting to free mobile hardware decoders
  useEffect(() => {
    return () => {
      const pVid = previewVideoRef.current;
      if (pVid) {
        pVid.pause();
        pVid.removeAttribute('src');
        pVid.load();
      }
    };
  }, []);

  // Real-time canvas render loop for active crop preview (WYSIWYG 9:16 safe placement + Auto-Reframing + Anti-Copyright)
  useEffect(() => {
    let animId: number;
    let lastRenderTime = 0;
    let lastAnalysisTime = 0;

    const renderFrame = (now: number) => {
      const pCanvas = previewCanvasRef.current;
      const pVideo = previewVideoRef.current;

      if (pCanvas && pVideo && pVideo.readyState >= 1) {
        const isPaused = pVideo.paused;
        // Throttle playback rendering to ~30 FPS (every 32ms) to prevent mobile GPU crashes
        if (!isPaused && now - lastRenderTime < 32) {
          animId = requestAnimationFrame(renderFrame);
          return;
        }
        lastRenderTime = now;

        const ctx = pCanvas.getContext('2d');
        if (ctx) {
          // Mobile-safe preview resolution (360x640) uses 90% less GPU memory than 1080x1920
          const pW = 360;
          const pH = 640;
          if (pCanvas.width !== pW || pCanvas.height !== pH) {
            pCanvas.width = pW;
            pCanvas.height = pH;
          }

          const effectiveSettings: ExportSettings = {
            ...exportSettings,
            aspectRatio: '9:16',
            antiCopyright: antiSettings,
          };

          // Throttle subject tracking analysis to once every 250ms instead of every 16ms
          let cam = autoReframerRef.current.getState();
          if (now - lastAnalysisTime > 250 || isPaused) {
            lastAnalysisTime = now;
            cam = autoReframerRef.current.update(pVideo);
          }

          const activeTagline = (activeClip?.tagline !== undefined ? activeClip.tagline : (overlay.text || '')).trim();
          renderVideoFrameWithEffects(
            ctx,
            pVideo,
            pW,
            pH,
            {
              ...effectiveSettings,
              overlay: {
                ...effectiveSettings.overlay,
                enabled: Boolean(activeTagline),
                text: activeTagline,
                taglineBadge: activeTagline ? (activeClip?.taglineBadge || overlay.taglineBadge) : '',
              },
            },
            activeTagline,
            activeTagline ? (activeClip?.taglineBadge || overlay.taglineBadge) : '',
            { x: cam.currentFocalX, y: cam.currentFocalY }
          );

          // Draw subtle viewfinder tracking target if enabled
          if (showViewfinder && reframeMode !== 'center') {
            ctx.save();
            const sub = cam.subject;
            const cX = pW / 2;
            const cY = pH * Math.max(0.2, Math.min(0.8, sub.y));
            ctx.strokeStyle = sub.type === 'speaker' ? 'rgba(56, 189, 248, 0.65)' : 'rgba(234, 179, 8, 0.65)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(cX, cY, 16, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = sub.type === 'speaker' ? '#38bdf8' : '#eab308';
            ctx.beginPath();
            ctx.arc(cX, cY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // Loop handling within active clip
        if (activeClip && !isPaused) {
          setCurrentTime(pVideo.currentTime);
          if (pVideo.currentTime >= activeClip.endTime) {
            pVideo.currentTime = activeClip.startTime;
          }
        }
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [activeClip, overlay, exportSettings, antiSettings, showViewfinder, reframeMode]);

  // Player controls
  const togglePlay = () => {
    const pVid = previewVideoRef.current;
    if (!pVid) return;

    if (pVid.paused) {
      pVid.muted = isMuted;
      pVid.volume = volume;
      pVid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      pVid.pause();
      setIsPlaying(false);
    }
  };

  const restartClip = () => {
    const pVid = previewVideoRef.current;
    if (!pVid || !activeClip) return;
    pVid.currentTime = activeClip.startTime;
    setCurrentTime(activeClip.startTime);
  };

  const handleScrub = (time: number) => {
    const pVid = previewVideoRef.current;
    if (!pVid || !activeClip) return;
    const clamped = Math.max(activeClip.startTime, Math.min(activeClip.endTime, time));
    pVid.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const toggleMute = () => {
    const pVid = previewVideoRef.current;
    if (!pVid) return;
    const next = !isMuted;
    setIsMuted(next);
    pVid.muted = next;
  };

  const handleVolumeChange = (v: number) => {
    const pVid = previewVideoRef.current;
    if (!pVid) return;
    setVolume(v);
    pVid.volume = v;
    if (v > 0 && isMuted) {
      setIsMuted(false);
      pVid.muted = false;
    }
  };

  // Re-generate auto crops when topic or duration mode changes, or user triggers auto-cut
  const handleAutoCutViralMoments = (overrideDurationMode?: MomentDurationMode) => {
    if (duration <= 0) return;
    const effMode = overrideDurationMode || durationMode;

    const moments = detectViralMoments(
      duration,
      waveformPeaks,
      selectedTopic,
      customKeyword || contextInfo.cleanSubject,
      projectName,
      effMode,
      soundSegments,
      silenceSegments
    );
    const newClips = convertViralMomentsToClips(moments);
    setClips(newClips);

    if (newClips.length > 0) {
      setSelectedClipId(newClips[0].id);
      const topMoment = moments[0];
      setOverlay((prev) => ({
        ...prev,
        enabled: true,
        text: topMoment?.tagline || '',
        taglineBadge: topMoment?.taglineBadge || '🔥 VIRAL HOOK',
        presetStyle: 'tiktok_yellow',
      }));
      setEditingText(topMoment?.tagline || '');
    }

    const modeLabels: Record<MomentDurationMode, string> = {
      adaptive: 'alami sesuai isi & dialog',
      shorts: 'singkat 15–45s',
      medium: 'sedang 45–90s',
      extended: 'cerita utuh 60–180s+',
    };

    onToast(
      'success',
      `⚡ Berhasil menemukan ${newClips.length} momen viral (${modeLabels[effMode]}) dengan potongan rapi di jeda nafas!`
    );
  };

  // Run AI Content-Aware Analysis to extract taglines & moments from video
  const handleRunAiContentAnalysis = async () => {
    if (duration <= 0) return;
    setIsAnalyzingAi(true);
    onToast('info', '✨ AI sedang menganalisis isi video & mencari momen paling viral...');

    try {
      const result = await fetchGeminiViralMoments(
        projectName,
        duration,
        selectedTopic,
        customKeyword || contextInfo.cleanSubject,
        durationMode
      );

      if (result && result.moments.length > 0) {
        const newClips = convertViralMomentsToClips(result.moments);
        setClips(newClips);
        setSelectedClipId(newClips[0].id);

        if (result.detectedTheme) {
          setAiDetectedTheme(result.detectedTheme);
        }

        const topMoment = result.moments[0];
        setOverlay((prev) => ({
          ...prev,
          enabled: true,
          text: topMoment.tagline,
          taglineBadge: topMoment.taglineBadge,
          presetStyle: 'tiktok_yellow',
        }));
        setEditingText(topMoment.tagline || '');

        onToast(
          'success',
          `🎉 Berhasil membuat ${newClips.length} potongan presisi & tegline wajib sesuai isi video!`
        );
      } else {
        // Fallback to enhanced contextual heuristic engine
        handleAutoCutViralMoments();
        onToast(
          'success',
          `⚡ Tegline viral disesuaikan berdasarkan isi video: "${contextInfo.cleanSubject}"`
        );
      }
    } catch {
      handleAutoCutViralMoments();
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Explicitly synchronize all clip taglines and titles with the video content / keyword
  const handleApplyKeywordAndSync = (explicitKeyword?: string, explicitTopic?: ViralTopic) => {
    const kw = (explicitKeyword !== undefined ? explicitKeyword : (customKeyword || contextInfo.cleanSubject || '')).trim();
    const top = explicitTopic || selectedTopic;
    if (explicitKeyword !== undefined) setCustomKeyword(explicitKeyword);
    if (explicitTopic) setSelectedTopic(explicitTopic);

    if (duration > 0) {
      const moments = detectViralMoments(
        duration,
        waveformPeaks,
        top,
        kw,
        projectName,
        durationMode,
        soundSegments,
        silenceSegments
      );
      const newClips = convertViralMomentsToClips(moments);
      setClips(newClips);
      if (newClips.length > 0) {
        setSelectedClipId(newClips[0].id);
        const topMoment = moments[0];
        setOverlay((prev) => ({
          ...prev,
          enabled: true,
          text: topMoment?.tagline || '',
          taglineBadge: topMoment?.taglineBadge || '🔥 VIRAL HOOK',
          presetStyle: 'tiktok_yellow',
        }));
        setEditingText(topMoment?.tagline || '');
      }
      const label = kw ? `"${kw}"` : `kategori ${top.toUpperCase()}`;
      onToast('success', `🎯 Seluruh tegline & judul disesuaikan 100% dengan isi video: ${label}!`);
    }
  };

  // Update a specific clip's tagline directly from card or input
  const handleUpdateClipTagline = (clipId: string, newTagline: string) => {
    const updated = clips.map((c) =>
      c.id === clipId ? { ...c, tagline: newTagline } : c
    );
    setClips(updated);
    if (activeClip?.id === clipId) {
      setOverlay((prev) => ({ ...prev, text: newTagline }));
      setEditingText(newTagline);
    }
  };

  // Re-generate auto crops when topic changes
  const handleTopicChange = (newTopic: ViralTopic) => {
    setSelectedTopic(newTopic);
    handleApplyKeywordAndSync(customKeyword || contextInfo.cleanSubject, newTopic);
  };

  // Apply updated tagline to active clip
  const handleSaveTagline = () => {
    if (!activeClip) return;
    const updatedClips = clips.map((c) =>
      c.id === activeClip.id ? { ...c, tagline: editingText } : c
    );
    setClips(updatedClips);
    setOverlay((prev) => ({ ...prev, text: editingText }));
    setIsEditingTagline(false);
    onToast('success', 'Tegline klip berhasil diperbarui!');
  };

  // Select an alternative suggestion hook
  const handleSelectHookSuggestion = (hookText: string) => {
    setEditingText(hookText);
    if (activeClip) {
      const updatedClips = clips.map((c) =>
        c.id === activeClip.id ? { ...c, tagline: hookText } : c
      );
      setClips(updatedClips);
      setOverlay((prev) => ({ ...prev, text: hookText }));
      onToast('info', 'Tegline berhasil diterapkan!');
    }
  };

  // Download a single cropped clip with Anti-Copyright protections
  const handleDownloadSingleClip = async (clip: VideoClip) => {
    const activeVideo = videoElement || previewVideoRef.current;
    if (!activeVideo) {
      onToast('error', 'Video belum siap untuk diexport.');
      return;
    }

    setDownloadingClipId(clip.id);
    setRenderProgress({ percent: 5, status: `Menyiapkan render klip ${clip.name} (Anti-Copyright Shield Aktif)...` });

    try {
      const taglineText = (clip.tagline !== undefined ? clip.tagline : (overlay.text || '')).trim();
      const clipSettings: ExportSettings = {
        ...exportSettings,
        aspectRatio: '9:16', // Format 9:16 ideal untuk viral
        fitMode: 'crop',     // Auto-reframing dynamic pan-and-scan
        antiCopyright: antiSettings,
        reframeMode,
        reframeSmoothing,
        manualFocalX,
        overlay: {
          ...overlay,
          enabled: Boolean(taglineText),
          text: taglineText,
          taglineBadge: taglineText ? (clip.taglineBadge || overlay.taglineBadge) : '',
          presetStyle: 'tiktok_yellow',
        },
      };

      const result = await renderClipsToVideo(
        activeVideo,
        [clip],
        clipSettings,
        (prog) => setRenderProgress(prog)
      );

      // Trigger safe download that works reliably on Android Chrome, iOS Safari, and Desktop
      const cleanName = (clip.name || 'viral_clip').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `cliprush_viral_${cleanName}_anticopyright.${clipSettings.format === 'webm' ? 'webm' : 'mp4'}`;
      const { success } = triggerSafeDownload(result.blob, filename);

      if (success) {
        onToast('success', `✨ Klip "${clip.name}" berhasil disimpan ke perangkat! Bebas klaim hak cipta FB.`);
      } else {
        onToast('info', `Render selesai. Jika file belum otomatis tersimpan, silakan periksa izin download browser.`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      onToast('error', `Gagal download klip: ${error.message}`);
    } finally {
      setDownloadingClipId(null);
      setRenderProgress(null);
    }
  };

  // Download all cropped viral clips in batch with Anti-Copyright protections
  const handleDownloadAllClipsBatch = async () => {
    const activeVideo = videoElement || previewVideoRef.current;
    if (!activeVideo || clips.length === 0) {
      onToast('error', 'Tidak ada klip untuk didownload atau video belum siap.');
      return;
    }

    setBatchDownloading(true);

    try {
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        setRenderProgress({
          percent: Math.round((i / clips.length) * 100),
          status: `Merender klip ${i + 1}/${clips.length} (${clip.name}) [Proteksi Anti-Copyright FB]...`,
        });

        const taglineText = (clip.tagline !== undefined ? clip.tagline : (overlay.text || '')).trim();
        const clipSettings: ExportSettings = {
          ...exportSettings,
          aspectRatio: '9:16',
          fitMode: 'crop',
          antiCopyright: antiSettings,
          reframeMode,
          reframeSmoothing,
          manualFocalX,
          overlay: {
            ...overlay,
            enabled: Boolean(taglineText),
            text: taglineText,
            taglineBadge: taglineText ? (clip.taglineBadge || overlay.taglineBadge) : '',
            presetStyle: 'tiktok_yellow',
          },
        };

        const result = await renderClipsToVideo(
          activeVideo,
          [clip],
          clipSettings,
          (prog) => {
            const clipPct = prog.percent || 0;
            const overall = Math.round(((i + clipPct / 100) / clips.length) * 100);
            setRenderProgress({
              percent: overall,
              status: `Merender klip ${i + 1}/${clips.length} (${clipPct}%)...`,
            });
          }
        );

        const cleanName = (clip.name || `clip_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `cliprush_${cleanName}_fb_ready.${clipSettings.format === 'webm' ? 'webm' : 'mp4'}`;
        triggerSafeDownload(result.blob, filename);
      }

      onToast('success', `🎉 Semua ${clips.length} klip viral berhasil didownload dengan Proteksi Anti-Copyright FB!`);
    } catch (err: unknown) {
      const error = err as Error;
      onToast('error', `Gagal batch download: ${error.message}`);
    } finally {
      setBatchDownloading(false);
      setRenderProgress(null);
    }
  };

  const formatSec = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-5 select-none pb-8">
      {/* Hidden preview video for canvas drawing */}
      <video
        ref={previewVideoRef}
        playsInline
        preload="auto"
        className="hidden"
      />

      {/* Header Info & Actions */}
      <div className="glass-panel rounded-3xl p-5 border border-white/10 relative overflow-hidden bg-gradient-to-br from-[#12111c] via-[#0d0d14] to-[#0a0a0f]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Hasil Crop Potensi Viral</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Anti-Copyright FB Ready</span>
              </span>
              <span className="text-xs text-slate-400">
                • {clips.length} Klip Siap Dipratinjau & Didownload
              </span>
            </div>

            <h2 className="font-heading text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Potongan Video & Tegline Otomatis Sesuai Isi</span>
            </h2>

            {aiDetectedTheme ? (
              <p className="text-xs text-emerald-400 max-w-xl mt-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Tema Terdeteksi AI: "{aiDetectedTheme}"</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 max-w-xl mt-1">
                Video otomatis dipotong pada bagian hook dan puncak emosi. Tegline disesuaikan dengan isi video, dan proteksi anti-hak cipta aktif agar aman diupload ke Facebook.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {activeClip && (
              <button
                onClick={() => setPreviewingClip(activeClip)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition active:scale-95 shadow-md"
                title="Tonton hasil video klip terpilih sebelum didownload"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>👁️ Tonton Video Klip #{clips.findIndex((c) => c.id === activeClip.id) + 1}</span>
              </button>
            )}

            <button
              onClick={handleRunAiContentAnalysis}
              disabled={isAnalyzingAi}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50"
              title="Gunakan AI untuk menganalisis isi video dan membuat tegline viral yang relevan"
            >
              <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isAnalyzingAi ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingAi ? 'Menganalisis...' : '✨ AI Tegline Isi Video'}</span>
            </button>

            <button
              onClick={handleDownloadAllClipsBatch}
              disabled={batchDownloading || downloadingClipId !== null || clips.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-40"
              title="Download semua klip yang telah terpotong sekaligus"
            >
              <Download className={`w-4 h-4 ${batchDownloading ? 'animate-bounce' : ''}`} />
              <span>{batchDownloading ? 'Mendownload...' : `Download Semua (${clips.length} Klip)`}</span>
            </button>

            <button
              onClick={onOpenExportModal}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1.5 cursor-pointer transition"
              title="Buka opsi export kustom (resolusi, format, framing)"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Pengaturan Export</span>
            </button>
          </div>
        </div>

        {/* Penyelaras Tegline & Judul Wajib Sesuai Isi Video */}
        <div className="mt-4 p-4 rounded-2xl bg-[#090812] border border-amber-500/35 space-y-3 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Penyelarasan Tegline & Judul</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 border border-amber-500/40 font-bold">
                    Wajib Sesuai Isi Video
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Semua judul & tegline di atas klip akan otomatis diracik khusus menyebut topik nyata videomu.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleApplyKeywordAndSync()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
              title="Perbarui semua potongan dan tegline agar tepat sasaran sesuai isi video"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-slate-950" />
              <span>Sesuaikan Tegline Sekarang</span>
            </button>
          </div>

          {/* Input Topik / Isi Video */}
          <div className="flex items-center gap-2 bg-black/70 border border-white/15 focus-within:border-amber-400/80 rounded-xl px-3 py-2 transition shadow-inner">
            <span className="text-slate-400 text-xs font-semibold shrink-0">Topik / Isi:</span>
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyKeywordAndSync();
              }}
              placeholder={`Contoh: ${contextInfo.keyword || 'Balap Mobil Drift, Obrolan Podcast, Tips Bisnis, Review HP, dsb.'}`}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-medium"
            />
            {customKeyword && (
              <button
                onClick={() => {
                  setCustomKeyword('');
                  handleApplyKeywordAndSync('');
                }}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 cursor-pointer shrink-0"
              >
                Reset
              </button>
            )}
            <button
              onClick={() => handleApplyKeywordAndSync()}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 cursor-pointer shrink-0"
            >
              Terapkan
            </button>
          </div>

          {/* 1-Click Topic Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0">Pilihan Cepat:</span>
            {VIRAL_TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleTopicChange(topic.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedTopic === topic.id
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-500/50 shadow-sm font-bold'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{topic.icon}</span>
                <span>{topic.name.split('&')[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Pilihan Durasi Momen (Fleksibel & Alami - Durasi Tidak Terbatas 60 Detik) */}
        <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode Durasi:</span>
            </span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              {[
                { id: 'adaptive', label: '⚡ Alami (Bisa >60s)', desc: 'Menyesuaikan momen & kelengkapan obrolan secara alami' },
                { id: 'shorts', label: '⏱️ Singkat (15–45s)', desc: 'Hook cepat & punchline kilat' },
                { id: 'medium', label: '⏱️ Sedang (45–90s)', desc: 'Format ideal Reels & Feed' },
                { id: 'extended', label: '⏱️ Cerita Utuh (60–180s+)', desc: 'Diskusi mendalam & pembahasan lengkap' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    const nextMode = m.id as MomentDurationMode;
                    setDurationMode(nextMode);
                    handleAutoCutViralMoments(nextMode);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                    durationMode === m.id
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={m.desc}
                >
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleApplyKeywordAndSync(customKeyword || contextInfo.cleanSubject, selectedTopic);
                  onToast('success', 'Tegline otomatis sesuai isi klip diaktifkan!');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  clips.some((c) => c.tagline && c.tagline.trim())
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Aktifkan tegline otomatis sesuai pembahasan video untuk semua klip"
              >
                <Tag className="w-3 h-3" />
                <span>Tegline Otomatis</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = clips.map((c) => ({ ...c, tagline: '' }));
                  setClips(updated);
                  setOverlay((prev) => ({ ...prev, text: '' }));
                  onToast('info', 'Semua klip diatur tanpa tegline (video polos).');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  !clips.some((c) => c.tagline && c.tagline.trim())
                    ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Hapus tegline dari semua klip (video bersih)"
              >
                <Ban className="w-3 h-3" />
                <span>Tanpa Tegline</span>
              </button>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 italic">
            *Durasi klip tidak dibatasi 60 detik; klip dipotong utuh mengikuti alur momen alami video.
          </span>
        </div>
      </div>

      {/* ================= FACEBOOK ANTI-COPYRIGHT PRO SHIELD CARD ================= */}
      <div className="rounded-2xl p-4 border border-blue-500/30 bg-gradient-to-r from-blue-950/30 via-[#0e1629] to-indigo-950/20 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-sm">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm text-white">
                  Proteksi Anti-Copyright Facebook & Reels
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    antiSettings.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/10 text-slate-400 border-white/10'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${antiSettings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{antiSettings.enabled ? 'SHIELD AKTIF (AMAN FB)' : 'NONAKTIF'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Memodifikasi signature audio dan layout video secara mikro agar lolos deteksi otomatis Content ID & Rights Manager Meta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateAntiSettings({ enabled: !antiSettings.enabled })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                antiSettings.enabled
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20'
                  : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/15'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{antiSettings.enabled ? 'Proteksi FB Aktif' : 'Aktifkan Proteksi FB'}</span>
            </button>

            <button
              onClick={() => setShowAntiCopyrightDetails(!showAntiCopyrightDetails)}
              className="text-xs text-blue-300 hover:text-white px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition cursor-pointer"
            >
              {showAntiCopyrightDetails ? 'Sembunyikan' : 'Atur Fitur'}
            </button>
          </div>
        </div>

        {/* Detailed Anti-Copyright Switches */}
        {showAntiCopyrightDetails && (
          <div className="pt-3 border-t border-blue-500/20 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* 1. Mirror Horizontal */}
            <button
              onClick={() => updateAntiSettings({ flipHorizontal: !antiSettings.flipHorizontal })}
              disabled={!antiSettings.enabled}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer disabled:opacity-40 ${
                antiSettings.flipHorizontal && antiSettings.enabled
                  ? 'bg-blue-500/20 border-blue-500/50 text-white'
                  : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">🔄 Mirror Video</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {antiSettings.flipHorizontal ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Balik kiri-kanan (Teks tetap normal).
              </p>
            </button>

            {/* 2. Micro-Speed 1.02x */}
            <button
              onClick={() => updateAntiSettings({ microSpeed: !antiSettings.microSpeed })}
              disabled={!antiSettings.enabled}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer disabled:opacity-40 ${
                antiSettings.microSpeed && antiSettings.enabled
                  ? 'bg-blue-500/20 border-blue-500/50 text-white'
                  : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">⚡ Tempo 1.02x</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {antiSettings.microSpeed ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Pecah hash audio tempo FB.
              </p>
            </button>

            {/* 3. Audio EQ Filter */}
            <button
              onClick={() => updateAntiSettings({ audioEqShift: !antiSettings.audioEqShift })}
              disabled={!antiSettings.enabled}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer disabled:opacity-40 ${
                antiSettings.audioEqShift && antiSettings.enabled
                  ? 'bg-blue-500/20 border-blue-500/50 text-white'
                  : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">🎚️ Audio EQ Tilt</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {antiSettings.audioEqShift ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Filter frekuensi anti-fingerprint.
              </p>
            </button>

            {/* 4. Micro Zoom */}
            <button
              onClick={() => updateAntiSettings({ microZoom: !antiSettings.microZoom })}
              disabled={!antiSettings.enabled}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer disabled:opacity-40 ${
                antiSettings.microZoom && antiSettings.enabled
                  ? 'bg-blue-500/20 border-blue-500/50 text-white'
                  : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">🔍 Zoom Mikro 3%</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {antiSettings.microZoom ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Potong margin ubah susunan piksel.
              </p>
            </button>

            {/* 5. Safe Border */}
            <button
              onClick={() => updateAntiSettings({ borderFrame: !antiSettings.borderFrame })}
              disabled={!antiSettings.enabled}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer disabled:opacity-40 ${
                antiSettings.borderFrame && antiSettings.enabled
                  ? 'bg-blue-500/20 border-blue-500/50 text-white'
                  : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">🖼️ Safe Border</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {antiSettings.borderFrame ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Frame halus pengubah batas visual.
              </p>
            </button>

            {/* 6. Color Shift */}
            <button
              onClick={() => updateAntiSettings({ colorShift: !antiSettings.colorShift })}
              disabled={!antiSettings.enabled}
              className={`p-2.5 rounded-xl text-left border transition cursor-pointer disabled:opacity-40 ${
                antiSettings.colorShift && antiSettings.enabled
                  ? 'bg-blue-500/20 border-blue-500/50 text-white'
                  : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">🎨 Color Shift</span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {antiSettings.colorShift ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Ubah histogram kontras & saturasi.
              </p>
            </button>
          </div>
        )}
      </div>

      {/* Progress Notification during active rendering */}
      {renderProgress && (
        <div className="glass-card rounded-2xl p-4 border border-cyan-500/30 bg-cyan-950/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
              <span>{renderProgress.status}</span>
            </span>
            <span className="font-mono font-bold text-cyan-300">{renderProgress.percent}%</span>
          </div>
          <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-400 transition-all duration-200"
              style={{ width: `${renderProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Left (Interactive 9:16 Crop Preview Player) & Right (Gallery of Cropped Clips) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= LEFT: REAL-TIME PLAYER FOR ACTIVE CROP (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Pratinjau Hasil Crop 9:16</span>
            </span>
            <div className="flex items-center gap-1.5">
              {antiSettings.enabled && (
                <span className="text-[10px] font-mono text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>Proteksi FB</span>
                </span>
              )}
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Safe-Zone Aktif
              </span>
            </div>
          </div>

          {/* Portrait 9:16 Live Canvas Frame */}
          <div className="relative rounded-3xl overflow-hidden bg-black/95 border border-white/10 shadow-2xl aspect-[9/16] max-h-[440px] mx-auto flex items-center justify-center group w-full">
            <canvas
              ref={previewCanvasRef}
              className="w-full h-full object-contain"
            />

            {/* Top Badge: Active Clip Title */}
            <div className="absolute top-3 left-3 pointer-events-none">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/75 text-slate-200 border border-white/15 backdrop-blur-md flex items-center gap-1.5 shadow-md">
                <Flame className="w-3 h-3 text-amber-400" />
                <span className="truncate max-w-[160px]">{activeClip?.name || 'Klip Aktif'}</span>
              </span>
            </div>

            {/* Top Right: Status Reassurance Pill */}
            <div className="absolute top-3 right-3 pointer-events-none">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1 shadow-sm">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Video Bebas Tertutup</span>
              </span>
            </div>

            {/* Floating Play Button when paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl cursor-pointer transition hover:scale-110 active:scale-95 z-20"
                title="Putar Pratinjau Klip"
              >
                <Play className="w-7 h-7 ml-1 fill-current" />
              </button>
            )}
          </div>

          {/* Interactive Player Controls */}
          <div className="glass-card rounded-2xl p-3.5 border border-white/10 bg-black/50 space-y-2.5">
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
                  title="Ulangi dari awal klip"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Timecode within active clip */}
              <span className="text-xs font-mono text-slate-300 font-semibold">
                {activeClip
                  ? `${formatSec(Math.max(0, currentTime - activeClip.startTime))} / ${formatSec(activeClip.endTime - activeClip.startTime)}`
                  : '00:00'}
              </span>

              {/* Sound controls */}
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
                  title="Volume Video Asli"
                />
              </div>
            </div>

            {/* Scrubber slider */}
            {activeClip && (
              <input
                type="range"
                min={activeClip.startTime}
                max={activeClip.endTime}
                step="0.05"
                value={currentTime}
                onChange={(e) => handleScrub(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5"
              />
            )}

            {/* Active Clip Quick Download & Preview Buttons */}
            {activeClip && (
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={() => setPreviewingClip(activeClip)}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 shadow-sm flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>👁️ Tonton Video Klip #{clips.findIndex((c) => c.id === activeClip.id) + 1} (Layar Pratinjau)</span>
                </button>

                <button
                  onClick={() => handleDownloadSingleClip(activeClip)}
                  disabled={downloadingClipId === activeClip.id}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${downloadingClipId === activeClip.id ? 'animate-bounce' : ''}`} />
                  <span>
                    {downloadingClipId === activeClip.id
                      ? 'Sedang Memproses Export...'
                      : `Download Klip Ini Sekarang (${(activeClip.endTime - activeClip.startTime).toFixed(1)}s)`}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* ================= AUTO-REFRAMING CERDAS (PAN & SCAN 9:16) ================= */}
          <div className="glass-card rounded-2xl p-4 border border-cyan-500/30 bg-gradient-to-br from-[#0c1424] via-[#09101d] to-[#070b14] space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Auto-Reframing Cerdas</span>
                    <span className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.2 rounded border border-cyan-500/30">
                      9:16 PAN & SCAN
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Otomatis lacak pembicara & gerakan agar selalu di tengah frame 9:16
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowReframeSettings(!showReframeSettings)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
              >
                {showReframeSettings ? 'Sembunyikan' : 'Atur'}
              </button>
            </div>

            {/* Live Detected Subject Status Pip */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Status Pelacakan:</span>
              </span>
              <span className="font-mono font-bold text-cyan-300 flex items-center gap-1">
                {detectedSubject ? detectedSubject.label : 'Menganalisis Subjek...'}
              </span>
            </div>

            {showReframeSettings && (
              <div className="space-y-3 pt-1 border-t border-white/5">
                {/* Mode Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                    Mode Kamera Pan-and-Scan:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setReframeMode('smart_auto')}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer text-xs flex flex-col gap-0.5 ${
                        reframeMode === 'smart_auto'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-white font-bold shadow-sm'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>Auto Cerdas</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">Pembicara + Aksi</span>
                    </button>

                    <button
                      onClick={() => setReframeMode('speaker')}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer text-xs flex flex-col gap-0.5 ${
                        reframeMode === 'speaker'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-white font-bold shadow-sm'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-cyan-400" />
                        <span>Wajah & Suara</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">Prioritas Manusia</span>
                    </button>

                    <button
                      onClick={() => setReframeMode('action')}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer text-xs flex flex-col gap-0.5 ${
                        reframeMode === 'action'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-white font-bold shadow-sm'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span>Aksi & Gerak</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">Gerakan Cepat</span>
                    </button>

                    <button
                      onClick={() => setReframeMode('center')}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer text-xs flex flex-col gap-0.5 ${
                        reframeMode === 'center'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-white font-bold shadow-sm'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Crosshair className="w-3 h-3 text-slate-400" />
                        <span>Kunci Tengah</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">Tetap di 50%</span>
                    </button>

                    <button
                      onClick={() => setReframeMode('manual')}
                      className={`p-2 rounded-xl text-left border transition cursor-pointer text-xs flex flex-col gap-0.5 col-span-2 sm:col-span-2 ${
                        reframeMode === 'manual'
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-white font-bold shadow-sm'
                          : 'bg-black/30 border-white/5 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <MoveHorizontal className="w-3 h-3 text-emerald-400" />
                        <span>Manual Pan Slider</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-normal">Geser kamera bebas</span>
                    </button>
                  </div>
                </div>

                {/* Manual Pan Slider if manual mode */}
                {reframeMode === 'manual' && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-medium">Posisi Kamera Horizontal (Pan X):</span>
                      <span className="font-mono text-cyan-300 font-bold">{Math.round(manualFocalX * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>Kiri</span>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.01"
                        value={manualFocalX}
                        onChange={(e) => setManualFocalX(parseFloat(e.target.value))}
                        className="flex-1 accent-cyan-400 cursor-pointer h-1.5"
                      />
                      <span>Kanan</span>
                    </div>
                  </div>
                )}

                {/* Viewfinder Crosshair Toggle & Camera Glide Smoothing */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showViewfinder}
                      onChange={(e) => setShowViewfinder(e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    <span>Tampilkan Target Viewfinder AI di Layar</span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Glide:</span>
                    <select
                      value={reframeSmoothing}
                      onChange={(e) => setReframeSmoothing(parseFloat(e.target.value))}
                      className="bg-black/50 text-cyan-300 text-[10px] font-semibold border border-white/10 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                    >
                      <option value="0.08">Sangat Halus (Cinematic)</option>
                      <option value="0.12">Standar Alami</option>
                      <option value="0.25">Responsif Cepat</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT: GALLERY OF ALL CROPPED CLIPS (7 cols) ================= */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-violet-400" />
                <span>Daftar Klip Potongan Viral ({clips.length})</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Pilih klip untuk pratinjau di kiri atau unduh per bagian dengan proteksi hak cipta.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAutoCutViralMoments()}
                className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/25 transition cursor-pointer"
                title="Potong ulang berdasarkan deteksi gelombang suara terbaru"
              >
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                <span>Potong Ulang Viral</span>
              </button>
            </div>
          </div>

          {/* Cards of Cropped Clips */}
          <div className="space-y-3">
            {clips.map((clip, idx) => {
              const isCurrent = clip.id === selectedClipId;
              const clipDur = Math.max(0.1, clip.endTime - clip.startTime);
              const isDownloading = downloadingClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  className={`glass-panel rounded-2xl p-4 border transition-all ${
                    isCurrent
                      ? 'border-amber-500/50 bg-[#161424] shadow-lg shadow-amber-500/5'
                      : 'border-white/10 hover:border-white/20 bg-black/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Top Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold font-mono text-amber-400 w-5">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">
                          {clip.name}
                        </h4>
                        {clip.viralScore && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-amber-400" />
                            <span>{clip.viralScore}% Potensi FYP</span>
                          </span>
                        )}
                        {clip.taglineBadge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {clip.taglineBadge}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          🛡️ FB Ready
                        </span>
                      </div>

                      {/* Time Range & Duration */}
                      <div className="text-xs text-slate-400 font-mono flex items-center gap-2 flex-wrap">
                        <span>
                          {formatSec(clip.startTime)} - {formatSec(clip.endTime)}
                        </span>
                        <span>•</span>
                        <span className="text-slate-300 font-bold">{clipDur.toFixed(1)}s</span>
                        <span>•</span>
                        <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Suara & Gerakan 100% Aktif</span>
                        </span>
                      </div>

                      {/* Alasan Momen Viral & Pacing */}
                      {clip.reason && (
                        <div className="text-[11px] text-amber-200/95 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 rounded-xl flex items-start gap-2 leading-relaxed">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span><strong className="text-amber-300">Alasan Momen:</strong> {clip.reason}</span>
                        </div>
                      )}

                      {/* Tagline Sesuai Isi Video with Direct Editable Input & 1-Click Suggestions */}
                      <div className="p-3 rounded-xl bg-black/70 border border-amber-500/20 space-y-2">
                        <div className="text-[10px] text-slate-300 uppercase tracking-wider font-bold flex items-center justify-between flex-wrap gap-1">
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <Tag className="w-3 h-3 text-amber-400" />
                            <span>Tegline Klip (Wajib Sesuai Isi Video):</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">Posisi Safe-Zone Atas</span>
                        </div>

                        {/* Inline Tagline Input */}
                        <div className="relative">
                          <input
                            type="text"
                            value={clip.tagline || ''}
                            onChange={(e) => handleUpdateClipTagline(clip.id, e.target.value)}
                            placeholder="Ketik tegline yang sesuai isi adegan ini..."
                            className="w-full text-xs font-bold text-yellow-300 bg-black/60 border border-white/15 focus:border-amber-400/80 rounded-lg px-2.5 py-1.5 focus:outline-none transition"
                          />
                        </div>

                        {/* 1-Click Alternative Tagline Suggestions & Tanpa Tegline Option */}
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <span>⚡ Pilihan Cepat Tegline:</span>
                            </span>
                            {clip.tagline && (
                              <button
                                type="button"
                                onClick={() => handleUpdateClipTagline(clip.id, '')}
                                className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer transition flex items-center gap-1"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Hapus Tegline</span>
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {/* Pilihan Tanpa Tegline */}
                            <button
                              type="button"
                              onClick={() => handleUpdateClipTagline(clip.id, '')}
                              className={`text-[10px] px-2 py-0.5 rounded-lg border text-left transition cursor-pointer flex items-center gap-1 ${
                                !clip.tagline
                                  ? 'bg-rose-500/25 text-rose-200 border-rose-500/50 font-bold shadow-sm'
                                  : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10'
                              }`}
                              title="Jangan tampilkan tegline pada klip ini (video polos)"
                            >
                              <Ban className="w-3 h-3" />
                              <span>🚫 Tanpa Tegline</span>
                            </button>

                            {clip.suggestedTaglines && clip.suggestedTaglines.slice(0, 4).map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleUpdateClipTagline(clip.id, sug)}
                                className={`text-[10px] px-2 py-0.5 rounded-lg border text-left transition cursor-pointer ${
                                  clip.tagline === sug
                                    ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 font-bold shadow-sm'
                                    : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
                                }`}
                                title="Klik untuk langsung terapkan tegline ini"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Penyesuaian Durasi Klip (Fine-Tune Trim - Durasi Bebas >60s) */}
                      <div className="p-2 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-400 font-medium">Mulai:</span>
                          <span className="font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            {formatSec(clip.startTime)}
                          </span>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'startTime', -5)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Mulai 5 detik lebih awal"
                          >
                            -5s
                          </button>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'startTime', -1)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Mulai 1 detik lebih awal"
                          >
                            -1s
                          </button>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'startTime', 1)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Mulai 1 detik lebih lambat"
                          >
                            +1s
                          </button>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'startTime', 5)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Mulai 5 detik lebih lambat"
                          >
                            +5s
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-400 font-medium">Selesai:</span>
                          <span className="font-mono font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                            {formatSec(clip.endTime)}
                          </span>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'endTime', -5)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Selesai 5 detik lebih awal"
                          >
                            -5s
                          </button>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'endTime', -1)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Selesai 1 detik lebih awal"
                          >
                            -1s
                          </button>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'endTime', 1)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Perpanjang 1 detik"
                          >
                            +1s
                          </button>
                          <button
                            onClick={() => handleAdjustClipBoundary(clip.id, 'endTime', 5)}
                            className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                            title="Perpanjang 5 detik"
                          >
                            +5s
                          </button>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {clipDur.toFixed(1)}s (Bebas &gt;60s)
                        </span>
                      </div>
                    </div>

                    {/* Actions per clip */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedClipId(clip.id);
                          setPreviewingClip(clip);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 shadow-sm"
                        title="Tonton video hasil klip ini sebelum didownload"
                      >
                        <Eye className="w-4 h-4 text-amber-400" />
                        <span>Tonton Video</span>
                      </button>

                      <button
                        onClick={() => handleDownloadSingleClip(clip)}
                        disabled={isDownloading}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-40"
                        title="Download hasil klip video ini langsung"
                      >
                        <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Tagline Quick-Selector if this is active clip */}
                  {isCurrent && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                          <Type className="w-3 h-3 text-cyan-400" />
                          <span>Pilihan Tegline Alternatif Sesuai Isi:</span>
                        </span>
                        <button
                          onClick={() => setIsEditingTagline(!isEditingTagline)}
                          className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          {isEditingTagline ? 'Batal' : 'Ketik Manual'}
                        </button>
                      </div>

                      {/* Manual editor input if toggled */}
                      {isEditingTagline ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            placeholder="Tulis tegline menarik untuk video ini..."
                            className="flex-1 bg-black/60 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <button
                            onClick={handleSaveTagline}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition"
                          >
                            Simpan
                          </button>
                        </div>
                      ) : (
                        /* Contextual Hook Suggestions Pills Strictly Matching Video Content */
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {generateTaglinesForMoment(
                            selectedTopic,
                            'hook',
                            customKeyword || contextInfo.keyword,
                            projectName
                          ).suggestions.slice(0, 5).map((hook, hIdx) => (
                            <button
                              key={hIdx}
                              onClick={() => handleSelectHookSuggestion(hook)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-yellow-300 text-[10px] border border-white/10 hover:border-amber-500/35 transition cursor-pointer text-left truncate max-w-[280px]"
                              title={`Pilih tegline: "${hook}"`}
                            >
                              {hook}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Interactive Video Clip Preview Modal - Memungkinkan melihat video dulu sebelum didownload */}
      <ClipPreviewModal
        isOpen={previewingClip !== null}
        onClose={() => setPreviewingClip(null)}
        clip={previewingClip}
        allClips={clips}
        onSelectClip={(newId) => {
          setSelectedClipId(newId);
          const target = clips.find((c) => c.id === newId) || null;
          setPreviewingClip(target);
        }}
        videoSrc={videoSrc}
        exportSettings={exportSettings}
        overlay={overlay}
        onUpdateClipTagline={handleUpdateClipTagline}
        onDownloadClip={(c) => {
          handleDownloadSingleClip(c);
        }}
        isDownloading={downloadingClipId !== null}
        reframeMode={reframeMode}
      />
    </div>
  );
};
