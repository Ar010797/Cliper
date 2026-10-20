import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Share2,
  X,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { shareVideoFile, canShareFiles, formatFileSize, isMedianEnvironment } from '../utils/downloadHelper';

interface DownloadSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoBlob: Blob | null;
  videoUrl: string;
  filename: string;
  httpUrl?: string;
}

export const DownloadSuccessModal: React.FC<DownloadSuccessModalProps> = ({
  isOpen,
  onClose,
  videoBlob,
  videoUrl,
  filename,
  httpUrl,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const isMedian = isMedianEnvironment();
  const canShare = canShareFiles();

  if (!isOpen || (!videoBlob && !videoUrl)) return null;

  const fileSize = videoBlob ? formatFileSize(videoBlob.size) : '';

  const handleShare = async () => {
    if (!videoBlob) return;
    setIsSharing(true);
    try {
      await shareVideoFile(videoBlob, filename);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = () => {
    const linkToCopy = httpUrl || videoUrl;
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      });
    }
  };

  const handleDirectDownloadAgain = () => {
    const downloadTarget = httpUrl || videoUrl;
    if (downloadTarget) {
      const a = document.createElement('a');
      a.href = downloadTarget;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md overflow-hidden animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-[#0c0c14]/98 flex flex-col">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-bold text-sm sm:text-base text-white">
                  Video Berhasil Disimpan!
                </h3>
                {isMedian && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    <span>Mode Aplikasi Median</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                File siap tersimpan di perangkat Anda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Video Preview Player */}
          <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-[9/16] max-h-64 mx-auto flex items-center justify-center shadow-xl">
            <video
              src={videoUrl}
              playsInline
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
            />
          </div>

          {/* File Meta Information */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Nama File:</span>
              <span className="font-bold text-white font-mono truncate max-w-[240px]">
                {filename}
              </span>
            </div>
            {fileSize && (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Ukuran File:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {fileSize}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Status Keamanan:</span>
              <span className="font-bold text-blue-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anti-Copyright FB Siap</span>
              </span>
            </div>
          </div>

          {/* Median / Android Download Notification Notice */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Lokasi Penyimpanan File:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              File otomatis dikirim ke <strong>Download Manager HP</strong> Anda (Folder <code className="text-amber-300">Download</code> atau <code className="text-amber-300">Unduhan</code>). Jika belum muncul di galeri, gunakan tombol <strong>Simpan ke Galeri / Bagikan</strong> di bawah.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* 1. Share / Save to Gallery Button (Native Android/iOS Share Sheet) */}
            {canShare && (
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>{isSharing ? 'Membuka...' : 'Simpan ke Galeri / Bagikan File (Native Share)'}</span>
              </button>
            )}

            {/* 2. Direct HTTP Download Trigger */}
            <button
              type="button"
              onClick={handleDirectDownloadAgain}
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-400/40 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Download className="w-4 h-4 text-cyan-300" />
              <span>Unduh Ulang File (HTTP Download Langsung)</span>
            </button>

            {/* 3. Copy Link / External URL option if available */}
            {httpUrl && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer transition"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin!' : 'Salin Link Unduhan'}</span>
                </button>

                <a
                  href={httpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Browser</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
