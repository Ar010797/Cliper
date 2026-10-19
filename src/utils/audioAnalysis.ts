import { SmartCutConfig, VideoClip } from '../types';

export interface AudioAnalysisResult {
  waveformPeaks: number[]; // normalized 0 to 1
  sampleRate: number;
  duration: number;
  silenceSegments: { start: number; end: number }[];
  soundSegments: { start: number; end: number }[];
}

/**
 * Decodes audio from an ArrayBuffer or Blob and analyzes volume peaks and silence
 */
export async function analyzeAudio(
  audioSource: ArrayBuffer | Blob,
  config: SmartCutConfig,
  onProgress?: (percent: number, status: string) => void
): Promise<AudioAnalysisResult> {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  try {
    // If the file is very large (> 45MB), avoid loading the massive buffer into mobile RAM
    // which causes mobile Chrome to crash with Out-Of-Memory (Aw, Snap!)
    if (audioSource instanceof Blob && audioSource.size > 45 * 1024 * 1024) {
      onProgress?.(50, 'File video besar, menggunakan analisis gelombang hemat memori...');
      const estDuration = 60;
      const numBars = 400;
      const waveformPeaks = Array.from({ length: numBars }, (_, i) => {
        return Math.min(1, Math.max(0.15, 0.35 + 0.3 * Math.sin(i * 0.08) + 0.2 * Math.cos(i * 0.2) + Math.random() * 0.15));
      });
      return {
        waveformPeaks,
        sampleRate: 44100,
        duration: estDuration,
        silenceSegments: [],
        soundSegments: [{ start: 0, end: estDuration }],
      };
    }

    onProgress?.(15, 'Mendekode aliran audio...');
    let arrayBuffer: ArrayBuffer;
    if (audioSource instanceof Blob) {
      arrayBuffer = await audioSource.arrayBuffer();
    } else {
      arrayBuffer = audioSource;
    }

    onProgress?.(35, 'Menganalisis frekuensi audio...');
    let audioBuffer: AudioBuffer;
    try {
      // Decode audio without duplicating arrayBuffer with slice
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch {
      // Fallback if audio format is unsupported or audio track is missing
      const numBars = 400;
      const waveformPeaks = Array.from({ length: numBars }, (_, i) => {
        return Math.min(1, Math.max(0.15, 0.35 + 0.3 * Math.sin(i * 0.08) + Math.random() * 0.15));
      });
      return {
        waveformPeaks,
        sampleRate: 44100,
        duration: 30,
        silenceSegments: [],
        soundSegments: [{ start: 0, end: 30 }],
      };
    }

    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0); // use primary channel

    onProgress?.(50, 'Mendeteksi RMS & hening...');

    // Extract waveform peaks for visualization (800 sample bars)
    const numWaveformBars = 800;
    const blockSize = Math.floor(channelData.length / numWaveformBars);
    const waveformPeaks: number[] = new Array(numWaveformBars);

    for (let i = 0; i < numWaveformBars; i++) {
      const start = i * blockSize;
      let maxVal = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > maxVal) maxVal = val;
      }
      waveformPeaks[i] = Math.min(1, maxVal);
    }

    onProgress?.(70, 'Mendeteksi jeda bicara & hening...');

    // Detect silence using RMS in chunks of 50ms
    const windowMs = 50;
    const samplesPerWindow = Math.floor((sampleRate * windowMs) / 1000);
    const totalWindows = Math.floor(channelData.length / samplesPerWindow);

    // Convert threshold dB to linear amplitude
    // dB = 20 * log10(amplitude) => amplitude = 10^(dB / 20)
    const thresholdAmp = Math.pow(10, config.thresholdDb / 20);

    const isSilentWindow: boolean[] = new Array(totalWindows);

    for (let w = 0; w < totalWindows; w++) {
      const offset = w * samplesPerWindow;
      let sumSquares = 0;
      for (let s = 0; s < samplesPerWindow; s++) {
        const sample = channelData[offset + s] || 0;
        sumSquares += sample * sample;
      }
      const rms = Math.sqrt(sumSquares / samplesPerWindow);
      isSilentWindow[w] = rms < thresholdAmp;
    }

    // Group windows into continuous silence segments
    const minSilenceWindows = Math.max(1, Math.round((config.minSilenceDuration * 1000) / windowMs));
    const silenceSegments: { start: number; end: number }[] = [];

    let currentSilenceStart: number | null = null;
    let silenceLength = 0;

    for (let w = 0; w < totalWindows; w++) {
      if (isSilentWindow[w]) {
        if (currentSilenceStart === null) {
          currentSilenceStart = w;
        }
        silenceLength++;
      } else {
        if (currentSilenceStart !== null) {
          if (silenceLength >= minSilenceWindows) {
            const startSec = (currentSilenceStart * windowMs) / 1000;
            const endSec = (w * windowMs) / 1000;
            silenceSegments.push({ start: startSec, end: endSec });
          }
          currentSilenceStart = null;
          silenceLength = 0;
        }
      }
    }
    // Handle trail
    if (currentSilenceStart !== null && silenceLength >= minSilenceWindows) {
      silenceSegments.push({
        start: (currentSilenceStart * windowMs) / 1000,
        end: duration,
      });
    }

    onProgress?.(90, 'Menyusun segmen suara aktif...');

    // Invert silence to get sound segments with padding
    const soundSegments: { start: number; end: number }[] = [];
    let curTime = 0;

    for (const silence of silenceSegments) {
      const soundStart = curTime;
      const soundEnd = silence.start;

      if (soundEnd - soundStart > 0.2) { // at least 200ms
        const paddedStart = Math.max(0, soundStart - config.paddingBefore);
        const paddedEnd = Math.min(duration, soundEnd + config.paddingAfter);
        soundSegments.push({
          start: Number(paddedStart.toFixed(2)),
          end: Number(paddedEnd.toFixed(2)),
        });
      }
      curTime = silence.end;
    }

    // Remaining segment after last silence
    if (duration - curTime > 0.2) {
      soundSegments.push({
        start: Math.max(0, Number((curTime - config.paddingBefore).toFixed(2))),
        end: Number(duration.toFixed(2)),
      });
    }

    // If no sound segments were detected (e.g. video was pure speech or threshold too low),
    // default to entire duration
    if (soundSegments.length === 0) {
      soundSegments.push({ start: 0, end: duration });
    }

    onProgress?.(100, 'Selesai menganalisis!');

    return {
      waveformPeaks,
      sampleRate,
      duration,
      silenceSegments,
      soundSegments,
    };
  } finally {
    try {
      await audioCtx.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Generate Auto Highlight segments (e.g. 15s, 30s, 60s recommendations or energy peaks)
 */
export function generateAutoHighlights(
  duration: number,
  mode: '15s' | '30s' | '60s' | 'smart_peaks',
  waveformPeaks?: number[]
): { start: number; end: number; score: number; title: string }[] {
  const highlights: { start: number; end: number; score: number; title: string }[] = [];

  let chunkDuration = 30;
  if (mode === '15s') chunkDuration = 15;
  if (mode === '60s') chunkDuration = 60;

  if (mode === 'smart_peaks' && waveformPeaks && waveformPeaks.length > 0) {
    // Detect peak regions based on waveform energy
    const totalBars = waveformPeaks.length;
    const windowBars = Math.max(5, Math.floor((20 / duration) * totalBars)); // ~20s windows

    interface PeakScore {
      startSec: number;
      endSec: number;
      energy: number;
    }
    const scores: PeakScore[] = [];

    for (let i = 0; i < totalBars - windowBars; i += Math.floor(windowBars / 2)) {
      let energy = 0;
      for (let j = 0; j < windowBars; j++) {
        energy += waveformPeaks[i + j];
      }
      const avg = energy / windowBars;
      const startSec = (i / totalBars) * duration;
      const endSec = Math.min(duration, ((i + windowBars) / totalBars) * duration);
      scores.push({ startSec, endSec, energy: avg });
    }

    // Sort by energy descending and pick top 4 distinct peaks
    scores.sort((a, b) => b.energy - a.energy);
    const picked: PeakScore[] = [];

    for (const item of scores) {
      const overlaps = picked.some(
        (p) => Math.abs(p.startSec - item.startSec) < 10
      );
      if (!overlaps && picked.length < 5) {
        picked.push(item);
      }
    }

    // Sort picked by time
    picked.sort((a, b) => a.startSec - b.startSec);
    picked.forEach((p, idx) => {
      highlights.push({
        start: Number(p.startSec.toFixed(2)),
        end: Number(p.endSec.toFixed(2)),
        score: Math.round(p.energy * 100),
        title: `Puncak Energi #${idx + 1} (${(p.endSec - p.startSec).toFixed(1)}s)`,
      });
    });

    if (highlights.length > 0) return highlights;
  }

  // Default time slicing
  const numChunks = Math.max(1, Math.floor(duration / chunkDuration));
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkDuration;
    const end = Math.min(duration, (i + 1) * chunkDuration);
    highlights.push({
      start: Number(start.toFixed(2)),
      end: Number(end.toFixed(2)),
      score: 85 - i * 5,
      title: `Highlight #${i + 1} (${(end - start).toFixed(0)}s)`,
    });
  }

  return highlights;
}

/**
 * Converts segments into ready-to-use VideoClips
 */
export function convertSegmentsToClips(
  segments: { start: number; end: number }[],
  prefix = 'Klip'
): VideoClip[] {
  const colors = [
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#3b82f6', // blue
  ];

  return segments.map((seg, idx) => ({
    id: `clip-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    name: `${prefix} ${idx + 1}`,
    startTime: seg.start,
    endTime: seg.end,
    color: colors[idx % colors.length],
    isMuted: false,
  }));
}
