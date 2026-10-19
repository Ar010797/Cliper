import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  ArrowLeftToLine,
  ArrowRightToLine,
  Merge,
} from 'lucide-react';
import { VideoClip } from '../types';

interface WaveformTimelineProps {
  duration: number;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  waveformPeaks: number[];
  clips: VideoClip[];
  setClips: React.Dispatch<React.SetStateAction<VideoClip[]>>;
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  onSplitClip: () => void;
  onDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onMergeWithNext: (id: string) => void;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  duration,
  currentTime,
  setCurrentTime,
  waveformPeaks,
  clips,
  setClips,
  selectedClipId,
  setSelectedClipId,
  onSplitClip,
  onDeleteClip,
  onDuplicateClip,
  onMergeWithNext,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1); // 1 = fit, 2 = 2x, etc.
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [trimmingHandle, setTrimmingHandle] = useState<{
    clipId: string;
    handle: 'start' | 'end';
  } | null>(null);

  // Time format helper
  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00.00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${ms < 10 ? '0' : ''}${ms}`;
  };

  // Render waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Subtle background grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(0, 0, width, height);

    // If no waveform peaks loaded yet, draw placeholder subtle wave
    const peaks = waveformPeaks.length > 0
      ? waveformPeaks
      : Array.from({ length: 300 }, (_, i) => 0.2 + 0.15 * Math.sin(i * 0.1) + Math.random() * 0.1);

    const totalBars = peaks.length;
    const barWidth = Math.max(2, width / totalBars);
    const centerY = height / 2;

    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barHeight = Math.max(4, peak * (height * 0.75));

      // Color gradient for audio peaks
      const grad = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
      grad.addColorStop(0, '#8b5cf6');
      grad.addColorStop(0.5, '#06b6d4');
      grad.addColorStop(1, '#8b5cf6');

      ctx.fillStyle = grad;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    });
  }, [waveformPeaks, zoom]);

  // Adjust canvas resolution to parent width
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth * zoom;
        canvasRef.current.height = 64;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom]);

  // Timeline scrubber mouse interaction
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const totalWidth = rect.width * zoom;
    const newTime = Math.max(0, Math.min(duration, (clickX / totalWidth) * duration));
    setCurrentTime(newTime);
    setIsDraggingPlayhead(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || duration <= 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const totalWidth = rect.width * zoom;

      if (isDraggingPlayhead) {
        const moveX = e.clientX - rect.left + scrollLeft;
        const newTime = Math.max(0, Math.min(duration, (moveX / totalWidth) * duration));
        setCurrentTime(newTime);
      } else if (trimmingHandle) {
        const moveX = e.clientX - rect.left + scrollLeft;
        const targetSec = Math.max(0, Math.min(duration, (moveX / totalWidth) * duration));

        setClips((prev) =>
          prev.map((c) => {
            if (c.id !== trimmingHandle.clipId) return c;
            if (trimmingHandle.handle === 'start') {
              const newStart = Math.min(targetSec, c.endTime - 0.2);
              return { ...c, startTime: Number(newStart.toFixed(2)) };
            } else {
              const newEnd = Math.max(targetSec, c.startTime + 0.2);
              return { ...c, endTime: Number(newEnd.toFixed(2)) };
            }
          })
        );
      }
    },
    [duration, isDraggingPlayhead, trimmingHandle, zoom, setCurrentTime, setClips]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
    setTrimmingHandle(null);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead || trimmingHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, trimmingHandle, handleMouseMove, handleMouseUp]);

  // Jump to start / end of selected clip
  const jumpToClipStart = () => {
    const clip = clips.find((c) => c.id === selectedClipId);
    if (clip) setCurrentTime(clip.startTime);
  };
  const jumpToClipEnd = () => {
    const clip = clips.find((c) => c.id === selectedClipId);
    if (clip) setCurrentTime(clip.endTime);
  };

  const totalEditedDuration = clips.reduce((acc, c) => acc + (c.endTime - c.startTime), 0);
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  return (
    <div className="h-68 border-t border-white/10 glass-panel flex flex-col shrink-0 select-none bg-[#09090e]">
      {/* Timeline Controls & Toolbar */}
      <div className="h-11 border-b border-white/5 px-4 flex items-center justify-between bg-black/40 text-xs shrink-0">
        {/* Left: Actions on clips */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSplitClip}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Bagi klip di posisi playhead saat ini (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Split (S)</span>
          </button>

          {selectedClipId && (
            <>
              <button
                onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Hapus klip yang dipilih (Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>

              <button
                onClick={() => selectedClipId && onDuplicateClip(selectedClipId)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Gandakan klip ini"
              >
                <Copy className="w-3.5 h-3.5 text-violet-400" />
                <span className="hidden sm:inline">Duplikat</span>
              </button>

              <button
                onClick={() => selectedClipId && onMergeWithNext(selectedClipId)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Gabungkan dengan klip berikutnya"
              >
                <Merge className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Gabung</span>
              </button>
            </>
          )}

          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Jump to clip markers */}
          <button
            onClick={jumpToClipStart}
            disabled={!selectedClip}
            className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 disabled:opacity-40 flex items-center justify-center transition cursor-pointer"
            title="Lompat ke awal klip"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={jumpToClipEnd}
            disabled={!selectedClip}
            className="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-300 disabled:opacity-40 flex items-center justify-center transition cursor-pointer"
            title="Lompat ke akhir klip"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Zoom controls & Summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-white/10 cursor-pointer"
              title="Perkecil Timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">{zoom.toFixed(1)}x</span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-white/10 cursor-pointer"
              title="Perbesar Timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:bg-white/10 cursor-pointer"
              title="Fit to Screen"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Total Edit:</span>
            <span className="text-cyan-400 font-bold">{formatTime(totalEditedDuration)}</span>
          </div>
        </div>
      </div>

      {/* Interactive Timeline Track Canvas & Multi-Clips */}
      <div
        ref={containerRef}
        onMouseDown={handleTimelineMouseDown}
        className="relative flex-1 overflow-x-auto overflow-y-hidden bg-[#0a0a0f] cursor-crosshair select-none"
      >
        <div
          style={{ width: `${100 * zoom}%`, minWidth: '100%' }}
          className="relative h-full flex flex-col justify-between"
        >
          {/* Time Ruler (Seconds markers) */}
          <div className="h-6 border-b border-white/5 relative flex items-center pointer-events-none">
            {duration > 0 &&
              Array.from({ length: Math.ceil(duration / (zoom > 1.5 ? 2 : 5)) + 1 }).map((_, i) => {
                const interval = zoom > 1.5 ? 2 : 5;
                const sec = i * interval;
                if (sec > duration) return null;
                const pct = (sec / duration) * 100;
                return (
                  <div
                    key={i}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 bottom-0 flex flex-col justify-between"
                  >
                    <span className="text-[9px] font-mono text-slate-400 -translate-x-1/2">
                      {formatTime(sec).slice(0, 5)}
                    </span>
                    <div className="h-2 w-px bg-white/20" />
                  </div>
                );
              })}
          </div>

          {/* Audio Waveform Canvas */}
          <div className="h-16 relative flex items-center">
            <canvas ref={canvasRef} className="w-full h-16 pointer-events-none opacity-85" />
          </div>

          {/* Clips Blocks Track */}
          <div className="h-16 relative border-t border-white/5 bg-black/20 flex items-center px-1">
            {duration > 0 &&
              clips.map((clip) => {
                const isSelected = clip.id === selectedClipId;
                const leftPct = (clip.startTime / duration) * 100;
                const widthPct = ((clip.endTime - clip.startTime) / duration) * 100;

                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClipId(clip.id);
                      setCurrentTime(clip.startTime);
                    }}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                    }}
                    className={`absolute top-1.5 bottom-1.5 rounded-xl border flex flex-col justify-center px-2 cursor-pointer transition-all group overflow-hidden ${
                      isSelected
                        ? 'bg-violet-600/40 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] z-10'
                        : 'bg-white/10 hover:bg-white/15 border-white/15'
                    }`}
                  >
                    {/* In-point Trim Handle (Left) */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        setTrimmingHandle({ clipId: clip.id, handle: 'start' });
                      }}
                      className="absolute left-0 top-0 bottom-0 w-2.5 bg-cyan-400/80 hover:bg-cyan-300 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-l"
                      title="Tarik untuk memotong IN point"
                    >
                      <div className="w-0.5 h-3 bg-black/60 rounded-full" />
                    </div>

                    {/* Clip Content Label */}
                    <div className="truncate text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="truncate">{clip.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-300">
                      {formatTime(clip.endTime - clip.startTime)}
                    </div>

                    {/* Out-point Trim Handle (Right) */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(clip.id);
                        setTrimmingHandle({ clipId: clip.id, handle: 'end' });
                      }}
                      className="absolute right-0 top-0 bottom-0 w-2.5 bg-violet-400/80 hover:bg-violet-300 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-r"
                      title="Tarik untuk memotong OUT point"
                    >
                      <div className="w-0.5 h-3 bg-black/60 rounded-full" />
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Playhead Scrub Line */}
          {duration > 0 && (
            <div
              style={{ left: `${(currentTime / duration) * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-20 transition-[left] duration-75"
            >
              {/* Playhead Thumb Head */}
              <div className="w-4 h-4 -ml-[7px] -mt-1 bg-cyan-400 rounded-b-md shadow-lg shadow-cyan-400/50 flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing">
                <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer shortcut hints */}
      <div className="h-6 border-t border-white/5 px-4 flex items-center justify-between text-[10px] text-slate-400 font-mono bg-black/50 shrink-0">
        <div className="truncate">
          Shortcuts: Space (Play/Pause) · S (Split) · I/O (Trim) · J/K/L (Scrub) · Delete (Hapus)
        </div>
        <div className="text-cyan-400">
          {clips.length} Klip Aktif
        </div>
      </div>
    </div>
  );
};
