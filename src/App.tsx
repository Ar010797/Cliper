import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { VideoPlayer } from './components/VideoPlayer';
import { WaveformTimeline } from './components/WaveformTimeline';
import { IntakePanel } from './components/IntakePanel';
import { CropResultsPanel } from './components/CropResultsPanel';
import { ViralClipperPanel } from './components/ViralClipperPanel';
import { SmartCutPanel } from './components/SmartCutPanel';
import { ClipsListPanel } from './components/ClipsListPanel';
import { CaptionsAndFilters } from './components/CaptionsAndFilters';
import { ExportModal } from './components/ExportModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Sparkles } from 'lucide-react';

import {
  ColorFilter,
  DEFAULT_ANTI_COPYRIGHT,
  ExportSettings,
  ProjectHistoryItem,
  SmartCutConfig,
  TextOverlay,
  VideoClip,
  ViralTopic,
} from './types';
import { analyzeAudio } from './utils/audioAnalysis';
import { createDemoSampleVideo } from './utils/sampleVideo';
import { detectViralMoments, convertViralMomentsToClips } from './utils/viralClipper';

export default function App() {
  // Navigation & active view state
  const [activeTab, setActiveTab] = useState<ActiveTab>('intake');

  // Mobile panel drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // When tab is changed, switch view cleanly or open export dialog
  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === 'export') {
      setIsExportModalOpen(true);
      return;
    }
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Video playback & source state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileBlob, setVideoFileBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('Proyek Baru');
  const [aspectGuide, setAspectGuide] = useState<'original' | '16:9' | '9:16' | '1:1' | '4:5' | '21:9'>('original');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Timeline & Clips state
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // Audio Analysis state
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [silenceSegments, setSilenceSegments] = useState<{ start: number; end: number }[]>([]);
  const [soundSegments, setSoundSegments] = useState<{ start: number; end: number }[]>([]);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ percent: 0, status: '' });
  const [smartCutConfig, setSmartCutConfig] = useState<SmartCutConfig>({
    thresholdDb: -35,
    minSilenceDuration: 0.5,
    paddingBefore: 0.1,
    paddingAfter: 0.1,
  });

  // Captions & Color Filters state
  const [filter, setFilter] = useState<ColorFilter>('none');
  const [selectedTopic, setSelectedTopic] = useState<ViralTopic>('podcast');
  const [customKeyword, setCustomKeyword] = useState<string>('');

  const [overlay, setOverlay] = useState<TextOverlay>({
    enabled: true,
    text: 'Highlight Momen Terbaik',
    position: 'top',
    fontSize: 26,
    textColor: '#fde047',
    bgColor: 'rgba(0, 0, 0, 0.85)',
    fontStyle: 'bold',
    presetStyle: 'tiktok_yellow',
    taglineBadge: '🔥 VIRAL HOOK',
  });

  // Export settings state
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: '720p',
    aspectRatio: 'original',
    fitMode: 'letterbox',
    format: 'mp4',
    crf: 23,
    fps: 30,
    playbackSpeed: 1,
    muteAudio: false,
    filter: 'none',
    antiCopyright: DEFAULT_ANTI_COPYRIGHT,
    overlay: {
      enabled: false,
      text: '',
      position: 'bottom',
      fontSize: 28,
      textColor: '#ffffff',
      bgColor: 'rgba(0, 0, 0, 0.75)',
      fontStyle: 'bold',
    },
  });

  // Settings & History state with localStorage
  const [cobaltEndpoint, setCobaltEndpoint] = useState<string>(() => {
    return localStorage.getItem('cliprush_cobalt_url') || 'https://api.cobalt.tools';
  });
  const [cobaltApiKey, setCobaltApiKey] = useState<string>(() => {
    return localStorage.getItem('cliprush_cobalt_key') || '';
  });
  const [historyItems, setHistoryItems] = useState<ProjectHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('cliprush_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [smartZoom, setSmartZoom] = useState<boolean>(true); // Ken Burns dynamic gradual zoom for talking heads

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Keep cobalt endpoint and API key in localStorage
  useEffect(() => {
    localStorage.setItem('cliprush_cobalt_url', cobaltEndpoint);
    localStorage.setItem('cliprush_cobalt_key', cobaltApiKey);
  }, [cobaltEndpoint, cobaltApiKey]);

  // Keep history in localStorage
  useEffect(() => {
    localStorage.setItem('cliprush_history', JSON.stringify(historyItems));
  }, [historyItems]);

  // Sync video audio properties
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [playbackSpeed, volume, isMuted]);

  // Keep export settings overlay & filter synced
  useEffect(() => {
    setExportSettings((prev) => ({
      ...prev,
      filter,
      overlay,
    }));
  }, [filter, overlay]);

  // Multi-clip playback boundaries enforcement
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      if (clips.length === 0) return;

      // Find current clip or next clip
      const currentClipIdx = clips.findIndex(
        (c) => time >= c.startTime && time < c.endTime
      );

      if (currentClipIdx !== -1) {
        // We are inside a clip
        const clip = clips[currentClipIdx];
        if (selectedClipId !== clip.id) {
          setSelectedClipId(clip.id);
        }
      } else {
        // We might be between clips or past end of clip
        // Find next clip in sequence
        const nextClip = clips.find((c) => c.startTime > time);
        if (nextClip) {
          video.currentTime = nextClip.startTime;
          setSelectedClipId(nextClip.id);
        } else if (isPlaying) {
          // Reached end of all clips! Loop back to first clip or pause
          if (clips[0]) {
            video.currentTime = clips[0].startTime;
            setSelectedClipId(clips[0].id);
          } else {
            video.pause();
            setIsPlaying(false);
          }
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [clips, isPlaying, selectedClipId]);

  // Handle Video Loading
  const handleLoadVideoFile = async (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    setVideoFileBlob(blob);
    setVideoSrc(url);
    setProjectName(name);

    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.onloadedmetadata = () => {
        if (!videoRef.current) return;
        const dur = videoRef.current.duration;
        setVideoDuration(dur);

        // OTOMATIS: Potong video menjadi bagian-bagian potensi viral sesuai isi & topik
        const autoMoments = detectViralMoments(dur, undefined, selectedTopic, customKeyword, name);
        const autoClips = convertViralMomentsToClips(autoMoments);
        setClips(autoClips);
        setSelectedClipId(autoClips[0]?.id || '');

        // Otomatis terapkan tegline hook viral pertama
        if (autoMoments[0]) {
          setOverlay((prev) => ({
            ...prev,
            enabled: true,
            text: autoMoments[0].tagline,
            position: 'top',
            fontSize: 26,
            textColor: '#fde047',
            bgColor: 'rgba(0, 0, 0, 0.85)',
            fontStyle: 'bold',
            presetStyle: 'tiktok_yellow',
            taglineBadge: autoMoments[0].taglineBadge,
          }));
        }

        // Set framing otomatis ke 9:16 Shorts/Reels/TikTok
        setAspectGuide('9:16');
        setExportSettings((prev) => ({ ...prev, aspectRatio: '9:16' }));

        videoRef.current.currentTime = 0;
        setCurrentTime(0);

        // Buka langsung menu HASIL CROP agar pengguna bisa melihat hasil potongan sebelum download
        setActiveTab('crop_results');
        addToast(
          'success',
          `⚡ Video "${name}" berhasil dipotong otomatis menjadi ${autoClips.length} klip potensi viral!`
        );

        // Automatically trigger audio waveform analysis in background for refined peak detection
        runAudioAnalysis(blob, dur);
      };
    }
  };

  // Run Web Audio API Silence & Waveform Analysis
  const runAudioAnalysis = async (sourceBlob: Blob, dur: number) => {
    setIsAnalyzingAudio(true);
    setAnalysisProgress({ percent: 10, status: 'Memulai analisis gelombang audio...' });

    try {
      const res = await analyzeAudio(sourceBlob, smartCutConfig, (pct, status) => {
        setAnalysisProgress({ percent: pct, status });
      });

      setWaveformPeaks(res.waveformPeaks);
      setSilenceSegments(res.silenceSegments);
      setSoundSegments(res.soundSegments);

      // Refine auto viral cuts with precision speech segments & waveform peaks
      if (res.waveformPeaks.length > 20 || (res.soundSegments && res.soundSegments.length > 1)) {
        const refinedMoments = detectViralMoments(
          dur,
          res.waveformPeaks,
          selectedTopic,
          customKeyword,
          projectName,
          'adaptive',
          res.soundSegments,
          res.silenceSegments
        );
        if (refinedMoments.length > 0) {
          const refinedClips = convertViralMomentsToClips(refinedMoments);
          setClips(refinedClips);
          if (refinedClips.length > 0) {
            setSelectedClipId(refinedClips[0].id);
            if (refinedMoments[0]) {
              setOverlay((prev) => ({
                ...prev,
                enabled: true,
                text: refinedMoments[0].tagline,
                taglineBadge: refinedMoments[0].taglineBadge,
              }));
            }
          }
        }
      }

      addToast(
        'info',
        `Analisis audio selesai: Klip viral disempurnakan dengan deteksi jeda bicara alami tanpa terpotong di tengah kata.`
      );
    } catch (err) {
      console.warn('Audio analysis failed or unsupported audio track:', err);
      // Generate synthetic waveform bars if audio track is empty or unsupported
      setWaveformPeaks(
        Array.from({ length: 400 }, (_, i) => 0.2 + 0.3 * Math.sin(i * 0.1) + Math.random() * 0.1)
      );
    } finally {
      setIsAnalyzingAudio(false);
    }
  };

  // Load interactive demo video
  const handleLoadDemoClip = async () => {
    setIsLoadingDemo(true);
    addToast('info', 'Membuat video demo sintetis dengan jeda hening...');
    try {
      const { blob, filename } = await createDemoSampleVideo();
      await handleLoadVideoFile(blob, filename);
      addToast('success', 'Video Demo berhasil dimuat! Coba fitur Smart Cut sekarang.');
    } catch (err: unknown) {
      const error = err as Error;
      addToast('error', `Gagal membuat demo: ${error.message}`);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Split clip at current playhead
  const handleSplitClip = () => {
    if (clips.length === 0 || !videoRef.current) return;
    const time = currentTime;

    const clipToSplitIdx = clips.findIndex(
      (c) => time > c.startTime + 0.2 && time < c.endTime - 0.2
    );

    if (clipToSplitIdx === -1) {
      addToast('info', 'Posisikan playhead di dalam klip (bukan tepat di batas) untuk membaginya.');
      return;
    }

    const target = clips[clipToSplitIdx];
    const firstPart: VideoClip = {
      ...target,
      name: `${target.name} (Bagian 1)`,
      endTime: Number(time.toFixed(2)),
    };
    const secondPart: VideoClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${target.name} (Bagian 2)`,
      startTime: Number(time.toFixed(2)),
      endTime: target.endTime,
      color: '#06b6d4',
    };

    const newClips = [...clips];
    newClips.splice(clipToSplitIdx, 1, firstPart, secondPart);
    setClips(newClips);
    setSelectedClipId(secondPart.id);
    addToast('success', 'Klip berhasil dibagi menjadi dua!');
  };

  // Delete clip
  const handleDeleteClip = (id: string) => {
    if (clips.length <= 1) {
      addToast('info', 'Minimal harus ada 1 klip di timeline.');
      return;
    }
    const newClips = clips.filter((c) => c.id !== id);
    setClips(newClips);
    if (selectedClipId === id) {
      setSelectedClipId(newClips[0]?.id || null);
    }
    addToast('info', 'Klip berhasil dihapus.');
  };

  // Duplicate clip
  const handleDuplicateClip = (id: string) => {
    const target = clips.find((c) => c.id === id);
    if (!target) return;
    const copy: VideoClip = {
      ...target,
      id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${target.name} (Salinan)`,
    };
    const idx = clips.findIndex((c) => c.id === id);
    const newClips = [...clips];
    newClips.splice(idx + 1, 0, copy);
    setClips(newClips);
    setSelectedClipId(copy.id);
    addToast('success', 'Klip berhasil digandakan!');
  };

  // Merge with next clip
  const handleMergeWithNext = (id: string) => {
    const idx = clips.findIndex((c) => c.id === id);
    if (idx === -1 || idx >= clips.length - 1) {
      addToast('info', 'Tidak ada klip berikutnya untuk digabungkan.');
      return;
    }
    const cur = clips[idx];
    const next = clips[idx + 1];

    const merged: VideoClip = {
      id: cur.id,
      name: `${cur.name} + ${next.name}`,
      startTime: cur.startTime,
      endTime: next.endTime,
      color: cur.color,
    };

    const newClips = [...clips];
    newClips.splice(idx, 2, merged);
    setClips(newClips);
    setSelectedClipId(merged.id);
    addToast('success', 'Klip berhasil digabungkan!');
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in text inputs or textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current) {
          if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
          } else {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }
      } else if (e.code === 'KeyS') {
        e.preventDefault();
        handleSplitClip();
      } else if (e.code === 'KeyI') {
        // Set In point
        e.preventDefault();
        if (selectedClipId && videoRef.current) {
          const t = videoRef.current.currentTime;
          setClips((prev) =>
            prev.map((c) =>
              c.id === selectedClipId ? { ...c, startTime: Number(Math.min(t, c.endTime - 0.2).toFixed(2)) } : c
            )
          );
          addToast('info', 'IN Point diperbarui');
        }
      } else if (e.code === 'KeyO') {
        // Set Out point
        e.preventDefault();
        if (selectedClipId && videoRef.current) {
          const t = videoRef.current.currentTime;
          setClips((prev) =>
            prev.map((c) =>
              c.id === selectedClipId ? { ...c, endTime: Number(Math.max(t, c.startTime + 0.2).toFixed(2)) } : c
            )
          );
          addToast('info', 'OUT Point diperbarui');
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1 / 30);
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoDuration, videoRef.current.currentTime + 1 / 30);
        }
      } else if (e.code === 'KeyJ') {
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1);
      } else if (e.code === 'KeyK') {
        if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else if (e.code === 'KeyL') {
        if (videoRef.current) videoRef.current.currentTime = Math.min(videoDuration, videoRef.current.currentTime + 1);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, selectedClipId, clips, videoDuration, currentTime]);

  // Shared active tool panel renderer
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'crop_results':
        return (
          <CropResultsPanel
            videoElement={videoRef.current}
            videoSrc={videoSrc}
            duration={videoDuration}
            waveformPeaks={waveformPeaks}
            clips={clips}
            setClips={setClips}
            selectedClipId={selectedClipId || ''}
            setSelectedClipId={setSelectedClipId}
            overlay={overlay}
            setOverlay={setOverlay}
            exportSettings={exportSettings}
            setExportSettings={setExportSettings}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onToast={addToast}
            selectedTopic={selectedTopic}
            setSelectedTopic={setSelectedTopic}
            customKeyword={customKeyword}
            setCustomKeyword={setCustomKeyword}
            projectName={projectName}
            soundSegments={soundSegments}
            silenceSegments={silenceSegments}
          />
        );
      case 'intake':
        return (
          <IntakePanel
            onVideoLoaded={handleLoadVideoFile}
            cobaltEndpoint={cobaltEndpoint}
            cobaltApiKey={cobaltApiKey}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onLoadDemoVideo={handleLoadDemoClip}
            isLoadingDemo={isLoadingDemo}
          />
        );
      case 'viral':
        return (
          <ViralClipperPanel
            duration={videoDuration}
            waveformPeaks={waveformPeaks}
            onApplyClips={(newClips) => {
              setClips(newClips);
              if (newClips[0]) setSelectedClipId(newClips[0].id);
            }}
            onPreviewTimeRange={(s) => {
              if (videoRef.current) {
                videoRef.current.currentTime = s;
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }}
            overlay={overlay}
            setOverlay={setOverlay}
            onToast={addToast}
            onSwitchToAspectGuide={(guide) => setAspectGuide(guide)}
            projectName={projectName}
            onUpdateProjectName={setProjectName}
            videoElement={videoRef.current}
            exportSettings={exportSettings}
          />
        );
      case 'smartcut':
        return (
          <SmartCutPanel
            duration={videoDuration}
            config={smartCutConfig}
            setConfig={setSmartCutConfig}
            onRunSmartCut={() => {
              if (videoFileBlob) runAudioAnalysis(videoFileBlob, videoDuration);
            }}
            isAnalyzing={isAnalyzingAudio}
            analysisProgress={analysisProgress}
            silenceSegments={silenceSegments}
            soundSegments={soundSegments}
            waveformPeaks={waveformPeaks}
            onApplySoundClips={(newClips) => {
              setClips(newClips);
              if (newClips[0]) setSelectedClipId(newClips[0].id);
              addToast('success', `Timeline diperbarui dengan ${newClips.length} klip aktif!`);
            }}
            onPreviewTimeRange={(s) => {
              if (videoRef.current) {
                videoRef.current.currentTime = s;
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }}
          />
        );
      case 'clips':
        return (
          <ClipsListPanel
            clips={clips}
            setClips={setClips}
            selectedClipId={selectedClipId}
            setSelectedClipId={setSelectedClipId}
            onPreviewClip={(clip) => {
              if (videoRef.current) {
                videoRef.current.currentTime = clip.startTime;
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }}
            onDeleteClip={handleDeleteClip}
            onDuplicateClip={handleDuplicateClip}
          />
        );
      case 'captions':
        return (
          <CaptionsAndFilters
            overlay={overlay}
            setOverlay={setOverlay}
            filter={filter}
            setFilter={setFilter}
            exportSettings={exportSettings}
            setExportSettings={setExportSettings}
          />
        );
      case 'export':
        return (
          <div className="p-4 flex flex-col gap-4">
            <div className="glass-card rounded-2xl p-4 border border-violet-500/20 text-center">
              <h4 className="font-heading font-bold text-sm text-white mb-1">Export Studio Siap</h4>
              <p className="text-xs text-slate-400 mb-3">
                Rendering klip dengan resolusi, rasio aspek, framing dan kualitas pilihan.
              </p>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg cursor-pointer"
              >
                Buka Dialog Export
              </button>
            </div>
          </div>
        );
      case 'history':
        return (
          <HistoryDrawer
            historyItems={historyItems}
            onClearHistory={() => setHistoryItems([])}
            onDeleteItem={(id) => setHistoryItems((prev) => prev.filter((i) => i.id !== id))}
          />
        );
      case 'settings':
        return (
          <div className="p-4 flex flex-col gap-4">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white cursor-pointer"
            >
              Buka Pengaturan API Cobalt
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0f] text-slate-100 antialiased overflow-hidden">
      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Navigation Bar */}
      <Header
        projectName={projectName}
        clipCount={clips.length}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onLoadDemoVideo={handleLoadDemoClip}
        onOpenExport={() => setIsExportModalOpen(true)}
        isLoadingDemo={isLoadingDemo}
        onOpenCropResults={() => handleSelectTab('crop_results')}
        onOpenViral={() => handleSelectTab('viral')}
      />

      {/* Quick View Navigation Strip (Matches User Screenshot Sub-Header) */}
      <div className="h-12 px-3 sm:px-4 bg-[#09090f]/95 border-b border-white/5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs z-20">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab('clips')}
            className={`px-3.5 py-1.5 rounded-2xl font-bold flex items-center gap-1.5 transition text-xs cursor-pointer ${
              activeTab === 'clips'
                ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>Editor Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('viral')}
            className={`px-3.5 py-1.5 rounded-2xl font-bold flex items-center gap-1.5 transition text-xs cursor-pointer ${
              activeTab === 'viral'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>AI Clipper</span>
          </button>

          <button
            onClick={() => setActiveTab('intake')}
            className={`px-3.5 py-1.5 rounded-2xl font-bold flex items-center gap-1.5 transition text-xs cursor-pointer ${
              activeTab === 'intake'
                ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 shadow-sm'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>📁 Ganti Video</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-1.5 rounded-2xl font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/20 cursor-pointer active:scale-95 transition"
          >
            <span>🚀 Export</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSelectTab}
          clipCount={clips.length}
          onOpenExport={() => setIsExportModalOpen(true)}
        />

        {/* Center Canvas: Responsive Studio Area */}
        {!videoSrc ? (
          /* Empty State Launchpad for all screens (Android HP, tablet, PC) */
          <main className="flex-1 flex flex-col min-w-0 bg-[#07070a] overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
            <div className="max-w-4xl w-full mx-auto space-y-6">
              <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 bg-gradient-to-br from-violet-950/40 via-[#0d0d16] to-amber-950/20 text-center relative overflow-hidden shadow-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3 shadow-sm">
                  <span>⚡ Auto-Reframing 9:16 Cerdas & Klip Viral Otomatis</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight font-heading mb-3">
                  Studio Pemotong Video Viral & Anti-Copyright
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed mb-6">
                  Buka video dari HP atau komputer Anda, atau pilih salah satu video siap pakai 1-klik di bawah untuk langsung mencoba pemotongan otomatis, penempatan tegline hook, dan kamera pelacak subjek 9:16.
                </p>

                {/* Quick 1-Click Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      const input = document.getElementById('launchpad-file-input') as HTMLInputElement;
                      if (input) input.click();
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center gap-2 cursor-pointer transition active:scale-95"
                  >
                    <span>📁 Buka Video dari Galeri / File</span>
                  </button>
                  <input
                    id="launchpad-file-input"
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleLoadVideoFile(e.target.files[0], e.target.files[0].name);
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    onClick={handleLoadDemoClip}
                    disabled={isLoadingDemo}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 border border-white/15 text-cyan-300 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                  >
                    <span>✨ Coba Video Demo 1-Klik</span>
                  </button>
                </div>
              </div>

              {/* Comprehensive Intake Panel */}
              <IntakePanel
                onVideoLoaded={handleLoadVideoFile}
                cobaltEndpoint={cobaltEndpoint}
                cobaltApiKey={cobaltApiKey}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onLoadDemoVideo={handleLoadDemoClip}
                isLoadingDemo={isLoadingDemo}
              />
            </div>
          </main>
        ) : activeTab === 'crop_results' ? (
          /* Active Tab: Hasil Crop 9:16 Studio */
          <main className="flex-1 flex flex-col min-w-0 bg-[#07070a] overflow-y-auto p-3 sm:p-5 pb-24 lg:pb-8">
            <CropResultsPanel
              videoElement={videoRef.current}
              videoSrc={videoSrc}
              duration={videoDuration}
              waveformPeaks={waveformPeaks}
              clips={clips}
              setClips={setClips}
              selectedClipId={selectedClipId || ''}
              setSelectedClipId={setSelectedClipId}
              overlay={overlay}
              setOverlay={setOverlay}
              exportSettings={exportSettings}
              setExportSettings={setExportSettings}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              onToast={addToast}
              selectedTopic={selectedTopic}
              setSelectedTopic={setSelectedTopic}
              customKeyword={customKeyword}
              setCustomKeyword={setCustomKeyword}
              projectName={projectName}
            />
          </main>
        ) : (
          /* Studio Editor Canvas or Mobile Tool Panel */
          <main className="flex-1 flex flex-col min-w-0 bg-[#07070a] overflow-hidden pb-16 lg:pb-0">
            {/* On Mobile/Tablet (screens < 1280px): if activeTab is a dedicated tool like viral/smartcut/captions/intake, show that tool directly */}
            <div className="xl:hidden flex-1 overflow-y-auto">
              {activeTab === 'clips' ? (
                <div className="h-full flex flex-col">
                  <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black min-h-[220px]">
                    <VideoPlayer
                      videoRef={videoRef}
                      videoSrc={videoSrc}
                      videoDuration={videoDuration}
                      currentTime={currentTime}
                      setCurrentTime={(t) => {
                        if (videoRef.current) videoRef.current.currentTime = t;
                        setCurrentTime(t);
                      }}
                      isPlaying={isPlaying}
                      setIsPlaying={setIsPlaying}
                      activeClips={clips}
                      selectedClipId={selectedClipId}
                      setSelectedClipId={setSelectedClipId}
                      filter={filter}
                      overlay={overlay}
                      aspectGuide={aspectGuide}
                      setAspectGuide={setAspectGuide}
                      playbackSpeed={playbackSpeed}
                      setPlaybackSpeed={setPlaybackSpeed}
                      volume={volume}
                      setVolume={setVolume}
                      isMuted={isMuted}
                      setIsMuted={setIsMuted}
                      onOpenIntake={() => handleSelectTab('intake')}
                      onLoadDemoVideo={handleLoadDemoClip}
                      smartZoom={smartZoom}
                      setSmartZoom={setSmartZoom}
                    />
                  </div>
                  <WaveformTimeline
                    duration={videoDuration}
                    currentTime={currentTime}
                    setCurrentTime={(t) => {
                      if (videoRef.current) videoRef.current.currentTime = t;
                      setCurrentTime(t);
                    }}
                    waveformPeaks={waveformPeaks}
                    clips={clips}
                    setClips={setClips}
                    selectedClipId={selectedClipId}
                    setSelectedClipId={setSelectedClipId}
                    onSplitClip={handleSplitClip}
                    onDeleteClip={handleDeleteClip}
                    onDuplicateClip={handleDuplicateClip}
                    onMergeWithNext={handleMergeWithNext}
                  />
                </div>
              ) : (
                <div className="p-3 sm:p-4 pb-24">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {activeTab === 'viral' && '✨ Studio Auto-Clipper AI'}
                      {activeTab === 'smartcut' && '🔇 Smart Cut (Hapus Jeda Hening)'}
                      {activeTab === 'captions' && '📝 Teks, Tegline & Filter'}
                      {activeTab === 'intake' && '📁 Ganti / Import Video'}
                      {activeTab === 'history' && '📜 Riwayat Proyek'}
                      {activeTab === 'settings' && '⚙️ Pengaturan'}
                      {activeTab === 'export' && '🚀 Export Studio'}
                    </span>
                    <button
                      onClick={() => setActiveTab('crop_results')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer"
                    >
                      <span>🔥 Ke Hasil Crop 9:16</span>
                    </button>
                  </div>
                  <div className="glass-panel rounded-2xl border border-white/10 p-3 sm:p-4">
                    {renderActivePanel()}
                  </div>
                </div>
              )}
            </div>

            {/* On Desktop (screens >= 1280px): Studio Viewport with VideoPlayer + Waveform */}
            <div className="hidden xl:flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                <VideoPlayer
                  videoRef={videoRef}
                  videoSrc={videoSrc}
                  videoDuration={videoDuration}
                  currentTime={currentTime}
                  setCurrentTime={(t) => {
                    if (videoRef.current) videoRef.current.currentTime = t;
                    setCurrentTime(t);
                  }}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  activeClips={clips}
                  selectedClipId={selectedClipId}
                  setSelectedClipId={setSelectedClipId}
                  filter={filter}
                  overlay={overlay}
                  aspectGuide={aspectGuide}
                  setAspectGuide={setAspectGuide}
                  playbackSpeed={playbackSpeed}
                  setPlaybackSpeed={setPlaybackSpeed}
                  volume={volume}
                  setVolume={setVolume}
                  isMuted={isMuted}
                  setIsMuted={setIsMuted}
                  onOpenIntake={() => handleSelectTab('intake')}
                  onLoadDemoVideo={handleLoadDemoClip}
                  smartZoom={smartZoom}
                  setSmartZoom={setSmartZoom}
                />
              </div>

              {/* Quick Viral Action Bar */}
              <div className="h-10 px-4 bg-[#0e0e18] border-y border-white/5 flex items-center justify-between z-10 shrink-0 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectTab('crop_results')}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/25 to-rose-500/25 hover:from-amber-500/35 hover:to-rose-500/35 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                  >
                    <span className="text-amber-400">🔥</span>
                    <span>Hasil Crop Viral ({clips.length} Klip Siap Ditonton)</span>
                  </button>
                  <span className="text-slate-400 text-[11px]">
                    Video telah otomatis dipotong & diberi tegline viral
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAspectGuide(aspectGuide === '9:16' ? 'original' : '9:16')}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition cursor-pointer border ${
                      aspectGuide === '9:16'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title="Toggle Framing Format Shorts / Reels (9:16)"
                  >
                    📱 9:16 Shorts/Reels
                  </button>
                </div>
              </div>

              {/* Bottom Half: Audio Waveform & Multi-Clip Timeline */}
              <WaveformTimeline
                duration={videoDuration}
                currentTime={currentTime}
                setCurrentTime={(t) => {
                  if (videoRef.current) videoRef.current.currentTime = t;
                  setCurrentTime(t);
                }}
                waveformPeaks={waveformPeaks}
                clips={clips}
                setClips={setClips}
                selectedClipId={selectedClipId}
                setSelectedClipId={setSelectedClipId}
                onSplitClip={handleSplitClip}
                onDeleteClip={handleDeleteClip}
                onDuplicateClip={handleDuplicateClip}
                onMergeWithNext={handleMergeWithNext}
              />
            </div>
          </main>
        )}

        {/* Right Inspector & Tools Drawer Panel (Desktop - only shown if video is loaded and not in crop_results mode) */}
        {videoSrc && activeTab !== 'crop_results' && (
          <aside className="hidden xl:flex w-80 border-l border-white/10 glass-panel flex-col overflow-hidden shrink-0 z-20">
            {renderActivePanel()}
          </aside>
        )}
      </div>



      {/* Mobile & Tablet Slide-Over Drawer */}
      {isMobileDrawerOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-h-[80vh] rounded-t-3xl border-t border-white/10 flex flex-col shadow-2xl bg-[#0e0e16]/98">
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {activeTab === 'crop_results' && 'Hasil Potong Video Viral'}
                {activeTab === 'intake' && 'Pilih / Upload Video'}
                {activeTab === 'viral' && 'Studio Auto-Clipper AI'}
                {activeTab === 'smartcut' && 'Smart Cut & Audio'}
                {activeTab === 'clips' && 'Daftar & Urutan Klip'}
                {activeTab === 'captions' && 'Teks, Tegline & Filter'}
                {activeTab === 'export' && 'Export Studio'}
                {activeTab === 'history' && 'Riwayat Proyek'}
                {activeTab === 'settings' && 'Pengaturan'}
              </span>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="px-3 py-1 rounded-xl bg-white/10 text-xs font-semibold text-slate-200 hover:bg-white/20 cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-10">
              {renderActivePanel()}
            </div>
          </div>
        </div>
      )}

      {/* Floating Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        videoElement={videoRef.current}
        clips={clips}
        settings={exportSettings}
        setSettings={setExportSettings}
        onSaveHistory={(title, duration, clipCount) => {
          setHistoryItems((prev) => [
            {
              id: `hist-${Date.now()}`,
              title,
              createdAt: Date.now(),
              duration,
              clipCount,
            },
            ...prev,
          ]);
          addToast('success', 'Ekspor selesai dan tersimpan di riwayat!');
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        cobaltEndpoint={cobaltEndpoint}
        setCobaltEndpoint={setCobaltEndpoint}
        cobaltApiKey={cobaltApiKey}
        setCobaltApiKey={setCobaltApiKey}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
