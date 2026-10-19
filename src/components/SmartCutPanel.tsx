import React, { useState } from 'react';
import {
  Wand2,
  Volume2,
  Clock,
  Scissors,
  Flame,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { SmartCutConfig, VideoClip } from '../types';
import { generateAutoHighlights, convertSegmentsToClips } from '../utils/audioAnalysis';

interface SmartCutPanelProps {
  duration: number;
  config: SmartCutConfig;
  setConfig: React.Dispatch<React.SetStateAction<SmartCutConfig>>;
  onRunSmartCut: () => void;
  isAnalyzing: boolean;
  analysisProgress: { percent: number; status: string };
  silenceSegments: { start: number; end: number }[];
  soundSegments: { start: number; end: number }[];
  waveformPeaks: number[];
  onApplySoundClips: (clips: VideoClip[]) => void;
  onPreviewTimeRange: (start: number, end: number) => void;
}

export const SmartCutPanel: React.FC<SmartCutPanelProps> = ({
  duration,
  config,
  setConfig,
  onRunSmartCut,
  isAnalyzing,
  analysisProgress,
  silenceSegments,
  soundSegments,
  waveformPeaks,
  onApplySoundClips,
  onPreviewTimeRange,
}) => {
  const [highlightMode, setHighlightMode] = useState<'15s' | '30s' | '60s' | 'smart_peaks'>('30s');

  const totalSilenceDuration = silenceSegments.reduce((acc, s) => acc + (s.end - s.start), 0);
  const percentSaved = duration > 0 ? Math.round((totalSilenceDuration / duration) * 100) : 0;

  const highlights = generateAutoHighlights(duration || 60, highlightMode, waveformPeaks);

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleApplyAllSoundSegments = () => {
    if (soundSegments.length === 0) return;
    const newClips = convertSegmentsToClips(soundSegments, 'Suara Aktif');
    onApplySoundClips(newClips);
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header card */}
      <div className="glass-card rounded-2xl p-4 border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-indigo-950/20">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-white">Smart Cut Engine</h3>
            <p className="text-[11px] text-slate-400">
              Deteksi hening otomatis & penghapusan jeda kosong menggunakan Web Audio API
            </p>
          </div>
        </div>

        {/* Sensitivitas Slider Controls */}
        <div className="space-y-3 mt-3 pt-3 border-t border-white/5">
          {/* Threshold RMS slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ambang Volume Hening (Threshold)</span>
              </span>
              <span className="font-mono text-cyan-300 text-xs font-semibold">
                {config.thresholdDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-55"
              max="-15"
              step="1"
              value={config.thresholdDb}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, thresholdDb: parseInt(e.target.value, 10) }))
              }
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Lebih Sensitif (-55dB)</span>
              <span>Ketat (-15dB)</span>
            </div>
          </div>

          {/* Min Silence Duration */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>Durasi Hening Minimum</span>
              </span>
              <span className="font-mono text-violet-300 text-xs font-semibold">
                {config.minSilenceDuration.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={config.minSilenceDuration}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, minSilenceDuration: parseFloat(e.target.value) }))
              }
              className="w-full accent-violet-400 cursor-pointer"
            />
          </div>

          {/* Padding buffer */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Padding Kata (Sebelum / Sesudah)</span>
              <span className="font-mono text-slate-400 text-xs">
                {(config.paddingBefore * 1000).toFixed(0)} ms
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.4"
              step="0.05"
              value={config.paddingBefore}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setConfig((prev) => ({ ...prev, paddingBefore: val, paddingAfter: val }));
              }}
              className="w-full accent-slate-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Mencegah kata terpotong mendadak di awal dan akhir jeda.
            </span>
          </div>

          {/* Action Button: Analyze / Run Smart Cut */}
          <button
            onClick={onRunSmartCut}
            disabled={isAnalyzing || duration <= 0}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? analysisProgress.status : 'Jalankan Analisis Audio'}</span>
          </button>
        </div>
      </div>

      {/* Analysis Results & Silence Removal */}
      {soundSegments.length > 0 && (
        <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Hasil Deteksi Audio</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-semibold">
              Hemat {percentSaved}% ({totalSilenceDuration.toFixed(1)}s)
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Terdeteksi <strong className="text-white">{silenceSegments.length} jeda hening</strong>{' '}
            dan <strong className="text-white">{soundSegments.length} segmen suara aktif</strong>.
          </p>

          <button
            onClick={handleApplyAllSoundSegments}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Scissors className="w-4 h-4" />
            <span>Hapus Semua Jeda Hening & Susun Ulang Timeline</span>
          </button>
        </div>
      )}

      {/* Auto Highlight Section */}
      <div className="glass-card rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Auto Highlight
            </span>
          </div>
          <span className="text-[10px] text-slate-400">Rekomendasi Klip</span>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 rounded-xl mb-3 border border-white/5">
          {(['15s', '30s', '60s', 'smart_peaks'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setHighlightMode(m)}
              className={`py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                highlightMode === m
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'smart_peaks' ? 'Puncak' : m}
            </button>
          ))}
        </div>

        {/* Highlight Clips List */}
        <div className="space-y-2">
          {highlights.map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-200">{item.title}</div>
                <div className="text-[10px] font-mono text-cyan-400">
                  {formatSec(item.start)} - {formatSec(item.end)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onPreviewTimeRange(item.start, item.end)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 transition cursor-pointer"
                  title="Preview segmen"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    onApplySoundClips([
                      {
                        id: `highlight-${Date.now()}-${idx}`,
                        name: item.title,
                        startTime: item.start,
                        endTime: item.end,
                        color: '#f59e0b',
                      },
                    ])
                  }
                  className="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-violet-200 text-xs font-semibold transition cursor-pointer"
                >
                  Gunakan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
