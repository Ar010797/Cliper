import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileVideo,
  Sparkles,
  Play,
  Video,
  Camera,
  CheckCircle2,
  Film,
  Zap,
  Info,
  Clock,
  Layers,
  StopCircle,
} from 'lucide-react';
import { VERIFIED_PRESET_VIDEOS, VerifiedPresetVideo } from '../utils/cobaltApi';

interface IntakePanelProps {
  onVideoLoaded: (file: File | Blob, name: string) => void;
  cobaltEndpoint: string;
  cobaltApiKey?: string;
  onOpenSettings: () => void;
  onLoadDemoVideo: () => void;
  isLoadingDemo: boolean;
}

export const IntakePanel: React.FC<IntakePanelProps> = ({
  onVideoLoaded,
  onLoadDemoVideo,
  isLoadingDemo,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'samples' | 'record'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [readProgress, setReadProgress] = useState<number | null>(null);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveVideoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Handle local file input
  const handleFileSelected = (file: File) => {
    if (!file) return;
    setReadProgress(10);
    const interval = setInterval(() => {
      setReadProgress((prev) => {
        if (!prev || prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 70);

    setTimeout(() => {
      clearInterval(interval);
      setReadProgress(100);
      setTimeout(() => {
        setReadProgress(null);
        onVideoLoaded(file, file.name);
      }, 200);
    }, 350);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Load verified preset sample video
  const handleLoadSample = async (preset: VerifiedPresetVideo) => {
    setLoadingPresetId(preset.id);
    setReadProgress(20);

    try {
      const response = await fetch(preset.url);
      if (!response.ok) {
        throw new Error(`Gagal mengunduh: status ${response.status}`);
      }
      setReadProgress(60);
      const blob = await response.blob();
      setReadProgress(100);

      setTimeout(() => {
        setReadProgress(null);
        onVideoLoaded(blob, `${preset.title}.mp4`);
      }, 150);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Gagal memuat preset lokal, beralih ke generator demo:', error);
      onLoadDemoVideo();
    } finally {
      setLoadingPresetId(null);
      setReadProgress(null);
    }
  };

  // Start in-browser camera or screen recording
  const handleStartRecording = async (type: 'camera' | 'screen') => {
    try {
      recordedChunksRef.current = [];
      let stream: MediaStream;

      if (type === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }

      liveStreamRef.current = stream;
      if (liveVideoPreviewRef.current) {
        liveVideoPreviewRef.current.srcObject = stream;
        liveVideoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        if (liveVideoPreviewRef.current) {
          liveVideoPreviewRef.current.srcObject = null;
        }
        setIsRecording(false);
        setRecordingTime(0);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);

        onVideoLoaded(recordedBlob, `Rekaman_${new Date().toISOString().slice(0, 10)}.webm`);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Tidak dapat mengakses rekaman: ${error.message}`);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
        <button
          onClick={() => setActiveMode('upload')}
          className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMode === 'upload'
              ? 'bg-violet-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Pilih Video</span>
        </button>
        <button
          onClick={() => setActiveMode('samples')}
          className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMode === 'samples'
              ? 'bg-violet-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Video Siap Pakai</span>
        </button>
        <button
          onClick={() => setActiveMode('record')}
          className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeMode === 'record'
              ? 'bg-violet-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-rose-400" />
          <span>Rekam Langsung</span>
        </button>
      </div>

      {/* Progress Bar when loading video */}
      {readProgress !== null && (
        <div className="glass-card rounded-2xl p-4 border border-violet-500/30 bg-violet-950/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-violet-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Memproses & Memuat File Video...</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold">{readProgress}%</span>
          </div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-200"
              style={{ width: `${readProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mode 1: Direct File Upload */}
      {activeMode === 'upload' && (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 ${
              isDragging
                ? 'border-violet-500 bg-violet-500/10 scale-[0.99]'
                : 'border-white/15 hover:border-violet-500/40 bg-black/30 hover:bg-black/40'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-purple-500/10">
              <FileVideo className="w-8 h-8" />
            </div>

            <h3 className="font-heading font-bold text-base text-white mb-1.5">
              Tarik & Lepas File Video ke Sini
            </h3>
            <p className="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed">
              Langsung dari perangkat Anda. Video akan otomatis dipotong pada momen viral & disiapkan di menu "Hasil Crop" lengkap dengan tegline!
            </p>

            <label className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition cursor-pointer active:scale-95 flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              <span>Pilih Video dari Komputer / HP</span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelected(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>

            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privasi Aman: Video diproses lokal di browser dengan audio waveform presisi</span>
            </div>
          </div>

          {/* Quick Demo Video Button */}
          <div className="glass-card rounded-2xl p-4 border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-violet-950/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Belum punya video di perangkat?</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Gunakan video sampel interaktif dengan audio & jeda hening siap uji.
              </div>
            </div>
            <button
              onClick={onLoadDemoVideo}
              disabled={isLoadingDemo}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-300" />
              <span>Muat Demo</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Ready-to-use Sample Videos */}
      {activeMode === 'samples' && (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
            💡 <strong className="text-white">Video Terverifikasi:</strong> Pilih video contoh di bawah untuk langsung mencoba pemotong hening, deteksi momen viral, dan penambahan tegline otomatis tanpa download manual.
          </div>

          <div className="space-y-2.5">
            {VERIFIED_PRESET_VIDEOS.map((preset) => {
              const isLoading = loadingPresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  className="glass-card rounded-2xl p-3.5 border border-white/10 hover:border-violet-500/40 transition flex items-center justify-between gap-3 bg-[#0e0e18]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                      <Film className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{preset.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{preset.desc}</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                        Format: {preset.category.toUpperCase()} • HD 720p
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLoadSample(preset)}
                    disabled={isLoading}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Memuat...' : 'Pakai'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 3: In-Browser Live Recording */}
      {activeMode === 'record' && (
        <div className="flex flex-col gap-3">
          <div className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Rekam Kamera & Layar
                </h4>
              </div>
              {isRecording && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>{formatTimer(recordingTime)}</span>
                </span>
              )}
            </div>

            {/* Video preview container if recording */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
              <video
                ref={liveVideoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!isRecording && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                  <Video className="w-8 h-8 text-slate-600" />
                  <span className="text-xs">
                    Klik tombol di bawah untuk mulai merekam dari kamera atau layar komputer
                  </span>
                </div>
              )}
            </div>

            {/* Record buttons */}
            {!isRecording ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStartRecording('camera')}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  <Camera className="w-4 h-4" />
                  <span>Rekam Kamera & Suara</span>
                </button>

                <button
                  onClick={() => handleStartRecording('screen')}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20"
                >
                  <Video className="w-4 h-4" />
                  <span>Rekam Layar (Screen)</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleStopRecording}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                <StopCircle className="w-5 h-5" />
                <span>Selesai Merekam & Muat ke Studio</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
