import React, { useState } from 'react';
import {
  Flame,
  Sparkles,
  Play,
  Scissors,
  Type,
  Copy,
  Check,
  RefreshCw,
  Hash,
  Share2,
  TrendingUp,
  Tag,
  Zap,
  CheckCircle2,
  Layers,
  Download,
  Bot,
  AlertCircle,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import {
  ExportSettings,
  OverlayPresetStyle,
  SuggestedTitle,
  TextOverlay,
  VideoClip,
  ViralMoment,
  ViralTopic,
} from '../types';
import {
  VIRAL_TOPICS,
  detectViralMoments,
  convertViralMomentsToClips,
  extractContextFromTitle,
} from '../utils/viralClipper';
import { renderClipsToVideo } from '../utils/exportEngine';

interface ViralClipperPanelProps {
  duration: number;
  waveformPeaks: number[];
  onApplyClips: (clips: VideoClip[]) => void;
  onPreviewTimeRange: (start: number, end: number) => void;
  overlay: TextOverlay;
  setOverlay: React.Dispatch<React.SetStateAction<TextOverlay>>;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onSwitchToAspectGuide?: (guide: '9:16') => void;
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  videoElement: HTMLVideoElement | null;
  exportSettings: ExportSettings;
}

export const ViralClipperPanel: React.FC<ViralClipperPanelProps> = ({
  duration,
  waveformPeaks,
  onApplyClips,
  onPreviewTimeRange,
  overlay,
  setOverlay,
  onToast,
  onSwitchToAspectGuide,
  projectName,
  onUpdateProjectName,
  videoElement,
  exportSettings,
}) => {
  const contextInfo = extractContextFromTitle(projectName);
  const [selectedTopic, setSelectedTopic] = useState<ViralTopic>(() => {
    return contextInfo.detectedTopic !== 'general' ? contextInfo.detectedTopic : 'podcast';
  });
  const [customKeyword, setCustomKeyword] = useState<string>(() => contextInfo.keyword || '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Gemini AI Suggest Auto-Title state
  const [suggestedTitles, setSuggestedTitles] = useState<SuggestedTitle[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState<boolean>(false);
  const [copiedTitleIndex, setCopiedTitleIndex] = useState<number | null>(null);
  const [titleSourceNotice, setTitleSourceNotice] = useState<string | null>(null);

  // Batch download and single clip download state
  const [isBatchDownloading, setIsBatchDownloading] = useState<boolean>(false);
  const [downloadingClipId, setDownloadingClipId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    status: string;
  } | null>(null);

  // Compute viral moments
  const viralMoments: ViralMoment[] = React.useMemo(() => {
    return detectViralMoments(duration, waveformPeaks, selectedTopic, customKeyword, projectName, 'adaptive');
  }, [duration, waveformPeaks, selectedTopic, customKeyword, projectName]);

  const currentTopicInfo = VIRAL_TOPICS.find((t) => t.id === selectedTopic) || VIRAL_TOPICS[0];

  // Helper format time
  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Suggest Auto-Title using Gemini API
  const handleSuggestTitlesWithGemini = async () => {
    setIsGeneratingTitles(true);
    setTitleSourceNotice(null);

    try {
      const response = await fetch('/api/gemini/suggest-titles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          duration,
          topic: currentTopicInfo.name,
          customKeyword,
          moments: viralMoments,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server status ${response.status}`);
      }

      const data = await response.json();
      if (data.titles && Array.isArray(data.titles) && data.titles.length > 0) {
        setSuggestedTitles(data.titles);
        if (data.isAiGenerated) {
          setTitleSourceNotice('Dihasilkan langsung oleh Gemini 3.8 Flash AI');
          onToast('success', '✨ 3 Rekomendasi judul viral berhasil dibuat oleh Gemini AI!');
        } else {
          setTitleSourceNotice('Dihasilkan dari formula judul viral teruji');
          onToast('info', '3 Rekomendasi judul viral siap digunakan!');
        }
      } else {
        throw new Error('Tidak ada judul yang dihasilkan');
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Gagal meminta saran judul Gemini:', error);
      onToast('error', `Gagal membuat judul: ${error.message}`);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // 1-Click: Auto Clip All Viral Moments
  const handleAutoClipAll = () => {
    if (viralMoments.length === 0) return;

    const clips = convertViralMomentsToClips(viralMoments);
    onApplyClips(clips);

    // Apply primary tagline to video overlay
    const topMoment = viralMoments[0];
    setOverlay({
      enabled: true,
      text: topMoment.tagline,
      position: 'top',
      fontSize: 26,
      textColor: '#fde047',
      bgColor: 'rgba(0, 0, 0, 0.85)',
      fontStyle: 'bold',
      presetStyle: 'tiktok_yellow',
      taglineBadge: topMoment.taglineBadge,
    });

    if (onSwitchToAspectGuide) {
      onSwitchToAspectGuide('9:16');
    }

    onToast(
      'success',
      `⚡ Berhasil memotong ${clips.length} klip viral otomatis dan menyusunnya di timeline!`
    );
  };

  // Batch Export & Download All Viral Clips as Multiple Video Files
  const handleBatchDownloadAllViralClips = async () => {
    if (!videoElement) {
      onToast('error', 'Video belum siap untuk dipotong dan didownload.');
      return;
    }

    if (viralMoments.length === 0) {
      onToast('error', 'Tidak ada momen viral yang terdeteksi untuk didownload.');
      return;
    }

    // Automatically apply clips to timeline first
    const clips = convertViralMomentsToClips(viralMoments);
    onApplyClips(clips);

    setIsBatchDownloading(true);
    setBatchProgress({
      current: 1,
      total: viralMoments.length,
      percent: 5,
      status: `Menyiapkan ${viralMoments.length} klip viral...`,
    });

    try {
      for (let i = 0; i < viralMoments.length; i++) {
        const moment = viralMoments[i];
        const singleClip: VideoClip = {
          id: `batch-${Date.now()}-${i}`,
          name: moment.title.replace(/[🔥⚡💡😱🚀]/g, '').trim(),
          startTime: moment.startTime,
          endTime: moment.endTime,
          color: '#f59e0b',
          tagline: moment.tagline,
          taglineBadge: moment.taglineBadge,
          viralScore: moment.viralScore,
        };

        // Render single clip with its specific tagline burned in
        const clipSettings: ExportSettings = {
          ...exportSettings,
          overlay: {
            ...overlay,
            enabled: true,
            text: moment.tagline,
            position: 'top',
            textColor: '#fde047',
            bgColor: 'rgba(0, 0, 0, 0.85)',
            fontStyle: 'bold',
            presetStyle: 'tiktok_yellow',
            taglineBadge: moment.taglineBadge,
          },
        };

        setBatchProgress({
          current: i + 1,
          total: viralMoments.length,
          percent: Math.round(((i) / viralMoments.length) * 100),
          status: `Merender klip ${i + 1}/${viralMoments.length} ("${moment.title}")...`,
        });

        const result = await renderClipsToVideo(
          videoElement,
          [singleClip],
          clipSettings,
          (prog) => {
            const clipPct = prog.percent || 0;
            const overallPct = Math.round(((i + clipPct / 100) / viralMoments.length) * 100);
            setBatchProgress({
              current: i + 1,
              total: viralMoments.length,
              percent: overallPct,
              status: `Merender klip ${i + 1}/${viralMoments.length} (${clipPct}%)...`,
            });
          }
        );

        // Auto download file
        const cleanName = moment.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
        const filename = `Clip_${i + 1}_${cleanName}.${clipSettings.format === 'webm' ? 'webm' : 'mp4'}`;
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Pause briefly before next download so browser handles sequential downloads smoothly
        await new Promise((r) => setTimeout(r, 400));
      }

      onToast(
        'success',
        `🎉 Selesai! Semua ${viralMoments.length} klip video viral berhasil dipotong dan didownload!`
      );
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Batch download error:', error);
      onToast('error', `Gagal mendownload beberapa klip: ${error.message}`);
    } finally {
      setIsBatchDownloading(false);
      setBatchProgress(null);
    }
  };

  // Download Single Individual Clip
  const handleDownloadSingleClip = async (moment: ViralMoment) => {
    if (!videoElement) {
      onToast('error', 'Video belum siap untuk dipotong.');
      return;
    }

    setDownloadingClipId(moment.id);
    onToast('info', `Mulai merender klip "${moment.title}"...`);

    try {
      const singleClip: VideoClip = {
        id: `single-${Date.now()}`,
        name: moment.title.replace(/[🔥⚡💡😱🚀]/g, '').trim(),
        startTime: moment.startTime,
        endTime: moment.endTime,
        color: '#f59e0b',
        tagline: moment.tagline,
        taglineBadge: moment.taglineBadge,
        viralScore: moment.viralScore,
      };

      const clipSettings: ExportSettings = {
        ...exportSettings,
        overlay: {
          ...overlay,
          enabled: true,
          text: moment.tagline,
          position: 'top',
          textColor: '#fde047',
          bgColor: 'rgba(0, 0, 0, 0.85)',
          fontStyle: 'bold',
          presetStyle: 'tiktok_yellow',
          taglineBadge: moment.taglineBadge,
        },
      };

      const result = await renderClipsToVideo(
        videoElement,
        [singleClip],
        clipSettings,
        () => {}
      );

      const cleanName = moment.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      const filename = `Viral_${cleanName}.${clipSettings.format === 'webm' ? 'webm' : 'mp4'}`;
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onToast('success', `Klip "${filename}" berhasil didownload!`);
    } catch (err: unknown) {
      const error = err as Error;
      onToast('error', `Gagal download klip: ${error.message}`);
    } finally {
      setDownloadingClipId(null);
    }
  };

  // Apply specific tagline to overlay
  const handleApplyTagline = (moment: ViralMoment, customTagline?: string) => {
    const textToApply = customTagline || moment.tagline;
    setOverlay({
      enabled: true,
      text: textToApply,
      position: 'top',
      fontSize: 26,
      textColor: '#fde047',
      bgColor: 'rgba(0, 0, 0, 0.85)',
      fontStyle: 'bold',
      presetStyle: 'tiktok_yellow',
      taglineBadge: moment.taglineBadge,
    });
    onToast('success', `Tegline terpasang di video: "${textToApply}"`);
  };

  // Apply single moment as clip to timeline
  const handleApplySingleClip = (moment: ViralMoment) => {
    const newClip: VideoClip = {
      id: `clip-${Date.now()}`,
      name: moment.title.replace(/[🔥⚡💡😱🚀]/g, '').trim(),
      startTime: moment.startTime,
      endTime: moment.endTime,
      color: '#f59e0b',
      tagline: moment.tagline,
      taglineBadge: moment.taglineBadge,
      viralScore: moment.viralScore,
    };
    onApplyClips([newClip]);
    handleApplyTagline(moment);
    onToast('success', `Klip "${newClip.name}" dimasukkan ke timeline!`);
  };

  // Copy tagline with hashtags
  const handleCopyTagline = (text: string, id: string) => {
    const tags = currentTopicInfo.hashtags.join(' ');
    const fullText = `${text}\n\n${tags}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      onToast('info', 'Tegline & hashtag viral disalin ke clipboard!');
    });
  };

  // Copy suggested title
  const handleCopyTitle = (item: SuggestedTitle, idx: number) => {
    const text = `${item.title}\n\n${item.hashtags.join(' ')}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTitleIndex(idx);
      setTimeout(() => setCopiedTitleIndex(null), 2000);
      onToast('info', 'Judul dan hashtag disalin ke clipboard!');
    });
  };

  // Apply suggested title as project title
  const handleApplyAsProjectTitle = (item: SuggestedTitle) => {
    onUpdateProjectName(item.title);
    onToast('success', `Judul proyek diperbarui: "${item.title}"`);
  };

  // Apply suggested title as overlay tagline
  const handleApplyTitleAsOverlay = (item: SuggestedTitle) => {
    setOverlay({
      enabled: true,
      text: item.title,
      position: 'top',
      fontSize: 26,
      textColor: '#fde047',
      bgColor: 'rgba(0, 0, 0, 0.85)',
      fontStyle: 'bold',
      presetStyle: 'tiktok_yellow',
      taglineBadge: '🔥 ' + item.hookFormula.toUpperCase(),
    });
    onToast('success', `Judul dijadikan tegline video: "${item.title}"`);
  };

  // Apply preset styling to overlay
  const handleSelectStyle = (style: OverlayPresetStyle) => {
    if (style === 'tiktok_yellow') {
      setOverlay((prev) => ({
        ...prev,
        presetStyle: 'tiktok_yellow',
        textColor: '#fde047',
        bgColor: 'rgba(0, 0, 0, 0.85)',
        fontStyle: 'bold',
      }));
    } else if (style === 'neon_glow') {
      setOverlay((prev) => ({
        ...prev,
        presetStyle: 'neon_glow',
        textColor: '#38bdf8',
        bgColor: 'rgba(15, 23, 42, 0.9)',
        fontStyle: 'bold',
      }));
    } else if (style === 'minimal_pill') {
      setOverlay((prev) => ({
        ...prev,
        presetStyle: 'minimal_pill',
        textColor: '#ffffff',
        bgColor: 'rgba(0, 0, 0, 0.7)',
        fontStyle: 'bold',
      }));
    } else if (style === 'news_banner') {
      setOverlay((prev) => ({
        ...prev,
        presetStyle: 'news_banner',
        textColor: '#ffffff',
        bgColor: '#dc2626',
        fontStyle: 'bold',
      }));
    }
    onToast('info', `Gaya tegline diubah ke: ${style}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Batch Downloading Progress Notification Modal */}
      {isBatchDownloading && batchProgress && (
        <div className="glass-card rounded-2xl p-4 border border-cyan-500/40 bg-cyan-950/40 space-y-2.5 shadow-2xl animate-pulse">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span>Memproses Download Klip Viral...</span>
            </span>
            <span className="font-mono text-cyan-300">
              Klip {batchProgress.current} dari {batchProgress.total} ({batchProgress.percent}%)
            </span>
          </div>

          <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, batchProgress.percent)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-300 leading-tight">
            {batchProgress.status} Video akan otomatis tersimpan di folder download Anda satu per satu.
          </p>
        </div>
      )}

      {/* Header Banner with Cutting & Batch Download Actions */}
      <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-purple-950/30 to-indigo-950/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
          <Flame className="w-24 h-24 text-amber-500" />
        </div>

        <div className="flex items-center gap-2.5 mb-2 relative z-10">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-white">
                Kliper Otomatis Potensi Viral
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PRO VIRAL
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Potong otomatis bagian video yang paling menarik penonton & download beberapa klip sekaligus
            </p>
          </div>
        </div>

        {/* Master Actions: Cut & Batch Download Multiple Clips */}
        <div className="mt-3 pt-3 border-t border-white/10 relative z-10 space-y-2">
          {/* Primary Action 1: Cut & Download All Clips Directly */}
          <button
            onClick={handleBatchDownloadAllViralClips}
            disabled={duration <= 0 || isBatchDownloading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isBatchDownloading ? 'animate-bounce' : ''}`} />
            <span>
              {isBatchDownloading
                ? `Mendownload Klip ${batchProgress?.current || 1}/${viralMoments.length}...`
                : `⚡ Potong & Download Semua ${viralMoments.length} Klip Viral (Batch Download)`}
            </span>
          </button>

          {/* Secondary Action: Cut & Arrange on Timeline only */}
          <button
            onClick={handleAutoClipAll}
            disabled={duration <= 0 || isBatchDownloading}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-300" />
            <span>Susun {viralMoments.length} Klip ke Timeline Editor</span>
          </button>
        </div>
      </div>

      {/* Suggest Auto-Title Feature Card (Gemini AI) */}
      <div className="glass-card rounded-2xl p-4 border border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-indigo-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>Saran Judul Viral (Gemini AI)</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  AI
                </span>
              </h4>
              <p className="text-[10px] text-slate-400">
                Analisis video & ajukan 3 judul menarik siap viral
              </p>
            </div>
          </div>

          <button
            onClick={handleSuggestTitlesWithGemini}
            disabled={isGeneratingTitles || duration <= 0}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-50"
          >
            <Bot className={`w-3.5 h-3.5 ${isGeneratingTitles ? 'animate-spin' : ''}`} />
            <span>{isGeneratingTitles ? 'Menganalisis...' : 'Generate Judul'}</span>
          </button>
        </div>

        {/* Notice on source */}
        {titleSourceNotice && (
          <div className="text-[10px] text-cyan-300 bg-cyan-950/30 px-2.5 py-1 rounded-lg border border-cyan-500/20 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{titleSourceNotice}</span>
          </div>
        )}

        {/* Generated Titles Display */}
        {suggestedTitles.length > 0 && (
          <div className="space-y-2.5 pt-1">
            {suggestedTitles.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-black/50 border border-white/10 hover:border-violet-500/40 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-500/30">
                        #{idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.hookFormula}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white tracking-wide leading-snug">
                      "{item.title}"
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyTitle(item, idx)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
                    title="Salin Judul & Hashtag"
                  >
                    {copiedTitleIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight">
                  💡 <span className="text-slate-300 font-medium">Alasan Viral:</span> {item.viralReason}
                </p>

                {/* Hashtag chips */}
                {item.hashtags && item.hashtags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {item.hashtags
                      .flatMap((t) => t.split(/[, ]+/))
                      .filter((t) => t.trim().length > 0)
                      .map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[9px] font-mono text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                  </div>
                )}

                {/* Quick Action Buttons for Suggested Title */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5">
                  <button
                    onClick={() => handleApplyAsProjectTitle(item)}
                    className="py-1 px-2 rounded-lg bg-white/5 hover:bg-violet-600/30 text-[10px] font-semibold text-slate-200 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>📌 Judul Proyek</span>
                  </button>
                  <button
                    onClick={() => handleApplyTitleAsOverlay(item)}
                    className="py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-[10px] font-bold text-amber-300 transition flex items-center justify-center gap-1 cursor-pointer border border-amber-500/30"
                  >
                    <Type className="w-3 h-3" />
                    <span>Jadikan Tegline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discussion Topic Selector */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Topik Pembahasan Video
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">Agar tegline relevan & tepat sasaran</span>
        </div>

        {/* Topic Grid Chips */}
        <div className="grid grid-cols-3 gap-1.5">
          {VIRAL_TOPICS.map((topic) => {
            const isSelected = selectedTopic === topic.id;
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`py-2 px-2 rounded-xl text-left transition cursor-pointer border ${
                  isSelected
                    ? 'bg-violet-600/30 border-violet-500 text-white shadow-sm'
                    : 'bg-black/30 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="text-sm">{topic.icon}</div>
                <div className="text-[11px] font-semibold truncate mt-0.5">{topic.name}</div>
              </button>
            );
          })}
        </div>

        {/* Custom Topic Keyword Input */}
        <div>
          <label className="text-[11px] text-slate-300 block mb-1">
            Kata Kunci Pembahasan Khusus (Opsional):
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              placeholder="Contoh: Resep Masak, Kripto, Sepakbola, Skincare..."
              className="flex-1 text-xs bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            {customKeyword && (
              <button
                onClick={() => setCustomKeyword('')}
                className="px-2 py-2 text-xs text-slate-400 hover:text-white"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tegline Visual Style Preset Selector */}
      <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Gaya Visual Tegline
            </h4>
          </div>
          <span className="text-[10px] font-mono text-cyan-300">
            {overlay.enabled ? 'Aktif di Video' : 'Nonaktif'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleSelectStyle('tiktok_yellow')}
            className={`p-2 rounded-xl border text-left cursor-pointer transition ${
              overlay.presetStyle === 'tiktok_yellow'
                ? 'bg-amber-500/20 border-amber-500/60 text-white'
                : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="text-xs font-bold text-yellow-300">🟡 TikTok Yellow</div>
            <div className="text-[10px] text-slate-400">Teks kuning tebal, font viral</div>
          </button>

          <button
            onClick={() => handleSelectStyle('neon_glow')}
            className={`p-2 rounded-xl border text-left cursor-pointer transition ${
              overlay.presetStyle === 'neon_glow'
                ? 'bg-cyan-500/20 border-cyan-500/60 text-white'
                : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="text-xs font-bold text-cyan-300">💎 Cyber Glow</div>
            <div className="text-[10px] text-slate-400">Nuansa biru neon futuristik</div>
          </button>

          <button
            onClick={() => handleSelectStyle('minimal_pill')}
            className={`p-2 rounded-xl border text-left cursor-pointer transition ${
              overlay.presetStyle === 'minimal_pill'
                ? 'bg-violet-500/20 border-violet-500/60 text-white'
                : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="text-xs font-bold text-slate-200">🖤 Minimal Pill</div>
            <div className="text-[10px] text-slate-400">Badge kapsul gelap elegan</div>
          </button>

          <button
            onClick={() => handleSelectStyle('news_banner')}
            className={`p-2 rounded-xl border text-left cursor-pointer transition ${
              overlay.presetStyle === 'news_banner'
                ? 'bg-red-500/20 border-red-500/60 text-white'
                : 'bg-black/30 border-white/5 text-slate-300 hover:bg-white/5'
            }`}
          >
            <div className="text-xs font-bold text-red-400">🔴 Breaking Alert</div>
            <div className="text-[10px] text-slate-400">Banner merah tegas mencolok</div>
          </button>
        </div>
      </div>

      {/* Detected Viral Moments List with Individual Download Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Daftar Klip Viral Terdeteksi ({viralMoments.length})
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">Paling Menarik Penonton</span>
        </div>

        {viralMoments.map((moment) => (
          <div
            key={moment.id}
            className="glass-card rounded-2xl p-4 border border-white/10 hover:border-amber-500/40 transition space-y-3 bg-[#0d0d18]"
          >
            {/* Top row: Score + Title + Timecode */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">{moment.title}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>{moment.viralScore}% Viral</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
                    {moment.taglineBadge}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-cyan-400 mt-1 flex items-center gap-2">
                  <span>
                    {formatSec(moment.startTime)} - {formatSec(moment.endTime)}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 font-sans">
                    Durasi: {(moment.endTime - moment.startTime).toFixed(1)} detik
                  </span>
                </div>
              </div>

              {/* Quick Preview Button */}
              <button
                onClick={() => onPreviewTimeRange(moment.startTime, moment.endTime)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-200 transition cursor-pointer shrink-0"
                title="Preview Momen Ini"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>

            {/* Why this part is viral */}
            <p className="text-[11px] text-slate-400 leading-relaxed bg-black/30 p-2 rounded-xl border border-white/5">
              💡 <span className="text-slate-300 font-medium">Alasan Menarik:</span> {moment.reason}
            </p>

            {/* Tagline Box */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/30 to-violet-950/20 border border-amber-500/25 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  <span>Tegline Otomatis:</span>
                </span>
                <button
                  onClick={() => handleCopyTagline(moment.tagline, moment.id)}
                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === moment.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin + Tag</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs font-bold text-white bg-black/50 p-2.5 rounded-lg border border-white/10 tracking-wide leading-relaxed">
                "{moment.tagline}"
              </div>

              {/* Alternative Taglines selector */}
              {moment.suggestedTaglines.length > 1 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-slate-400">Pilihan variasi tegline lain:</div>
                  <div className="space-y-1">
                    {moment.suggestedTaglines.slice(1, 4).map((alt, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleApplyTagline(moment, alt)}
                        className="w-full text-left p-1.5 rounded-lg text-[10px] text-slate-300 hover:text-white bg-white/5 hover:bg-violet-600/30 transition truncate block cursor-pointer border border-transparent hover:border-violet-500/30"
                      >
                        ⚡ "{alt}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons including direct Download Clip */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => handleApplyTagline(moment)}
                className="py-2 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition flex items-center justify-center gap-1 cursor-pointer truncate"
                title="Pasang tegline ini ke teks overlay video"
              >
                <Type className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Pasang Tegline</span>
              </button>

              <button
                onClick={() => handleApplySingleClip(moment)}
                className="py-2 px-2 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate"
                title="Tambahkan momen ini sebagai klip di timeline"
              >
                <Scissors className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Jadikan Klip</span>
              </button>

              <button
                onClick={() => handleDownloadSingleClip(moment)}
                disabled={downloadingClipId === moment.id || isBatchDownloading}
                className="py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer truncate disabled:opacity-50"
                title="Download langsung segmen klip viral ini"
              >
                <Download className={`w-3.5 h-3.5 shrink-0 ${downloadingClipId === moment.id ? 'animate-bounce' : ''}`} />
                <span className="truncate">
                  {downloadingClipId === moment.id ? 'Render...' : 'Download'}
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
