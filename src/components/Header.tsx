import React from 'react';
import {
  Scissors,
  Sparkles,
  Download,
  Keyboard,
  FileCode,
  CheckCircle2,
  Flame,
  Layers,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { downloadSingleFileHtml } from '../utils/singleFileGenerator';

interface HeaderProps {
  projectName: string;
  clipCount?: number;
  onOpenShortcuts: () => void;
  onLoadDemoVideo: () => void;
  onOpenExport: () => void;
  isLoadingDemo: boolean;
  onOpenCropResults?: () => void;
  onOpenViral?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  clipCount = 0,
  onOpenShortcuts,
  onLoadDemoVideo,
  onOpenExport,
  isLoadingDemo,
  onOpenCropResults,
  onOpenViral,
}) => {
  const [downloadSuccess, setDownloadSuccess] = React.useState(false);
  const [showToolsMenu, setShowToolsMenu] = React.useState(false);

  const handleDownloadStandalone = () => {
    downloadSingleFileHtml();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
    setShowToolsMenu(false);
  };

  return (
    <header className="h-16 border-b border-white/10 px-3 sm:px-5 flex items-center justify-between z-30 shrink-0 bg-[#07070c]/95 backdrop-blur-xl">
      {/* Brand Zone */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 p-[1.5px] shadow-lg shadow-amber-500/10 shrink-0">
          <div className="w-full h-full bg-[#120d08] rounded-[10px] flex items-center justify-center">
            <Scissors className="w-4 h-4 text-amber-400 -rotate-45" />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="font-heading font-extrabold text-sm sm:text-base tracking-tight text-white">
              ClipRush Pro
            </h1>
            <span className="text-[9px] font-bold font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#261807] text-amber-300 border border-amber-500/40 shrink-0">
              AUTO-CLIPPER
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-xs font-mono">
            {projectName || 'Studio Editor'}
          </div>
        </div>
      </div>

      {/* Center / Action Zone */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Prominent Shortcut to Hasil Crop Viral (Matches Screenshot Center Pill) */}
        {onOpenCropResults && (
          <button
            onClick={onOpenCropResults}
            className="px-3 sm:px-4 py-1.5 rounded-2xl text-xs font-bold bg-[#1d1609] hover:bg-[#281e0d] border border-amber-500/50 text-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/15 active:scale-95"
            title="Lihat hasil potongan video viral & pratinjau sebelum download"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Hasil Crop Viral</span>
            <span className="xs:hidden">Hasil</span>
            {clipCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-mono font-extrabold flex items-center justify-center shadow-sm">
                {clipCount}
              </span>
            )}
          </button>
        )}

        {/* Load Demo Clip */}
        <button
          onClick={onLoadDemoVideo}
          disabled={isLoadingDemo}
          className="hidden md:flex px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all items-center gap-1.5 cursor-pointer disabled:opacity-50"
          title="Muat video contoh langsung ke editor"
        >
          <Sparkles className={`w-3.5 h-3.5 text-cyan-300 ${isLoadingDemo ? 'animate-spin' : ''}`} />
          <span>{isLoadingDemo ? 'Memuat...' : 'Coba Demo'}</span>
        </button>

        {/* Export Studio Main CTA (Matches Screenshot Right Violet Pill) */}
        <button
          onClick={onOpenExport}
          className="px-3.5 sm:px-4 py-1.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          title="Buka Studio Export Video"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Studio</span>
        </button>

        {/* Secondary Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowToolsMenu(!showToolsMenu)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer transition"
            title="Menu Alat Lainnya"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showToolsMenu && (
            <div className="absolute right-0 mt-2 w-52 glass-panel rounded-2xl border border-white/10 shadow-2xl p-2 z-50 bg-[#0d0d14]/95 backdrop-blur-xl space-y-1">
              <button
                onClick={() => {
                  onLoadDemoVideo();
                  setShowToolsMenu(false);
                }}
                disabled={isLoadingDemo}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Muat Video Demo</span>
              </button>

              <button
                onClick={() => {
                  onOpenShortcuts();
                  setShowToolsMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Shortcut Keyboard</span>
              </button>

              <button
                onClick={handleDownloadStandalone}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-left text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer border-t border-white/5 pt-2"
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simpan File .HTML Offline</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
