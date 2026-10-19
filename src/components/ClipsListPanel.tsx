import React from 'react';
import {
  Layers,
  Trash2,
  Copy,
  Scissors,
  Play,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { VideoClip } from '../types';

interface ClipsListPanelProps {
  clips: VideoClip[];
  setClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  selectedClipId: string | null;
  setSelectedClipId: (id: string) => void;
  onPreviewClip: (clip: VideoClip) => void;
  onDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
}

export const ClipsListPanel: React.FC<ClipsListPanelProps> = ({
  clips,
  setClips,
  selectedClipId,
  setSelectedClipId,
  onPreviewClip,
  onDeleteClip,
  onDuplicateClip,
}) => {
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  const formatSec = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00.00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
  };

  // Re-order clips
  const moveClip = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= clips.length) return;
    const newClips = [...clips];
    const temp = newClips[index];
    newClips[index] = newClips[newIndex];
    newClips[newIndex] = temp;
    setClips(newClips);
  };

  // Fine-tune trim
  const adjustTrim = (clipId: string, boundary: 'start' | 'end', delta: number) => {
    setClips((prev) =>
      prev.map((c) => {
        if (c.id !== clipId) return c;
        if (boundary === 'start') {
          const newStart = Math.max(0, Math.min(c.endTime - 0.2, c.startTime + delta));
          return { ...c, startTime: Number(newStart.toFixed(2)) };
        } else {
          const newEnd = Math.max(c.startTime + 0.2, c.endTime + delta);
          return { ...c, endTime: Number(newEnd.toFixed(2)) };
        }
      })
    );
  };

  // Rename clip
  const renameClip = (clipId: string, newName: string) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, name: newName } : c))
    );
  };

  // Toggle mute on clip
  const toggleClipMute = (clipId: string) => {
    setClips((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, isMuted: !c.isMuted } : c))
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Selected Clip Inspector Card */}
      {selectedClip ? (
        <div className="glass-card rounded-2xl p-4 border border-violet-500/30 bg-violet-950/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">
              Inspektur Klip
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleClipMute(selectedClip.id)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                title={selectedClip.isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
              >
                {selectedClip.isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
              <button
                onClick={() => onDuplicateClip(selectedClip.id)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                title="Gandakan Klip"
              >
                <Copy className="w-3.5 h-3.5 text-violet-400" />
              </button>
              <button
                onClick={() => onDeleteClip(selectedClip.id)}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                title="Hapus Klip"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Name input */}
          <input
            type="text"
            value={selectedClip.name}
            onChange={(e) => renameClip(selectedClip.id, e.target.value)}
            className="w-full text-xs font-bold bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white mb-3 focus:outline-none focus:border-violet-500"
          />

          {/* In / Out timecode controls */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
              <div className="text-[10px] text-slate-400 font-sans mb-1">IN Point</div>
              <div className="text-cyan-400 font-bold mb-2">
                {formatSec(selectedClip.startTime)}
              </div>
              <div className="flex gap-1 font-sans">
                <button
                  onClick={() => adjustTrim(selectedClip.id, 'start', -0.1)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] cursor-pointer"
                >
                  -0.1s
                </button>
                <button
                  onClick={() => adjustTrim(selectedClip.id, 'start', 0.1)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] cursor-pointer"
                >
                  +0.1s
                </button>
              </div>
            </div>

            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
              <div className="text-[10px] text-slate-400 font-sans mb-1">OUT Point</div>
              <div className="text-violet-400 font-bold mb-2">
                {formatSec(selectedClip.endTime)}
              </div>
              <div className="flex gap-1 font-sans">
                <button
                  onClick={() => adjustTrim(selectedClip.id, 'end', -0.1)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] cursor-pointer"
                >
                  -0.1s
                </button>
                <button
                  onClick={() => adjustTrim(selectedClip.id, 'end', 0.1)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] cursor-pointer"
                >
                  +0.1s
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => onPreviewClip(selectedClip)}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/30 text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Putar Preview Klip Ini</span>
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 border border-white/5 text-center text-xs text-slate-400">
          Pilih klip pada daftar di bawah atau di timeline untuk memeriksa detailnya.
        </div>
      )}

      {/* List of all clips */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span>Semua Klip ({clips.length})</span>
          <span className="text-[11px] font-mono text-cyan-400 font-normal">
            Total:{' '}
            {formatSec(clips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0))}
          </span>
        </div>

        <div className="space-y-1.5">
          {clips.map((clip, idx) => {
            const isSelected = clip.id === selectedClipId;
            return (
              <div
                key={clip.id}
                onClick={() => setSelectedClipId(clip.id)}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600/30 border-cyan-400 shadow-md shadow-violet-600/10'
                    : 'bg-white/5 hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 w-4">{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs font-bold text-white truncate">{clip.name}</div>
                      {clip.viralScore && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          🔥 {clip.viralScore}%
                        </span>
                      )}
                    </div>
                    {clip.tagline && (
                      <div className="text-[10px] text-amber-300/90 truncate max-w-[180px]">
                        "{clip.tagline}"
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-cyan-400">
                      {formatSec(clip.startTime)} - {formatSec(clip.endTime)} (
                      {formatSec(clip.endTime - clip.startTime)})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => moveClip(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 disabled:opacity-20 cursor-pointer"
                    title="Pindahkan ke atas"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveClip(idx, 'down')}
                    disabled={idx === clips.length - 1}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 disabled:opacity-20 cursor-pointer"
                    title="Pindahkan ke bawah"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteClip(clip.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 cursor-pointer ml-1"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
